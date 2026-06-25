/**
 * MarkupParser — 装饰标记解析器
 *
 * 解析文本中的装饰标记 (【】《〉 （） ｛｝ ＜＞ ［］)，生成 Decoration IR。
 * 对应原版 vrain.pl 中的装饰标记处理逻辑 (main loop lines 553-936)。
 *
 * 标记符:
 *   【text】 — 夹批 (Commentary)              — 由 text-parser.ts 处理
 *   《text》 — 书名号线 (Wavy Line)
 *   〔text〕 — 圆角框 (Rect Frame)
 *   〈text〉 — 圆圈 (Circle Frame)
 *   （text） — 字体放大 (Text Zoom)           — 影响字符 scale 属性
 *   ｛text｝  — 圈注 (Circle Note)
 *   ＜text＞ — 顿点注 (Point Note)
 *   ［text］ — 行注 (Line Note)
 *
 * 控制标记:
 *   % — 强制换页 (PageBreak)
 *   $ — 半页跳 (HalfPage)
 *   & — 末列跳 (LastColumn)
 *   ^ — 多栏跳 (NextColumn, 仅多栏模式)
 *   T — 前进一行 (AdvanceRow, 段落缩进)
 */

import type { BookConfig, CommentaryEntry, Character, Decoration, ControlMark, Position, Page } from "../types/layout";

// ============================================================================
// 装饰范围 (中间表示 — 在字符定位后解析为 Decoration[])
// ============================================================================

/** 装饰范围 — 标记一对装饰符包裹的字符区间 */
export interface DecorationRange {
  type: Decoration["type"];
  /** 装饰标记包裹的正文起始字符索引 (在预处理后的字符流中) */
  startCharIndex: number;
  /** 装饰标记包裹的正文结束字符索引 (exclusive) */
  endCharIndex: number;
  strokeWidth: number;
  color: string;
  /** 填充色 (圆角框、圆圈等支持填色) */
  fillColor?: string;
  // 圈注/点注/行注 — 原始配置值 (比例，需在 resolveDecorationRanges 中 × fontSize 转像素)
  offsetX?: number;
  offsetY?: number;
  radius?: number;   // 圈注圆半径比例
  size?: number;     // 顿点注大小比例
  lineWidth?: number; // 行注线高比例
}

/** 字体放大区间 — （）包裹的字符需缩放渲染 */
export interface TextZoomRange {
  /** 在净化后文本中的起始字符索引 */
  startCharIndex: number;
  /** 在净化后文本中的结束字符索引 (exclusive) */
  endCharIndex: number;
  /** 缩放因子 (如 1.5 = 放大 50%) */
  zoomFactor: number;
  /** 放大文字颜色 (默认红色以醒目) */
  color?: string;
}

/** 解析结果 */
export interface ParseResult {
  /** 正文字符序列 (不含标记符本身) */
  characters: string[];
  /** 批注条目 */
  commentaryData: CommentaryEntry[];
  /** 控制标记 */
  controlMarks: { type: ControlMark["type"]; index: number }[];
  /** 装饰标记 */
  decorations: Decoration[];
  /** 标记起始索引的映射: decoration 索引 → 起始字符索引 */
  decorationIndexMap: number[];
}

// ============================================================================
// 装饰提取 — 从原始文本中剥离装饰标记符，记录区间
// ============================================================================

/**
 * 从文本中提取装饰标记范围，返回净化后的文本和装饰区间
 *
 * 注意：此函数在 preprocessLine() 之前或之后调用，
 * 假设夹批 【】 已被 text-parser.ts 提前移除。
 */
export function extractDecorationRanges(
  text: string,
  config: BookConfig,
  /** 当前文本片段在整个字符流中的起始偏移 */
  baseOffset: number,
): { cleanText: string; ranges: DecorationRange[]; zoomRanges: TextZoomRange[] } {
  const ranges: DecorationRange[] = [];
  const zoomRanges: TextZoomRange[] = [];
  let cleanText = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // 书名号线 《text》
    if (ch === "《" && config.decorativeMarks.bookLine.enabled) {
      const endIdx = text.indexOf("》", i + 1);
      if (endIdx !== -1) {
        const startCleanIdx = cleanText.length; // 净化后文本中的起始位置
        cleanText += text.slice(i + 1, endIdx);  // 保留正文，去掉标记符
        const endCleanIdx = cleanText.length;
        ranges.push({
          type: "wavyLine",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: config.decorativeMarks.bookLine.width,
          color: config.decorativeMarks.bookLine.color,
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 圆角框 〔text〕
    if (ch === "〔" && config.decorativeMarks.rectFrame.enabled) {
      const endIdx = text.indexOf("〕", i + 1);
      if (endIdx !== -1) {
        const startCleanIdx = cleanText.length;
        cleanText += text.slice(i + 1, endIdx);
        const endCleanIdx = cleanText.length;
        ranges.push({
          type: "rectFrame",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: config.decorativeMarks.rectFrame.borderType === 0 ? 3 : 1,
          color: config.decorativeMarks.rectFrame.borderColor,
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 圆圈 〈text〉
    if (ch === "〈" && config.decorativeMarks.circleFrame.enabled) {
      const endIdx = text.indexOf("〉", i + 1);
      if (endIdx !== -1) {
        const startCleanIdx = cleanText.length;
        cleanText += text.slice(i + 1, endIdx);
        const endCleanIdx = cleanText.length;
        ranges.push({
          type: "circleFrame",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: config.decorativeMarks.circleFrame.borderType === 0 ? 3 : 1,
          color: config.decorativeMarks.circleFrame.borderColor,
          fillColor: config.decorativeMarks.circleFrame.fillColor,
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 字体放大 （text） — 记录区间供后续 scale 处理
    if (ch === "（" && config.decorativeMarks.textZoom.enabled) {
      const endIdx = text.indexOf("）", i + 1);
      if (endIdx !== -1) {
        const startCleanIdx = cleanText.length;
        cleanText += text.slice(i + 1, endIdx);
        const endCleanIdx = cleanText.length;
        zoomRanges.push({
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          zoomFactor: config.decorativeMarks.textZoom.zoomFactor,
          color: config.decorativeMarks.textZoom.color,
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 圈注 ｛text｝
    if (ch === "｛" && config.decorativeMarks.circleNote.enabled) {
      const endIdx = text.indexOf("｝", i + 1);
      if (endIdx !== -1) {
        const startCleanIdx = cleanText.length;
        cleanText += text.slice(i + 1, endIdx);
        const endCleanIdx = cleanText.length;
        const cm = config.decorativeMarks.circleNote;
        ranges.push({
          type: "circleNote",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: cm.width,
          color: cm.color,
          offsetX: cm.offset.x,
          offsetY: cm.offset.y,
          radius: cm.radius,
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 顿点注 ＜text＞
    if (ch === "＜" && config.decorativeMarks.pointNote.enabled) {
      const endIdx = text.indexOf("＞", i + 1);
      if (endIdx !== -1) {
        const startCleanIdx = cleanText.length;
        cleanText += text.slice(i + 1, endIdx);
        const endCleanIdx = cleanText.length;
        const pm = config.decorativeMarks.pointNote;
        ranges.push({
          type: "pointNote",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: 1,
          color: pm.color,
          offsetX: pm.offset.x,
          offsetY: pm.offset.y,
          size: pm.size,
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 行注 ［text］
    if (ch === "［" && config.decorativeMarks.lineNote.enabled) {
      const endIdx = text.indexOf("］", i + 1);
      if (endIdx !== -1) {
        const startCleanIdx = cleanText.length;
        cleanText += text.slice(i + 1, endIdx);
        const endCleanIdx = cleanText.length;
        const lm = config.decorativeMarks.lineNote;
        ranges.push({
          type: "lineNote",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: lm.width,
          color: lm.color,
          offsetX: lm.offset.x,
          offsetY: lm.offset.y,
          lineWidth: 0.4, // 行注半高比例，在字高内不溢出
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 普通字符保留
    cleanText += ch;
    i++;
  }

  return { cleanText, ranges, zoomRanges };
}

// ============================================================================
// 装饰范围 → Decoration[] 转换（字符定位后调用）
// ============================================================================

/**
 * 将 DecorationRange[] 解析为带像素坐标的 Decoration[]
 *
 * 在 paginate() 完成字符定位后调用，根据 Page[] 中字符的 x/y 坐标
 * 计算每个装饰范围的包围盒 (bounds)。
 */
export function resolveDecorationRanges(
  pages: Page[],
  ranges: DecorationRange[],
  config: BookConfig,
): Decoration[] {
  if (ranges.length === 0) return [];

  const result: Decoration[] = [];
  const fontSize = config.fonts[0]?.textPointSize ?? 60;
  const padding = fontSize * 0.45; // 包围盒边距跟随字号缩放

  // 构建全局字符索引 → { pageIndex, charIndex } 的映射
  let totalChars = 0;
  const charMap: { pageIndex: number; charIndex: number }[] = [];

  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    for (let ci = 0; ci < page.characters.length; ci++) {
      charMap[totalChars] = { pageIndex: pi, charIndex: ci };
      totalChars++;
    }
  }

  if (totalChars === 0) return [];

  for (const range of ranges) {
    // 裁剪到实际字符范围内
    const start = Math.max(0, range.startCharIndex);
    const end = Math.min(totalChars, range.endCharIndex);
    if (start >= end) continue;

    // 收集范围内的所有字符坐标，同时记录所属页面
    const positions: Position[] = [];
    let decorationPageIndex = 0;
    for (let gci = start; gci < end; gci++) {
      const entry = charMap[gci];
      if (!entry) continue;
      if (gci === start) decorationPageIndex = entry.pageIndex;
      const ch = pages[entry.pageIndex].characters[entry.charIndex];
      positions.push({ x: ch.x, y: ch.y });
    }

    if (positions.length === 0) continue;

    // 按 x 坐标分组（同列字符归一组），每组独立生成一个 Decoration
    // 解决装饰标记跨列时包围盒覆盖整列高度的问题
    const columnGroups: Map<number, Position[]> = new Map();
    for (const p of positions) {
      const colKey = Math.round(p.x / 10) * 10; // 10px 粒度区分列
      if (!columnGroups.has(colKey)) columnGroups.set(colKey, []);
      columnGroups.get(colKey)!.push(p);
    }

    for (const [, group] of columnGroups) {
      // 组内按 y 排序
      group.sort((a, b) => a.y - b.y);

      // 计算该列的包围盒
      const minX = Math.min(...group.map((p) => p.x)) - padding;
      const maxX = Math.max(...group.map((p) => p.x)) + padding;
      const minY = group[0].y - padding;
      const maxY = group[group.length - 1].y + padding;

      result.push({
        type: range.type,
        bounds: { x1: minX, y1: minY, x2: maxX, y2: maxY },
        strokeWidth: range.strokeWidth,
        color: range.color,
        fillColor: range.fillColor,
        charPositions: group,
        pageIndex: decorationPageIndex,
        // 圈注/顿点注/行注 — 比例值 × fontSize → 像素值
        noteOffsetX: range.offsetX != null ? range.offsetX * fontSize : undefined,
        noteOffsetY: range.offsetY != null ? range.offsetY * fontSize : undefined,
        noteRadius: range.radius != null ? range.radius * fontSize : undefined,
        noteSize: range.size != null ? range.size * fontSize : undefined,
        noteHeight: range.lineWidth != null ? range.lineWidth * fontSize : undefined,
      });
    }
  }

  return result;
}

/**
 * 将装饰按页面分配（每个装饰分配到其所在的页面）
 * 用于将 resolveDecorationRanges 的结果填入各 Page.decorations
 */
export function assignDecorationsToPages(
  pages: Page[],
  decorations: Decoration[],
  _ranges: DecorationRange[],
): Page[] {
  if (decorations.length === 0) return pages;

  const pageDecorations: Decoration[][] = pages.map(() => []);

  for (const dec of decorations) {
    const pi = dec.pageIndex ?? 0;
    if (pi < pageDecorations.length) {
      pageDecorations[pi].push(dec);
    }
  }

  // 写入页面
  return pages.map((page, idx) => ({
    ...page,
    decorations: [...(page.decorations || []), ...pageDecorations[idx]],
  }));
}
