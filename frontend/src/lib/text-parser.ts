/**
 * 文本解析器 — 将原 vrain.pl 中的文本预处理逻辑移植为 TypeScript
 *
 * 原代码: vrain.pl lines 329-401
 *
 * 处理流程:
 *   1. 读取文本文件, 按行处理
 *   2. 简繁转换 (simplifiedToTraditional, 替代 vrain_mr.pl)
 *   3. 标点替换 (exp_replace_comma)
 *   4. 数字替换 (exp_replace_number)
 *   5. 标点删除 (exp_delete_comma)
 *   6. 无标点模式 (if_nocomma)
 *   7. 统一句号模式 (if_onlyperiod)
 *   8. 空格转换 (@ → space)
 *   9. 提取夹批 【】
 *   10. 从正文中剥离夹批
 *   11. 段落拼接 + 填充空格
 */

import type { BookConfig } from "../types/layout";
import { simplifyToTraditional, batchSimplifyToTraditional } from "./simp-trad";

/** 预处理后的文本段落 */
export interface ProcessedParagraph {
  text: string;         // 正文 (不含批注)
  commentaries: CommentaryItem[]; // 提取的批注（含位置）
  paddingSpaces: number; // 填充空格数 (使列高对齐)
}

/** 预处理后的文本文件 */
export interface ProcessedTextFile {
  filename: string;
  paragraphs: ProcessedParagraph[];
}

/**
 * 预处理单行文本
 *
 * 注意: 简繁转换是异步操作 (需加载 opencc WASM), 因此返回 Promise。
 * 如果调用方已提前批量转换（preConverted 非空），则跳过 API 调用。
 */
export async function preprocessLine(
  line: string,
  config: BookConfig,
  preConverted?: string,
): Promise<ProcessedParagraph> {
  // 如果上游已批量转换，直接用；否则走原有的逐行 API 路径
  let text = preConverted ?? line;

  if (!preConverted && config.simplifiedToTraditional) {
    text = await simplifyToTraditional(text);
  }

  // 1. 标点替换
  text = applyPunctuationReplacements(text, config.punctuationReplacements);

  // 2. 数字替换 (中文数字)
  text = applyNumberReplacement(text);

  // 3. 标点删除
  if (config.punctuationDeletions) {
    text = applyPunctuationDeletion(text, config.punctuationDeletions);
  }

  // 4. 无标点模式
  if (config.noPunctuationMode) {
    text = applyNoPunctuationMode(text, config.noPunctuationList);
  }

  // 5. 统一句号模式
  if (config.onlyPeriodMode) {
    text = applyOnlyPeriodMode(text, config.onlyPeriodList);
  }

  // 6. 空格转换
  text = text.replace(/@/g, " ");

  // 7. 提取夹批
  const { s: textWithComments, commentaries } = extractCommentaries(text);

  // 8. 保留 T 标记传递到 paginate 处理（行首缩进一字）
  // T 标记保留在文本中，由 paginate() 作为 advanceRow 控制标记处理
  // 不再移除 T+下一个字符，让 paginate 正确计算缩进
  const cleanedText = textWithComments;

  return {
    text: cleanedText,
    commentaries,
    paddingSpaces: 0, // 在段落级别计算
  };
}

/**
 * 应用标点替换规则
 * 规则: [{ from: ",", to: "，" }, { from: ".", to: "。" }]
 * 特殊字符 . ! ? ( ) [ ] - 自动转义
 */
function applyPunctuationReplacements(
  text: string,
  rules: { from: string; to: string }[]
): string {
  if (rules.length === 0) return text;

  let result = text;

  for (const rule of rules) {
    // 特殊字符需要转义
    const from = escapeRegexSpecialChars(rule.from);
    const to = rule.to;
    const regex = new RegExp(from, "g");
    result = result.replace(regex, to);
  }

  return result;
}

/** 转义正则特殊字符 */
function escapeRegexSpecialChars(str: string): string {
  return str.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/**
 * 应用中文数字替换
 * 将阿拉伯数字替换为中文数字 (0→〇, 1→一, ...)
 */
function applyNumberReplacement(text: string): string {
  const digitMap: Record<string, string> = {
    "0": "〇", "1": "一", "2": "二", "3": "三", "4": "四",
    "5": "五", "6": "六", "7": "七", "8": "八", "9": "九",
    "０": "〇", "１": "一", "２": "二", "３": "三", "４": "四",
    "５": "五", "６": "六", "７": "七", "８": "八", "９": "九",
  };

  let result = text;
  for (const [from, to] of Object.entries(digitMap)) {
    const regex = new RegExp(escapeRegexSpecialChars(from), "g");
    result = result.replace(regex, to);
  }

  return result;
}

/**
 * 删除指定标点
 */
function applyPunctuationDeletion(text: string, pattern: string): string {
  if (!pattern) return text;

  // 管道分隔的字符列表
  const chars = pattern.split("|").filter((c) => c.trim());
  let result = text;

  for (const char of chars) {
    const escaped = escapeRegexSpecialChars(char);
    const regex = new RegExp(escaped, "g");
    result = result.replace(regex, "");
  }

  return result;
}

/**
 * 无标点模式: 删除指定标点
 */
function applyNoPunctuationMode(text: string, pattern: string): string {
  if (!pattern) return text;
  return applyPunctuationDeletion(text, pattern);
}

/**
 * 统一句号模式: 将所有标点转为句号，合并连续句号
 */
function applyOnlyPeriodMode(text: string, pattern: string): string {
  if (!pattern) return text;

  // 将 pattern 中的每个字符替换为句号
  const chars = pattern.split("|").filter((c) => c.trim());
  let result = text;

  for (const char of chars) {
    const escaped = escapeRegexSpecialChars(char);
    const regex = new RegExp(escaped, "g");
    result = result.replace(regex, "。");
  }

  // 合并连续句号
  result = result.replace(/。+/g, "。");

  // 删除开头句号
  if (result.startsWith("。")) {
    result = result.slice(1);
  }

  return result;
}

/**
 * 批注条目 — 包含内容和在预处理后文本中的位置
 */
export interface CommentaryItem {
  content: string;
  /** 在 extractCommentaries 清理后文本中的字符偏移（即【】移除后的位置） */
  position: number;
}

/**
 * 提取夹批 【text】
 * 返回: 清理后的正文 + 提取的批注数组（含位置信息）
 */
function extractCommentaries(text: string): {
  s: string;
  commentaries: CommentaryItem[];
} {
  const rawMatches: { content: string; originalIndex: number; length: number }[] = [];
  const regex = /【([^】]*)】/g;
  let match;

  // 第一遍：收集所有匹配
  while ((match = regex.exec(text)) !== null) {
    const content = match[1];
    if (content) {
      rawMatches.push({
        content,
        originalIndex: match.index,
        length: match[0].length, // 含【】的总长度
      });
    }
  }

  // 计算清理后文本中的位置（减去前面已移除的字符）
  const commentaries: CommentaryItem[] = [];
  let totalRemoved = 0;
  for (const rm of rawMatches) {
    commentaries.push({
      content: rm.content,
      position: rm.originalIndex - totalRemoved,
    });
    totalRemoved += rm.length;
  }

  // 移除所有 【】 标记
  const cleaned = text.replace(/【[^】]*】/g, "");

  return { s: cleaned, commentaries };
}

/**
 * 计算段落填充空格
 * 使每列高度对齐 (填满到下一个行边界)
 */
export function calculatePadding(paragraphs: ProcessedParagraph[]): ProcessedParagraph[] {
  for (const para of paragraphs) {
    const textLen = para.text.length;
    // 填充空格使列高对齐
    const padding = textLen > 0 ? textLen % 1 : 0;
    para.paddingSpaces = padding;
  }
  return paragraphs;
}

/**
 * 合并预处理后的文本文件
 */
export function mergeTextFiles(
  files: ProcessedTextFile[],
  config: BookConfig
): ProcessedParagraph[] {
  const allParagraphs: ProcessedParagraph[] = [];

  for (const file of files) {
    allParagraphs.push(...file.paragraphs);
  }

  // 计算填充空格
  return calculatePadding(allParagraphs);
}

/**
 * 将原始文本行转换为 ProcessedTextFile (异步版本)
 *
 * 优化: 如果启用简繁转换，先对所有行做一次批量 API 调用，
 * 再逐行处理（跳过重复的转换），将 N 次 HTTP 请求降为 1 次。
 */
export async function parseTextFile(
  filename: string,
  rawLines: string[],
  config: BookConfig
): Promise<ProcessedTextFile> {
  // 如果启用简繁转换，提前批量转换所有行
  let convertedLines: string[] | null = null;
  if (config.simplifiedToTraditional) {
    const nonEmpty = rawLines.map((l) => l.trim()).filter((l) => l !== "");
    if (nonEmpty.length > 0) {
      convertedLines = await batchSimplifyToTraditional(nonEmpty);
    }
  }

  const paragraphs: ProcessedParagraph[] = [];
  let currentLines: string[] = [];
  let convIdx = 0; // 跟踪已消费的转换行

  for (const line of rawLines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (currentLines.length > 0) {
        paragraphs.push(...await processLines(currentLines, config, convertedLines, convIdx));
        convIdx += currentLines.length;
        currentLines = [];
      }
    } else {
      currentLines.push(trimmed);
    }
  }

  if (currentLines.length > 0) {
    paragraphs.push(...await processLines(currentLines, config, convertedLines, convIdx));
    // convIdx not needed after last batch
  }

  return { filename, paragraphs };
}

/**
 * 将一组文本行转换为 ProcessedParagraph (异步版本)
 * @param convertedLines 预转换后的行（与 lines 一一对应），为 null 表示未预转换
 * @param convStart 当前批次在 convertedLines 中的起始索引
 */
async function processLines(
  lines: string[],
  config: BookConfig,
  convertedLines: string[] | null,
  convStart: number,
): Promise<ProcessedParagraph[]> {
  const result: ProcessedParagraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const preConv = convertedLines ? convertedLines[convStart + i] : undefined;
    result.push(await preprocessLine(lines[i], config, preConv));
  }

  return result;
}
