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

  // 初始化第一页
  let currentPage: Page = createNewPage(1, canvas);

  let pcnt = 0; // 当前位置计数器
  let charIndex = 0; // 当前字符索引
  let commentBuffer: CommentaryEntry[] = []; // 跨页批注缓冲

  while (charIndex < characters.length) {
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

    // 处理批注数据 — 批注占正文网格位 (逐对推 Character, 推进 pcnt)
    const commentForIndex = commentaryData[charIndex];
    if (commentForIndex != null && commentForIndex.isCommentary && commentForIndex.char) {
      const cmChars = [...commentForIndex.char];
      const cmFontSize = config.fonts[0]?.commentPointSize ?? 30;
      // 先分两列：右列取前半（多一字），左列取后半
      const half = Math.ceil(cmChars.length / 2);
      const rightCol = cmChars.slice(0, half);
      const leftCol = cmChars.slice(half);
      let cmCharCount = 0;
      // 逐行配对，每行 2 字占一个网格位，x 在列内左右分布
      for (let row = 0; row < rightCol.length; row++) {
        // 检查换页
        if (pcnt >= pageCharsNum) {
          pages.push({ ...currentPage });
          currentPage = createNewPage(pages.length + 1, canvas);
          pcnt = 0;
        }
        const posIdx = Math.min(pcnt, textPositions.length - 1);
        const pos = posIdx >= 0 ? textPositions[posIdx] : { x: 0, y: 0 };
        // 右列 x 大（canvas 右），左列 x 小（canvas 左），从右往左阅读
        const rightColX = pos.x + grid.colWidth * 0.22;
        const leftColX = pos.x - grid.colWidth * 0.22;

        // 右列（先读）
        currentPage.characters.push({
          x: rightColX, y: pos.y, char: rightCol[row],
          fontFamily: config.commentFontFamily || "serif",
          fontSize: cmFontSize, scale: 1, rotation: 0,
          color: config.commentFontColor,
          isCommentary: true,
        });
        cmCharCount++;
        flatIdx++;

        // 左列（后读）
        if (row < leftCol.length) {
          currentPage.characters.push({
            x: leftColX, y: pos.y, char: leftCol[row],
            fontFamily: config.commentFontFamily || "serif",
            fontSize: cmFontSize, scale: 1, rotation: 0,
            color: config.commentFontColor,
            isCommentary: true,
          });
          cmCharCount++;
          flatIdx++;
        }
        // 标记此 allChars 位置产生了批注字符（非跳过）
        if (row === 0) charIndexMap[charIndex] = 0;
        pcnt++;
      }
      commentaryFlatCount[charIndex] = cmCharCount;
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
