/**
 * MarkupParser — 装饰标记解析器
 *
 * 解析文本中的装饰标记 (【】《〉 （） ｛｝ ＜＞ ［］)，生成 Decoration IR。
 * 对应原版 vrain.pl 中的装饰标记处理逻辑 (main loop lines 553-936)。
 *
 * 标记符:
 *   【text】 — 夹批 (Commentary)
 *   《text》 — 书名号线 (Wavy Line)
 *   〔text〕 — 圆角框 (Rect Frame)
 *   〈text〉 — 圆圈 (Circle Frame)
 *   （text） — 字体放大 (Text Zoom)
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

import type { BookConfig, CommentaryEntry, Character, Decoration, ControlMark, Position } from "../types/layout";

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

/** 解析完整文本字符串，提取装饰标记和批注 */
export function parseMarkup(
  text: string,
  config: BookConfig,
  decorations: Decoration[],
  decorationIndexMap: number[],
  controlMarks: { type: ControlMark["type"]; index: number }[],
  commentaryData: CommentaryEntry[],
  characters: string[],
  startCharIndex: number,
): { characters: string[]; commentaryData: CommentaryEntry[]; controlMarks: { type: ControlMark["type"]; index: number }[]; decorations: Decoration[]; decorationIndexMap: number[] } {
  const result = { characters: [...characters], commentaryData: [...commentaryData], controlMarks: [...controlMarks], decorations: [...decorations], decorationIndexMap: [...decorationIndexMap] };
  let charIdx = 0;

  while (charIdx < text.length) {
    const ch = text[charIdx];
    const pos = startCharIndex + charIdx;

    // 控制标记
    if (ch === "%") {
      result.controlMarks.push({ type: "pageBreak", index: pos });
      charIdx++;
      continue;
    }
    if (ch === "$") {
      result.controlMarks.push({ type: "halfPage", index: pos });
      charIdx++;
      continue;
    }
    if (ch === "&") {
      result.controlMarks.push({ type: "lastColumn", index: pos });
      charIdx++;
      continue;
    }
    if (ch === "^") {
      result.controlMarks.push({ type: "nextColumn", index: pos });
      charIdx++;
      continue;
    }

    // 批注 【text】
    if (ch === "【") {
      const endIdx = text.indexOf("】", charIdx + 1);
      if (endIdx === -1) {
        // 未闭合: 跳过
        charIdx++;
        continue;
      }
      const commentText = text.substring(charIdx + 1, endIdx);
      // 批注字符插入正文位置
      const commentChars: CommentaryEntry[] = commentText.split("").map((c) => ({ char: c, isCommentary: true }));
      result.commentaryData.push(...commentChars);
      // 在正文中插入占位符
      result.characters.splice(pos, 0, "◆"); // 占位
      charIdx = endIdx + 1;
      continue;
    }

    // 书名号线 《text》
    if (ch === "《" && config.decorativeMarks.bookLine.enabled) {
      const endIdx = text.indexOf("》", charIdx + 1);
      if (endIdx === -1) {
        charIdx++;
        continue;
      }
      const titleText = text.substring(charIdx + 1, endIdx);
      // 跳过正文中的这些字符
      charIdx = endIdx + 1;
      continue;
    }

    // 圆角框 〔text〕
    if (ch === "〔" && config.decorativeMarks.rectFrame.enabled) {
      const endIdx = text.indexOf("〕", charIdx + 1);
      if (endIdx === -1) { charIdx++; continue; }
      charIdx = endIdx + 1;
      continue;
    }

    // 圆圈 〈text〉
    if (ch === "〈" && config.decorativeMarks.circleFrame.enabled) {
      const endIdx = text.indexOf("〉", charIdx + 1);
      if (endIdx === -1) { charIdx++; continue; }
      charIdx = endIdx + 1;
      continue;
    }

    // 字体放大 （text）
    if (ch === "（" && config.decorativeMarks.textZoom.enabled) {
      const endIdx = text.indexOf("）", charIdx + 1);
      if (endIdx === -1) { charIdx++; continue; }
      charIdx = endIdx + 1;
      continue;
    }

    // 圈注 ｛text｝
    if (ch === "｛" && config.decorativeMarks.circleNote.enabled) {
      const endIdx = text.indexOf("｝", charIdx + 1);
      if (endIdx === -1) { charIdx++; continue; }
      charIdx = endIdx + 1;
      continue;
    }

    // 顿点注 ＜text＞
    if (ch === "＜" && config.decorativeMarks.pointNote.enabled) {
      const endIdx = text.indexOf("＞", charIdx + 1);
      if (endIdx === -1) { charIdx++; continue; }
      charIdx = endIdx + 1;
      continue;
    }

    // 行注 ［text］
    if (ch === "［" && config.decorativeMarks.lineNote.enabled) {
      const endIdx = text.indexOf("］", charIdx + 1);
      if (endIdx === -1) { charIdx++; continue; }
      charIdx = endIdx + 1;
      continue;
    }

    charIdx++;
  }

  return {
    characters: result.characters,
    commentaryData: result.commentaryData,
    controlMarks: result.controlMarks,
    decorations: result.decorations,
    decorationIndexMap: result.decorationIndexMap,
  };
}

/** 在分页阶段处理装饰标记，生成装饰 IR */
export function processDecorationsForPage(
  characters: string[],
  commentaryData: CommentaryEntry[],
  pageStartIdx: number,
  pageChars: number,
  config: BookConfig,
  grid: import("./grid-calculator").GridMetrics,
  positions: { text: Position[]; comment: Position[] },
): { decorations: Decoration[]; commentaryData: CommentaryEntry[]; controlMarks: { type: ControlMark["type"]; index: number }[] } {
  const decorations: Decoration[] = [];
  const controlMarks: { type: ControlMark["type"]; index: number }[] = [];

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    const actualIdx = pageStartIdx + i;

    // 控制标记
    switch (ch) {
      case "%":
        controlMarks.push({ type: "pageBreak", index: actualIdx });
        break;
      case "$":
        controlMarks.push({ type: "halfPage", index: actualIdx });
        break;
      case "&":
        controlMarks.push({ type: "lastColumn", index: actualIdx });
        break;
      case "^":
        controlMarks.push({ type: "nextColumn", index: actualIdx });
        break;
    }
  }

  return { decorations, commentaryData, controlMarks };
}
