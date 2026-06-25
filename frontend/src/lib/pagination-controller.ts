/**
 * 分页控制器 — 将原 vrain.pl 中的分页控制逻辑移植为 TypeScript
 *
 * 原代码: vrain.pl main loop (lines 553-936), pagination logic at RCHARS label
 *
 * 核心功能:
 *   1. 字符位置计数器
 *   2. 分页标记处理: % (换页), $ (半页跳), & (末列跳), T (前进一行), ^ (多栏跳)
 *   3. 跨页批注缓冲
 *   4. 页尾检查 (非占位标点保留在当前页)
 */

import type { BookConfig, CanvasConfig, Page, Character, Commentary, ControlMark, Decoration, CommentaryEntry, ControlMarkWithIndex, Position } from "../types/layout";

/**
 * 分页结果 — 将字符流分配到页面
 */
export interface PaginatedResult {
  pages: Page[];
  controlMarks: ControlMarkWithIndex[];
  /** allChars 索引 → 展平的 Page.characters 数组中的索引 (-1 = 控制标记未入页) */
  charIndexMap: number[];
  /** 每个 allChars 位置产生的批注字符数 (0 = 无批注, N = 批注字符数) */
  commentaryFlatCount: number[];
}

// ControlMarkWithIndex now imported from types/layout

/**
 * 分页标记枚举
 */
type PaginationMarker = "pageBreak" | "halfPage" | "lastColumn" | "nextColumn" | "advanceRow";

/**
 * 执行分页: 将字符数组按页面网格分配
 */
export function paginate(
  canvas: CanvasConfig,
  config: BookConfig,
  grid: Grid,
  characters: string[],
  commentaryData: (CommentaryEntry | null)[],
  decorations: Decoration[],
  textPositions: Position[] = [],
  commentPositions: Position[] = [],
  zoomByIndex: Record<number, { zoomFactor: number; color?: string }> = {}
): PaginatedResult {
  const { colNum, rowNum, pageCharsNum } = grid;
  const pages: Page[] = [];
  const controlMarks: ControlMarkWithIndex[] = [];

  // charIndexMap: allChars 索引 → 展平后的页面字符索引
  const charIndexMap: number[] = new Array(characters.length).fill(-1);
  const commentaryFlatCount: number[] = new Array(characters.length).fill(0);
  let flatIdx = 0; // 已推入页面的字符累计计数
  let cmBlockId = 0; // 批注块 ID，同一【】的字符共享

  // 初始化第一页
  let currentPage: Page = createNewPage(1, canvas);

  let pcnt = 0; // 当前位置计数器
  let charIndex = 0; // 当前字符索引
  let commentBuffer: CommentaryEntry[] = []; // 跨页批注缓冲

  // 跨列夹批状态 — 当前列放不下时缓存剩余行，在下个循环迭代中从新列顶部继续
  let pendingCM: {
    rightCol: string[];
    leftCol: string[];
    cmFontSize: number;
    cmColor: string;
    cmBg: string | undefined;
    cmBlockId: number;
    rowOffset: number;      // 已渲染的行数
    totalCharCount: number;  // 累计总字符数 (所有批次)
  } | null = null;

  while (charIndex < characters.length) {
    // ---- 优先消费未完成的跨列夹批 ----
    if (pendingCM) {
      const { rightCol, leftCol, cmFontSize, cmColor, cmBg, cmBlockId, rowOffset } = pendingCM;
      const remainingRight = rightCol.slice(rowOffset);
      const remainingLeft = leftCol.slice(rowOffset);
      const cmSpacing = cmFontSize * 1.35;

      // 计算当前列剩余空间能放几行夹批
      // startY 是当前格子中心，所以第一行只有半格的空间
      const rowsInCol = grid.rowNum - (pcnt % grid.rowNum);
      const effectiveRemainingPixels = (rowsInCol - 0.5) * grid.rowHeight;
      // 连一行都放不下时，直接推进到下列
      if (effectiveRemainingPixels < cmSpacing && rowsInCol > 0) {
        const nextColStart = (Math.floor(pcnt / grid.rowNum) + 1) * grid.rowNum;
        if (nextColStart >= pageCharsNum) {
          pages.push({ ...currentPage });
          currentPage = createNewPage(pages.length + 1, canvas);
          pcnt = 0;
        } else {
          pcnt = nextColStart;
        }
        continue;
      }
      const rowsFit = Math.min(
        remainingRight.length,
        Math.floor(effectiveRemainingPixels / cmSpacing),
      );

      const startY = textPositions.length > 0 && pcnt < textPositions.length
        ? textPositions[Math.min(pcnt, textPositions.length - 1)]?.y ?? 0 : 0;

      const consumedGridRows = Math.max(1, Math.ceil(rowsFit * cmSpacing / grid.rowHeight));
      let batchCharCount = 0;

      for (let row = 0; row < rowsFit; row++) {
        const rowY = startY + row * cmSpacing;
        const colIdx = Math.min(pcnt + Math.floor(row * cmSpacing / grid.rowHeight), textPositions.length - 1);
        const colPos = colIdx >= 0 ? textPositions[colIdx] : { x: 0, y: 0 };
        const rightColX = colPos.x + grid.colWidth * 0.22;
        const leftColX = colPos.x - grid.colWidth * 0.22;

        // 右列
        currentPage.characters.push({
          x: rightColX, y: rowY, char: remainingRight[row],
          fontFamily: config.commentFontFamily || "serif",
          fontSize: cmFontSize, scale: 1, rotation: 0,
          color: cmColor, backgroundColor: cmBg,
          isCommentary: true, cmBlockId: cmBlockId,
        });
        batchCharCount++;
        flatIdx++;

        // 左列
        if (row < remainingLeft.length) {
          currentPage.characters.push({
            x: leftColX, y: rowY, char: remainingLeft[row],
            fontFamily: config.commentFontFamily || "serif",
            fontSize: cmFontSize, scale: 1, rotation: 0,
            color: cmColor, backgroundColor: cmBg,
            isCommentary: true, cmBlockId: cmBlockId,
          });
          batchCharCount++;
          flatIdx++;
        }
      }

      const newOffset = rowOffset + rowsFit;
      pendingCM.totalCharCount += batchCharCount;
      pcnt += consumedGridRows;

      if (newOffset >= rightCol.length) {
        // 全部完成，记录总字符数
        commentaryFlatCount[charIndex] = pendingCM.totalCharCount;
        pendingCM = null;
      } else {
        pendingCM = { ...pendingCM, rowOffset: newOffset };
      }

      // 批次渲染后检查是否溢出当前页
      if (pcnt >= pageCharsNum) {
        pages.push({ ...currentPage });
        currentPage = createNewPage(pages.length + 1, canvas);
        pcnt = 0;
      }

      continue; // 不推进 charIndex，正文字符等夹批全部完成后再渲染
    }

    const ch = characters[charIndex];

    // 检查分页标记
    if (isPaginationMarker(ch)) {
      controlMarks.push({ type: getMarkerType(ch), index: charIndex });

      switch (getMarkerType(ch)) {
        case "pageBreak":
          // % 强制换页
          pages.push({ ...currentPage });
          currentPage = createNewPage(pages.length + 1, canvas);
          pcnt = 0;
          charIndex++;
          continue;

        case "halfPage":
          // $ 半页跳
          if (pcnt < pageCharsNum / 2) {
            pcnt = Math.ceil(pageCharsNum / 2);
          }
          // 如果已经在半页或以上, 跳到满页
          charIndex++;
          continue;

        case "lastColumn":
          // & 末列跳
          if (pcnt <= pageCharsNum - rowNum + 1) {
            pcnt = pageCharsNum - rowNum + 1;
          }
          charIndex++;
          continue;

        case "nextColumn":
          // ^ 多栏跳 (仅多栏模式)
          if (canvas.multiRows.enabled && pcnt % rowNum !== 0) {
            // 跳到下一个栏块
            pcnt = Math.ceil(pcnt / rowNum) * rowNum;
          }
          charIndex++;
          continue;

        case "advanceRow":
          // T 前进一行
          pcnt++;
          charIndex++;
          continue;
      }
    }

    // 检查页满
    if (pcnt >= pageCharsNum) {
      // 页尾检查: 非占位标点留在当前页
      const remaining = characters.slice(charIndex);
      const isNonPositionPunctuation = isNonPositionPunct(ch, config.noPositionPunctuation);

      if (isNonPositionPunctuation) {
        // 保留在当前页 — 使用最后一个有效位置（避免 pcnt 越界导致 x=0,y=0 堆叠）
        const charData = characters[charIndex];
        const lastValidIdx = Math.min(pcnt, textPositions.length - 1);
        const pos = lastValidIdx >= 0 ? textPositions[lastValidIdx] : { x: 0, y: 0 };
        currentPage.characters.push({
          x: pos.x,
          y: pos.y,
          char: charData,
          fontFamily: config.textFontFamily || "serif",
          fontSize: config.fonts[0]?.textPointSize ?? 60,
          scale: 1,
          rotation: 0,
          color: config.textFontColor,
          isCommentary: false,
        });
        charIndexMap[charIndex] = flatIdx++;
        charIndex++;
        continue;
      }

      // 推到新页
      pages.push({ ...currentPage });
      currentPage = createNewPage(pages.length + 1, canvas);
      pcnt = 0;
    }

    // 处理批注数据 — 流式：当前列能放几行就放几行，剩余跨列延续
    const commentForIndex = commentaryData[charIndex];
    if (config.decorativeMarks.commentary?.enabled !== false && commentForIndex != null && commentForIndex.isCommentary && commentForIndex.char && charIndexMap[charIndex] === -1) {
      const cmChars = [...commentForIndex.char];
      const cmFontSize = config.fonts[0]?.commentPointSize ?? 30;
      const cmColor = config.decorativeMarks.commentary?.color || config.commentFontColor;
      const cmBg = config.decorativeMarks.commentary?.backgroundColor;
      const curBlockId = ++cmBlockId;
      // 先分两列：右列取前半（多一字），左列取后半
      const half = Math.ceil(cmChars.length / 2);
      const rightCol = cmChars.slice(0, half);
      const leftCol = cmChars.slice(half);

      // 设置待处理夹批，由 while 循环顶部的 pendingCM 消费块逐批渲染
      pendingCM = {
        rightCol, leftCol, cmFontSize, cmColor, cmBg, cmBlockId: curBlockId,
        rowOffset: 0,
        totalCharCount: 0,
      };
      charIndexMap[charIndex] = 0; // 标记非跳过
      continue; // 跳回循环顶部，由 pending 消费块处理第一批
    }

    // 普通字符 — 无论同位置是否有批注，正文都要渲染
    {
      const fontSize = config.fonts[0]?.textPointSize ?? 60;
      const lastValidIdx = Math.min(pcnt, textPositions.length - 1);
      const pos = lastValidIdx >= 0 ? textPositions[lastValidIdx] : { x: 0, y: 0 };
      const zoomInfo = zoomByIndex[charIndex];

      currentPage.characters.push({
        x: pos.x,
        y: pos.y,
        char: ch,
        fontFamily: config.textFontFamily || "serif",
        fontSize,
        scale: zoomInfo?.zoomFactor || 1,
        rotation: 0,
        color: zoomInfo?.color || config.textFontColor,
        isCommentary: false,
      });
      charIndexMap[charIndex] = flatIdx++;
      pcnt++;
    }

    charIndex++;
  }

  // 添加最后一页
  if (currentPage.characters.length > 0 || currentPage.commentaries.length > 0) {
    pages.push(currentPage);
  }

  return { pages, controlMarks, charIndexMap, commentaryFlatCount };
}

/** 网格信息 */
export interface Grid {
  colNum: number;
  rowNum: number;
  pageCharsNum: number;
  multirowsNum: number;
  rowHeight: number;
  colWidth: number;
}

// CommentaryEntry 已在 types/layout.ts 中定义，此处不重复导出

/** 创建新页面 */
function createNewPage(pageNum: number, canvas?: CanvasConfig): Page {
  return {
    pageNumber: pageNum,
    canvas: canvas ?? getDefaultCanvas(),
    title: "",
    characters: [],
    commentaries: [],
    decorations: [],
    marks: [],
    outlineTitle: undefined,
    outlinePage: undefined,
    fileIndex: 0,
  };
}

/** 兜底默认画布（当 canvas 未传入时使用） */
function getDefaultCanvas(): CanvasConfig {
  return {
    width: 2480,
    height: 1860,
    color: "white",
    margins: { top: 200, bottom: 50, left: 50, right: 50 },
    leafCol: 24,
    leafCenterWidth: 120,
    multiRows: { enabled: false, num: 1, lineWidth: 0, separatorColor: "#f5f5f5" },
    outerBorder: { width: 10, color: "black", hMargin: 5, vMargin: 5 },
    innerBorder: { width: 1, color: "black" },
    fishTail: {
      top: { y: 450, color: "black", rectHeight: 50, triHeight: 30, lineWidth: 15 },
      bottom: { y: 1550, color: "black", rectHeight: 50, triHeight: 30, lineWidth: 15, direction: 1 },
      style: "triangle",
      decorativeLines: { color: "black", width: 1, margin: 5 },
    },
    logoY: 1680,
    logoColor: "white",
    logoFont: "qiji-combo.ttf",
    logoFontSize: 40,
  };
}

/** 判断是否为分页标记 */
function isPaginationMarker(ch: string): boolean {
  return "%$&^T".includes(ch);
}

/** 获取分页标记类型 */
function getMarkerType(ch: string): ControlMark["type"] {
  switch (ch) {
    case "%": return "pageBreak";
    case "$": return "halfPage";
    case "&": return "lastColumn";
    case "^": return "nextColumn";
    case "T": return "advanceRow";
    default: return "pageBreak";
  }
}

/** 判断是否为不占位标点 */
function isNonPositionPunct(ch: string, pattern: string): boolean {
  if (!pattern) return false;
  return pattern.includes(ch);
}
