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
): { cleanText: string; ranges: DecorationRange[] } {
  const ranges: DecorationRange[] = [];
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
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 字体放大 （text） — 不生成 Decoration，设置 zoom 标记给后续处理
    if (ch === "（" && config.decorativeMarks.textZoom.enabled) {
      const endIdx = text.indexOf("）", i + 1);
      if (endIdx !== -1) {
        // 保留正文，但由后续步骤处理缩放
        cleanText += text.slice(i + 1, endIdx);
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
        ranges.push({
          type: "circleNote",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: config.decorativeMarks.circleNote.width,
          color: config.decorativeMarks.circleNote.color,
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
        ranges.push({
          type: "pointNote",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: 1,
          color: config.decorativeMarks.pointNote.color,
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
        ranges.push({
          type: "lineNote",
          startCharIndex: baseOffset + startCleanIdx,
          endCharIndex: baseOffset + endCleanIdx,
          strokeWidth: config.decorativeMarks.lineNote.width,
          color: config.decorativeMarks.lineNote.color,
        });
        i = endIdx + 1;
        continue;
      }
    }

    // 普通字符保留
    cleanText += ch;
    i++;
  }

  return { cleanText, ranges };
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

    // 收集范围内的所有字符坐标
    const positions: Position[] = [];
    for (let gci = start; gci < end; gci++) {
      const entry = charMap[gci];
      if (!entry) continue;
      const ch = pages[entry.pageIndex].characters[entry.charIndex];
      positions.push({ x: ch.x, y: ch.y });
    }

    if (positions.length === 0) continue;

    // 计算包围盒
    const minX = Math.min(...positions.map((p) => p.x)) - 15;  // 左侧额外间距
    const maxX = Math.max(...positions.map((p) => p.x)) + 15;  // 右侧额外间距
    const minY = Math.min(...positions.map((p) => p.y)) - 15;  // 上方额外间距
    const maxY = Math.max(...positions.map((p) => p.y)) + 15;  // 下方额外间距

    result.push({
      type: range.type,
      bounds: { x1: minX, y1: minY, x2: maxX, y2: maxY },
      strokeWidth: range.strokeWidth,
      color: range.color,
      charPositions: positions,
    });
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
  ranges: DecorationRange[],
): Page[] {
  if (decorations.length === 0 || ranges.length === 0) return pages;

  // 构建全局字符索引 → pageIndex 的映射
  let totalChars = 0;
  const charToPage: number[] = [];
  for (let pi = 0; pi < pages.length; pi++) {
    for (let ci = 0; ci < pages[pi].characters.length; ci++) {
      charToPage[totalChars] = pi;
      totalChars++;
    }
  }

  if (totalChars === 0) return pages;

  // 为每个页面收集装饰
  const pageDecorations: Decoration[][] = pages.map(() => []);

  for (let ri = 0; ri < ranges.length; ri++) {
    const range = ranges[ri];
    const decoration = decorations[ri];
    if (!decoration) continue;

    const start = Math.max(0, range.startCharIndex);
    const end = Math.min(totalChars, range.endCharIndex);
    if (start >= end) continue;

    // 确定装饰所在的页面
    const startPage = charToPage[start] ?? 0;
    const endPage = charToPage[Math.min(end, totalChars - 1)] ?? pages.length - 1;

    // 跨页装饰——分配到起始页
    pageDecorations[startPage].push(decoration);
  }

  // 写入页面
  return pages.map((page, idx) => ({
    ...page,
    decorations: [...(page.decorations || []), ...pageDecorations[idx]],
  }));
}
