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

  // 批注背景色 — 按 cmBlockId + 列分组，每列独立填满列宽
  const cmBlockMap = new Map<number, { x: number; y: number }[]>();
  for (const ch of page.characters) {
    if (ch.isCommentary && ch.cmBlockId != null && ch.backgroundColor) {
      const list = cmBlockMap.get(ch.cmBlockId) || [];
      list.push({ x: ch.x, y: ch.y });
      cmBlockMap.set(ch.cmBlockId, list);
    }
  }
  if (cmBlockMap.size > 0) {
    const { margins: cmMargins, leafCenterWidth: cmLcw, leafCol: cmLc } = page.canvas;
    const cmUsableW = page.canvas.width - cmMargins.left - cmMargins.right - cmLcw;
    const cmColW = cmUsableW / cmLc;
    const cmHalf = cmLc / 2;
    // 预计算所有列中心
    const cmColCenters: number[] = [];
    for (let ci = 1; ci <= cmLc; ci++) {
      cmColCenters.push(
        ci <= cmHalf
          ? page.canvas.width - cmMargins.right - cmColW * ci + cmColW / 2
          : page.canvas.width - cmMargins.right - cmColW * ci - cmLcw + cmColW / 2,
      );
    }
    html += `<svg style="position:absolute;left:0;top:0;width:${width}px;height:${height}px;pointer-events:none;">`;
    for (const [blockId, pts] of cmBlockMap) {
      // 按最近列中心分组
      const colPts = new Map<number, { x: number; y: number }[]>();
      for (const p of pts) {
        let nearest = 0, minDist = Math.abs(p.x - cmColCenters[0]);
        for (let i = 1; i < cmColCenters.length; i++) {
          const d = Math.abs(p.x - cmColCenters[i]);
          if (d < minDist) { minDist = d; nearest = i; }
        }
        const g = colPts.get(nearest) || [];
        g.push(p);
        colPts.set(nearest, g);
      }
      const c = page.characters.find(ch => ch.isCommentary && ch.cmBlockId === blockId && ch.backgroundColor);
      const pad = (c?.fontSize ?? 24) * 0.55;
      const color = c?.backgroundColor ?? "#f5e6d3";
      for (const [colIdx, g] of colPts) {
        const i = colIdx + 1;
        const colLeft = i <= cmHalf
          ? page.canvas.width - cmMargins.right - cmColW * i
          : page.canvas.width - cmMargins.right - cmColW * i - cmLcw;
        const colRight = colLeft + cmColW;
        const minY = Math.min(...g.map(p => p.y));
        const maxY = Math.max(...g.map(p => p.y));
        html += `<rect x="${colLeft}" y="${minY - pad}" width="${colRight - colLeft}" height="${maxY - minY + pad * 2}" fill="${color}" />`;
      }
    }
    // 跨列背景可能遮盖列分隔线，重画一遍
    for (let cid = 1; cid <= cmLc; cid++) {
      const wd = cid > cmHalf ? cmLcw - cmColW : 0;
      const x = cmMargins.left + wd + cmColW * cid;
      html += `<line x1="${x}" y1="${cmMargins.top}" x2="${x}" y2="${page.canvas.height - cmMargins.bottom}" stroke="#e0e0e0" stroke-width="0.5" />`;
    }
    html += `</svg>`;
  }

  // 正文字符
  for (const ch of page.characters) {
    const effectiveSize = ch.fontSize * (ch.scale || 1);
    html += `<span class="vrain-char" style="position:absolute;left:${ch.x}px;top:${ch.y}px;font-size:${effectiveSize}px;color:${ch.color || 'black'};writing-mode:vertical-rl;text-orientation:upright;transform:translate(-50%,-50%);text-align:center;">${escapeHtml(ch.char)}</span>`;
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

  // 中缝装饰 — SVG 精确绘制 (与预览一致)
  html += `<svg style="position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;">`;
  // 粗竖线
  html += `<line x1="${plx}" y1="0" x2="${plx}" y2="${ch}" stroke="#f2f2f2" stroke-width="20" />`;
  // 细竖线
  html += `<line x1="${plx - 50}" y1="0" x2="${plx - 50}" y2="${ch}" stroke="#f2f2f2" stroke-width="2" />`;
  html += `<line x1="${plx + 50}" y1="0" x2="${plx + 50}" y2="${ch}" stroke="#f2f2f2" stroke-width="2" />`;
  // 细横线 (从底部往上)
  for (let lid = 0; lid <= ch / 200; lid++) {
    const ly = ch - 200 * lid;
    html += `<line x1="${plx - 50}" y1="${ly}" x2="${plx + 50}" y2="${ly}" stroke="#f2f2f2" stroke-width="1" />`;
  }
  html += `</svg>`;

  // 书名 — 左侧竖排从上往下
  html += `<div style="position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;font-size:${titleFontSize}px;color:${coverFontColor};">`;
  for (let i = 0; i < titleChars.length; i++) {
    const fx = titleFontSize * 1.5;
    const fy = bookConfig.coverTitleY + titleFontSize * i * 1.2;
    html += `<span style="position:absolute;left:${fx}px;top:${fy}px;transform:translate(-50%,-50%);">${escapeHtml(titleChars[i])}</span>`;
  }
  html += `</div>`;

  // 作者 — 左侧竖排从上往下
  html += `<div style="position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;font-size:${authorFontSize}px;color:${coverFontColor};">`;
  for (let i = 0; i < authorChars.length; i++) {
    const fx = authorFontSize * 1.2;
    const fy = bookConfig.coverAuthorY + authorFontSize * i * 1.2;
    html += `<span style="position:absolute;left:${fx}px;top:${fy}px;transform:translate(-50%,-50%);">${escapeHtml(authorChars[i])}</span>`;
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
  let svg = `<svg style="position:absolute;left:0;top:0;width:${canvas.width}px;height:${canvas.height}px;pointer-events:none;">`;

  // 外框 — 用 SVG rect 精确描边 (和 Canvas strokeRect 一致)
  const ox = margins.left, oy = margins.top;
  const ow = canvas.width - margins.left - margins.right;
  const oh = canvas.height - margins.top - margins.bottom;
  svg += `<rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" fill="none" stroke="${outerBorder.color || 'black'}" stroke-width="${outerBorder.width || 10}" />`;

  // 内框
  const iMargin = 5;
  svg += `<rect x="${ox + iMargin}" y="${oy + iMargin}" width="${ow - iMargin * 2}" height="${oh - iMargin * 2}" fill="none" stroke="${innerBorder.color || 'black'}" stroke-width="${innerBorder.width || 1}" />`;

  // 分栏线 — 与预览公式一致
  const usableWidth = canvas.width - margins.left - margins.right - leafCenterWidth;
  const colWidth = usableWidth / leafCol;
  for (let cid = 1; cid <= leafCol; cid++) {
    const wd = cid > leafCol / 2 ? leafCenterWidth - colWidth : 0;
    const x = margins.left + wd + colWidth * cid;
    svg += `<line x1="${x}" y1="${margins.top}" x2="${x}" y2="${canvas.height - margins.bottom}" stroke="#e0e0e0" stroke-width="0.5" />`;
  }

  svg += `</svg>`;
  return svg;
}

/** 渲染鱼尾 */
function renderFishTails(canvas: CanvasConfig, width: number, height: number): string {
  const { fishTail, margins } = canvas;
  const centerX = width / 2;

  let html = "";

  // 上鱼尾
  html += `<div style="position:absolute;left:${centerX - fishTail.top.lineWidth / 2}px;top:${fishTail.top.y}px;width:${fishTail.top.lineWidth}px;height:${fishTail.top.rectHeight}px;background:${fishTail.top.color || 'black'};"></div>`;
  // 上鱼尾 — direction=0 三角形向下
  html += `<div style="position:absolute;left:${centerX - fishTail.top.lineWidth * 3}px;top:${fishTail.top.y + fishTail.top.rectHeight}px;width:${fishTail.top.lineWidth * 6}px;height:${fishTail.top.triHeight}px;background:${fishTail.top.color || 'black'};clip-path:polygon(50% 0%, 0 100%, 100% 100%);"></div>`;

  // 下鱼尾
  const btmDir: number = fishTail.bottom.direction ?? 1;
  // 三角形: 0=向下 (tipY=0), 1=向上 (tipY=100)
  const tipY = btmDir === 0 ? '0' : '100';
  const baseY = btmDir === 0 ? '100' : '0';
  const triY = fishTail.bottom.y + fishTail.bottom.rectHeight; // 紧贴鱼尾主体
  html += `<div style="position:absolute;left:${centerX - fishTail.bottom.lineWidth / 2}px;top:${fishTail.bottom.y}px;width:${fishTail.bottom.lineWidth}px;height:${fishTail.bottom.rectHeight}px;background:${fishTail.bottom.color || 'black'};"></div>`;
  html += `<div style="position:absolute;left:${centerX - fishTail.bottom.lineWidth * 3}px;top:${triY}px;width:${fishTail.bottom.lineWidth * 6}px;height:${fishTail.bottom.triHeight}px;background:${fishTail.bottom.color || 'black'};clip-path:polygon(50% ${tipY}%, 0 ${baseY}%, 100% ${baseY}%);"></div>`;

  return html;
}

/** 渲染版心标题 */
function renderTitle(title: string, bookConfig: BookConfig, canvas: CanvasConfig, isOutline?: boolean, bookmarkLabel?: string): string {
  const chars = [...title];
  const fontSize = bookConfig.titleFontSize;
  const spacing = bookConfig.titleYDis;
  const yStart = bookConfig.titleY;
  // 居中于中缝区域，而非用 fontSize 偏移（fontSize ≠ 字符实际渲染宽度）
  const gapLeft = canvas.width / 2 - canvas.leafCenterWidth / 2;
  const gapWidth = canvas.leafCenterWidth;
  const x = gapLeft + (gapWidth - fontSize) / 2;
  const outlineAttrs = isOutline && bookmarkLabel ? ` class="vrain-outline" data-bookmark="${escapeHtml(bookmarkLabel)}"` : "";

  let html = `<div style="position:absolute;left:${x}px;top:${yStart}px;color:${bookConfig.titleColor || 'black'};font-size:${fontSize}px;"${outlineAttrs}>`;
  for (let i = 0; i < chars.length; i++) {
    const cy = i * fontSize * spacing;
    html += `<span style="position:absolute;top:${cy}px;left:0;">${escapeHtml(chars[i])}</span>`;
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
  // 居中于中缝区域
  const gapLeft = canvas.width / 2 - canvas.leafCenterWidth / 2;
  const gapWidth = canvas.leafCenterWidth;
  const x = gapLeft + (gapWidth - fontSize) / 2;

  let html = `<div style="position:absolute;left:${x}px;top:${yStart}px;color:${bookConfig.pagerColor || 'black'};font-size:${fontSize}px;">`;
  for (let i = 0; i < chars.length; i++) {
    const cy = i * fontSize * 1.2;
    html += `<span style="position:absolute;top:${cy}px;left:0;">${escapeHtml(chars[i])}</span>`;
  }
  html += `</div>`;
  return html;
}

/** 渲染 SVG 装饰 */
function renderDecorationSvg(dec: import("../types/layout").Decoration, width: number, height: number): string {
  const { x1, y1, x2, y2 } = dec.bounds;
  const { color, strokeWidth } = dec;
  let svg = `<g>`; // fill/stroke 按元素单独设置

  switch (dec.type) {
    case "wavyLine":
      svg += `<g stroke="${color || 'black'}" stroke-width="${strokeWidth || 2}" fill="none">`;
      if (dec.charPositions && dec.charPositions.length > 0) {
        const x = dec.charPositions[0].x + 28;
        const y1 = dec.charPositions[0].y;
        const y2 = dec.charPositions[dec.charPositions.length - 1].y;
        svg += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke-dasharray="3,3" />`;
      } else {
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
      }
      svg += `</g>`;
      break;
    case "lineNote":
      svg += `<g stroke="${color || 'black'}" stroke-width="${strokeWidth || 2}" fill="none">`;
      if (dec.charPositions && dec.charPositions.length > 0) {
        const lx = dec.charPositions[0].x + (dec.noteOffsetX ?? 0);
        const ly1 = dec.charPositions[0].y;
        const ly2 = dec.charPositions[dec.charPositions.length - 1].y;
        svg += `<line x1="${lx}" y1="${ly1}" x2="${lx}" y2="${ly2}" />`;
      } else {
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
      }
      svg += `</g>`;
      break;
    case "rectFrame":
      // 先填充再描边
      if (dec.fillColor) {
        svg += `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="4" ry="4" fill="${dec.fillColor}" stroke="none" />`;
      }
      svg += `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="4" ry="4" fill="none" stroke="${color || 'black'}" stroke-width="${strokeWidth || 2}" />`;
      break;
    case "circleFrame":
      if (dec.charPositions && dec.charPositions.length > 0) {
        for (const cp of dec.charPositions) {
          const cr = (strokeWidth || 2) * 3;
          if (dec.fillColor) {
            svg += `<circle cx="${cp.x}" cy="${cp.y}" r="${cr}" fill="${dec.fillColor}" stroke="none" />`;
          }
          svg += `<circle cx="${cp.x}" cy="${cp.y}" r="${cr}" fill="none" stroke="${color || 'black'}" stroke-width="${strokeWidth || 2}" />`;
        }
      } else {
        const cr = Math.max(x2 - x1, y2 - y1) / 2;
        if (dec.fillColor) {
          svg += `<circle cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="${cr}" fill="${dec.fillColor}" stroke="none" />`;
        }
        svg += `<circle cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="${cr}" fill="none" stroke="${color || 'black'}" stroke-width="${strokeWidth || 2}" />`;
      }
      break;
    case "circleNote":
      svg += `<g stroke="${color || 'black'}" stroke-width="${strokeWidth || 2}" fill="none">`;
      if (dec.charPositions && dec.charPositions.length > 0) {
        const ox = (dec.noteOffsetX ?? 0);
        const oy = (dec.noteOffsetY ?? 0);
        const nr = dec.noteRadius ?? (strokeWidth || 2) * 2;
        for (const cp of dec.charPositions) {
          svg += `<circle cx="${cp.x + ox}" cy="${cp.y + oy}" r="${nr}" />`;
        }
      } else {
        svg += `<circle cx="${x1}" cy="${y1}" r="${strokeWidth * 2}" />`;
      }
      svg += `</g>`;
      break;
    case "pointNote":
      if (dec.charPositions && dec.charPositions.length > 0) {
        const pox = (dec.noteOffsetX ?? 0);
        const poy = (dec.noteOffsetY ?? 0);
        const ps = dec.noteSize ?? (strokeWidth || 2) * 4;
        for (const cp of dec.charPositions) {
          svg += `<text x="${cp.x + pox}" y="${cp.y + poy}" fill="${color || 'black'}" font-size="${ps}" text-anchor="middle">、</text>`;
        }
      } else {
        svg += `<text x="${x1}" y="${y1}" fill="${color || 'black'}" font-size="${strokeWidth * 4}" text-anchor="middle">、</text>`;
      }
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

/**
 * 按文件范围 + 序/附录 + 测试模式筛选页面
 *
 * fileFrom/fileTo 为章节编号（1-based），序=fileIndex 0，附录=fileIndex 1
 * includePreface/includeAppendix 控制是否包含特殊文件
 */
export function filterPagesByRange(
  pages: Page[],
  fileFrom: number,
  fileTo: number,
  testPages?: number,
  includePreface?: boolean,
  includeAppendix?: boolean,
): Page[] {
  let filtered = pages.filter((p) => {
    // 序 (fileIndex 0) — 根据 includePreface 决定
    if (p.fileIndex === 0) return includePreface !== false;
    // 附录 (fileIndex 1) — 根据 includeAppendix 决定
    if (p.fileIndex === 1) return includeAppendix !== false;
    // 章节 (fileIndex 2+): 章节号 = fileIndex - 1
    const chapterNum = p.fileIndex - 1;
    return chapterNum >= fileFrom && chapterNum <= fileTo;
  });

  if (testPages && testPages > 0) {
    filtered = filtered.slice(0, testPages);
  }

  return filtered;
}
