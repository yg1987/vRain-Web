/**
 * IR → HTML/CSS 转换
 *
 * 将 Layout Engine 输出的 Page IR 转换为 HTML + CSS，
 * 供 Puppeteer headless Chromium page.pdf() 渲染为 PDF。
 *
 * 核心策略:
 *   - 字符: <span class="vrain-char" style="writing-mode: vertical-rl; left: Xpx; top: Ypx;">字</span>
 *   - 夹批: <div class="vrain-commentary" style="left: Xpx; top: Ypx;">双列小字</div>
 *   - 装饰: <svg class="vrain-decoration"> 覆盖层
 *   - 背景: CSS background-image 或 Canvas 截图
 */

import type { Page, BookConfig, CanvasConfig } from "../types/layout";
import { num2zh } from "./num2zh";

export interface PdfOptions {
  /** PDF 纸张尺寸 */
  pageSize?: { width: number; height: number };
  /** 是否包含页面编号 */
  includePageNumbers?: boolean;
  /** 输出质量 (0.1 ~ 1.0) */
  quality?: number;
  /** 测试模式：限制生成的页数 */
  testPages?: number;
  /** 是否压缩 PDF */
  compress?: boolean;
  /** 是否包含封面页 */
  includeCover?: boolean;
  /** 从第几章开始 (1-based) */
  fileFrom?: number;
  /** 到第几章结束 (1-based) */
  fileTo?: number;
}

/** 将单页 IR 转换为 HTML 字符串 */
export function pageToHtml(page: Page, bookConfig: BookConfig, canvasConfig: CanvasConfig, opts: PdfOptions = {}): string {
  const {
    pageSize = { width: page.canvas.width, height: page.canvas.height },
    includePageNumbers = true,
    quality = 1,
  } = opts;

  const { width, height } = pageSize;

  // 基础 HTML 结构
  let html = `<div class="vrain-page" style="width:${width}px;height:${height}px;position:relative;overflow:hidden;">`;

  // 背景色
  html += `<div style="width:100%;height:100%;background:${canvasConfig.color || 'white'};"></div>`;

  // 边框
  html += renderBorders(canvasConfig);

  // 鱼尾
  html += renderFishTails(canvasConfig, width, height);

  // 版心标题
  if (page.title && canvasConfig.leafCenterWidth > 0) {
    const isOutline = page.outlineTitle ? true : false;
    html += renderTitle(page.title, bookConfig, page.canvas, isOutline, page.outlineTitle || "");
  }

  // 版心页码
  if (includePageNumbers) {
    html += renderPageNumber(page.pageNumber, bookConfig, page.canvas);
  }

  // 正文字符
  for (const ch of page.characters) {
    if (ch.isCommentary) continue; // 批注单独处理
    const effectiveSize = ch.fontSize * (ch.scale || 1);
    html += `<span class="vrain-char" style="position:absolute;left:${ch.x}px;top:${ch.y}px;font-size:${effectiveSize}px;color:${ch.color || 'black'};writing-mode:vertical-rl;display:block;width:${effectiveSize}px;height:${effectiveSize}px;line-height:1.2;text-align:center;">${escapeHtml(ch.char)}</span>`;
  }

  // 夹批
  for (const cm of page.commentaries) {
    html += `<div class="vrain-commentary" style="position:absolute;left:${cm.x}px;top:${cm.y}px;font-size:${cm.fontSize}px;color:${cm.color || 'black'};writing-mode:vertical-rl;">`;
    for (const c of cm.chars) {
      html += escapeHtml(c);
    }
    html += `</div>`;
  }

  // 装饰标记 (SVG overlay)
  if (page.decorations.length > 0) {
    html += `<svg class="vrain-decorations" style="position:absolute;left:0;top:0;width:${width}px;height:${height}px;pointer-events:none;">`;
    for (const dec of page.decorations) {
      html += renderDecorationSvg(dec, width, height);
    }
    html += `</svg>`;
  }

  html += `</div>`;

  return html;
}

/** 生成封面页 HTML */
export function generateCoverHtml(bookConfig: BookConfig, canvasConfig: CanvasConfig): string {
  const cw = canvasConfig.width;
  const ch = canvasConfig.height;
  const plx = cw < ch ? cw : cw / 2;
  const titleFontSize = bookConfig.coverTitleFontSize;
  const authorFontSize = bookConfig.coverAuthorFontSize;
  const coverFontColor = bookConfig.coverFontColor || "black";

  const titleChars = [...bookConfig.title];
  const authorChars = [...bookConfig.author];

  let html = `<div class="vrain-cover" style="width:${cw}px;height:${ch}px;position:relative;overflow:hidden;background:#f2ead9;">`;

  // 中缝竖线
  html += `<div style="position:absolute;left:${plx}px;top:0;width:20px;height:100%;border-left:1px solid #e0d5c1;border-right:1px solid #e0d5c1;"></div>`;
  html += `<div style="position:absolute;left:${plx - 50}px;top:0;width:1px;height:100%;background:#e0d5c1;"></div>`;
  html += `<div style="position:absolute;left:${plx + 50}px;top:0;width:1px;height:100%;background:#e0d5c1;"></div>`;

  // 横线装饰
  for (let y = 0; y < ch; y += 200) {
    html += `<div style="position:absolute;left:${plx - 50}px;top:${y}px;width:100px;height:1px;background:#e8ddd0;"></div>`;
  }

  // 书名竖排
  html += `<div style="position:absolute;left:${plx - titleFontSize / 2}px;top:${bookConfig.coverTitleY}px;width:${titleFontSize}px;height:auto;font-size:${titleFontSize}px;color:${coverFontColor};writing-mode:vertical-rl;text-align:center;">`;
  for (const c of titleChars) {
    html += `<span style="display:inline-block;">${escapeHtml(c)}</span>`;
  }
  html += `</div>`;

  // 作者竖排
  html += `<div style="position:absolute;left:${plx - authorFontSize / 2}px;top:${bookConfig.coverAuthorY}px;width:${authorFontSize}px;height:auto;font-size:${authorFontSize}px;color:${coverFontColor};writing-mode:vertical-rl;text-align:center;">`;
  for (const c of authorChars) {
    html += `<span style="display:inline-block;">${escapeHtml(c)}</span>`;
  }
  html += `</div>`;

  html += `</div>`;
  return html;
}

/** 将多页 IR 转换为完整 HTML 文档 */
export function pagesToHtml(
  pages: Page[],
  bookConfig: BookConfig,
  canvasConfig: CanvasConfig,
  opts: PdfOptions = {},
): string {
  const pagesHtml = pages.map((page) => pageToHtml(page, bookConfig, canvasConfig, opts)).join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: ${canvasConfig.width}px ${canvasConfig.height}px;
    margin: 0;
  }
  body { margin: 0; padding: 0; background: white; }
  .vrain-page {
    page-break-after: always;
    font-family: "Noto Serif SC", "Source Han Serif CN", "STSong", "SimSun", serif;
  }
  .vrain-char {
    font-family: inherit;
    line-height: 1.2;
    text-align: center;
  }
  .vrain-commentary {
    font-size: 0.75em;
    letter-spacing: 0.05em;
  }
  .vrain-decorations { z-index: 10; }
  .vrain-cover { page-break-after: always; }
  /* Outline 书签 (CSS Paged Media) */
  ${generateOutlineCss(bookConfig)}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

/** 渲染边框 */
function renderBorders(canvas: CanvasConfig): string {
  const { margins, outerBorder, innerBorder, leafCenterWidth, leafCol } = canvas;
  let html = "";

  // 外框
  html += `<div style="position:absolute;left:${margins.left}px;top:${margins.top}px;width:${canvas.width - margins.left - margins.right}px;height:${canvas.height - margins.top - margins.bottom}px;border:${outerBorder.width || 10}px solid ${outerBorder.color || 'black'};"></div>`;

  // 内框
  const iMargin = 5;
  html += `<div style="position:absolute;left:${margins.left + iMargin}px;top:${margins.top + iMargin}px;width:${canvas.width - margins.left - margins.right - iMargin * 2}px;height:${canvas.height - margins.top - margins.bottom - iMargin * 2}px;border:${innerBorder.width || 1}px solid ${innerBorder.color || 'black'};"></div>`;

  // 分栏线
  const usableWidth = canvas.width - margins.left - margins.right - leafCenterWidth;
  const colWidth = usableWidth / leafCol;
  html += `<div style="position:absolute;left:${margins.left}px;top:${margins.top}px;width:1px;height:${canvas.height - margins.top - margins.bottom}px;">`;
  for (let i = 0; i <= leafCol; i++) {
    const x = margins.left + (i <= leafCol / 2 ? i * colWidth : i * colWidth + leafCenterWidth);
    html += `<div style="position:absolute;left:${x}px;width:0.5px;height:100%;background:#e0e0e0;"></div>`;
  }
  html += `</div>`;

  // 中缝线
  if (leafCenterWidth > 0) {
    const centerX = canvas.width / 2;
    html += `<div style="position:absolute;left:${centerX}px;top:${margins.top}px;width:1px;height:${canvas.height - margins.top - margins.bottom}px;background:${innerBorder.color || 'black'};"></div>`;
  }

  return html;
}

/** 渲染鱼尾 */
function renderFishTails(canvas: CanvasConfig, width: number, height: number): string {
  const { fishTail, margins } = canvas;
  const centerX = width / 2;

  let html = "";

  // 上鱼尾
  html += `<div style="position:absolute;left:${centerX - fishTail.top.lineWidth / 2}px;top:${fishTail.top.y}px;width:${fishTail.top.lineWidth}px;height:${fishTail.top.rectHeight}px;background:${fishTail.top.color || 'black'};"></div>`;
  html += `<div style="position:absolute;left:${centerX - fishTail.top.lineWidth * 3}px;top:${fishTail.top.y + fishTail.top.rectHeight}px;width:${fishTail.top.lineWidth * 6}px;height:${fishTail.top.triHeight}px;background:${fishTail.top.color || 'black'};clip-path:polygon(50% 100%, 0 0, 100% 0);"></div>`;

  // 下鱼尾
  const btmDir = fishTail.bottom.direction || 1;
  const triDir = btmDir === 1 ? -1 : 1;
  const triY = fishTail.bottom.y + fishTail.bottom.rectHeight + triDir * fishTail.bottom.triHeight;
  html += `<div style="position:absolute;left:${centerX - fishTail.bottom.lineWidth / 2}px;top:${fishTail.bottom.y}px;width:${fishTail.bottom.lineWidth}px;height:${fishTail.bottom.rectHeight}px;background:${fishTail.bottom.color || 'black'};"></div>`;
  html += `<div style="position:absolute;left:${centerX - fishTail.bottom.lineWidth * 3}px;top:${triY}px;width:${fishTail.bottom.lineWidth * 6}px;height:${fishTail.bottom.triHeight}px;background:${fishTail.bottom.color || 'black'};clip-path:polygon(50% ${triDir === 1 ? '0' : '100'}%, 0 ${triDir === 1 ? '0' : '100'}%, 100% ${triDir === 1 ? '0' : '100'}%);"></div>`;

  return html;
}

/** 渲染版心标题 */
function renderTitle(title: string, bookConfig: BookConfig, canvas: CanvasConfig, isOutline?: boolean, bookmarkLabel?: string): string {
  const chars = [...title];
  const fontSize = bookConfig.titleFontSize;
  const spacing = bookConfig.titleYDis;
  const yStart = bookConfig.titleY;
  const x = canvas.width / 2 - fontSize / 2;
  const outlineAttrs = isOutline && bookmarkLabel ? ` class="vrain-outline" data-bookmark="${escapeHtml(bookmarkLabel)}"` : "";

  let html = `<div style="position:absolute;left:${x}px;color:${bookConfig.titleColor || 'black'};font-size:${fontSize}px;writing-mode:vertical-rl;"${outlineAttrs}>`;
  for (let i = 0; i < chars.length; i++) {
    html += `<span style="display:inline-block;margin-top:${-fontSize * spacing}px;">${escapeHtml(chars[i])}</span>`;
  }
  html += `</div>`;
  return html;
}

/** 渲染版心页码 */
function renderPageNumber(pageNum: number, bookConfig: BookConfig, canvas: CanvasConfig): string {
  const numStr = num2zh(pageNum);
  const chars = [...numStr];
  const fontSize = bookConfig.pagerFontSize;
  const yStart = bookConfig.pagerY;
  const x = canvas.width / 2 - fontSize / 2;

  let html = `<div style="position:absolute;left:${x}px;color:${bookConfig.pagerColor || 'black'};font-size:${fontSize}px;writing-mode:vertical-rl;">`;
  for (const c of chars) {
    html += `<span style="display:inline-block;">${escapeHtml(c)}</span>`;
  }
  html += `</div>`;
  return html;
}

/** 渲染 SVG 装饰 */
function renderDecorationSvg(dec: import("../types/layout").Decoration, width: number, height: number): string {
  const { x1, y1, x2, y2 } = dec.bounds;
  const { color, strokeWidth } = dec;
  let svg = `<g stroke="${color || 'black'}" stroke-width="${strokeWidth || 2}" fill="none">`;

  switch (dec.type) {
    case "wavyLine":
      // 简化的波浪线 — 用多条直线模拟
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
      break;
    case "lineNote":
      svg += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}" />`;
      break;
    case "rectFrame":
      svg += `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="4" ry="4" />`;
      break;
    case "circleFrame":
      const r = Math.max(x2 - x1, y2 - y1) / 2;
      svg += `<circle cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="${r}" />`;
      break;
    case "circleNote":
      svg += `<circle cx="${x1}" cy="${y1}" r="${strokeWidth * 2}" />`;
      break;
    case "pointNote":
      svg += `<text x="${x1}" y="${y1}" fill="${color}" font-size="${strokeWidth * 4}" text-anchor="middle">、</text>`;
      break;
  }

  svg += `</g>`;
  return svg;
}

/** 生成 PDF 书签 (CSS Paged Media bookmark 属性) */
function generateOutlineCss(bookConfig: BookConfig): string {
  if (!bookConfig.titleDirectory) return "";
  return `
    .vrain-outline[data-bookmark] {
      bookmark-level: 1;
      bookmark-label: attr(data-bookmark);
    }
  `;
}

/** HTML 转义 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 按文件范围 + 测试模式筛选页面 */
export function filterPagesByRange(
  pages: Page[],
  fileFrom: number,
  fileTo: number,
  testPages?: number,
): Page[] {
  let sliced = pages.slice(fileFrom - 1, fileTo);
  if (testPages && testPages > 0) sliced = sliced.slice(0, testPages);
  return sliced;
}
