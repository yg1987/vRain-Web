/**
 * 预览渲染器 (Preview Renderer)
 * 接收 Layout Engine 输出的 IR (Page[])，在 Canvas 2D 上逐帧绘制。
 * 纯函数，无外部依赖，可独立测试。
 */

import type { Page, BookConfig, CanvasConfig } from "../types/layout";

export interface RendererOptions {
  /** 要渲染的页面索引 (从 1 开始) */
  pageIndex?: number;
  /** 是否渲染封面 */
  renderCover?: boolean;
}

export interface RenderResult {
  canvasWidth: number;
  canvasHeight: number;
  renderedPageCount: number;
}

/** 将 IR 渲染到 Canvas 2D */
export function renderPages(
  canvas: HTMLCanvasElement,
  pages: Page[],
  bookConfig: BookConfig,
  canvasConfig: CanvasConfig,
  opts: RendererOptions = {},
): RenderResult {
  const {
    pageIndex = 0,
    renderCover = false,
  } = opts;

  const dpr = window.devicePixelRatio || 1;

  // 适配视口宽度: 取外层滚动容器的宽度与画布原宽中的较小值
  // 注意: 不能取 canvas.parentElement (transform wrapper 尺寸由 canvas 决定，会形成循环)
  // 应该取 overflow-auto 容器的 clientWidth
  const scrollContainer = canvas.closest('.overflow-auto');
  const parentWidth = (scrollContainer?.clientWidth || canvas.parentElement?.clientWidth || canvasConfig.width) - 4;
  // 使用外层容器宽度作为 Canvas 内部分辨率，确保文字清晰
  const cssWidth = Math.min(Math.ceil(canvasConfig.width / 10) * 10, Math.max(400, parentWidth));
  const cssHeight = Math.ceil((canvasConfig.height * cssWidth) / canvasConfig.width);

  // 内部分辨率 = CSS 尺寸 * DPR，不使用额外的 scale
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";

  const ctx = canvas.getContext("2d")!;
  // 设置 DPR 缩放（高清屏适配），不再叠加预览缩放
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 将画布内容缩放到容器尺寸
  ctx.scale(cssWidth / canvasConfig.width, cssHeight / canvasConfig.height);

  // 清屏
  ctx.fillStyle = canvasConfig.color || "white";
  ctx.fillRect(0, 0, canvasConfig.width, canvasConfig.height);

  // 绘制封面或内容页
  if (renderCover) {
    drawCover(ctx, bookConfig, canvasConfig);
  } else {
    const pageIdx = pageIndex > 0 ? pageIndex - 1 : 0;
    if (pageIdx < pages.length) {
      drawPage(ctx, pages[pageIdx], bookConfig, canvasConfig);
    }
  }

  return {
    canvasWidth: cssWidth,
    canvasHeight: cssHeight,
    renderedPageCount: pages.length,
  };
}

/** 绘制封面页 */
function drawCover(ctx: CanvasRenderingContext2D, config: BookConfig, canvasConfig: CanvasConfig) {
  const cw = canvasConfig.width;
  const ch = canvasConfig.height;
  const plx = cw < ch ? cw : cw / 2;

  // 仿古纸张背景
  ctx.fillStyle = "#f2ead9";
  ctx.fillRect(0, 0, cw, ch);

  // 装饰中线
  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(plx, 0);
  ctx.lineTo(plx, ch);
  ctx.stroke();

  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plx - 50, 0);
  ctx.lineTo(plx - 50, ch);
  ctx.moveTo(plx + 50, 0);
  ctx.lineTo(plx + 50, ch);
  ctx.stroke();

  // 横线装饰
  ctx.lineWidth = 1;
  for (let y = 0; y < ch; y += 200) {
    ctx.beginPath();
    ctx.moveTo(plx - 50, y);
    ctx.lineTo(plx + 50, y);
    ctx.stroke();
  }

  // 书名竖排
  drawVerticalText(ctx, config.title, plx - config.coverTitleFontSize / 2, config.coverTitleY, {
    size: config.coverTitleFontSize,
    color: config.coverFontColor || "black",
    fontFamily: config.coverTitleFontFamily,
  });

  // 作者竖排（沿用正文）
  drawVerticalText(ctx, config.author, plx - config.coverAuthorFontSize / 2, config.coverAuthorY, {
    size: config.coverAuthorFontSize,
    color: config.coverFontColor || "black",
    fontFamily: config.textFontFamily,
  });
}

/** 绘制内容页 */
function drawPage(ctx: CanvasRenderingContext2D, page: Page, bookConfig: BookConfig, canvasConfig: CanvasConfig) {
  // 背景色
  ctx.fillStyle = page.canvas.color || "white";
  ctx.fillRect(0, 0, page.canvas.width, page.canvas.height);

  // 边框
  drawBorders(ctx, page.canvas);

  // 鱼尾
  drawFishTails(ctx, page.canvas);

  // 版心标题
  if (page.title && page.canvas.leafCenterWidth > 0) {
    drawTitle(ctx, page.title, bookConfig, page);
  }

  // 版心页码
  drawPageNumber(ctx, page.pageNumber, bookConfig, page.canvas);

  // 字符
  for (const ch of page.characters) {
    if (ch.isCommentary) continue;
    drawCharacter(ctx, ch);
  }

  // 夹批
  for (const cm of page.commentaries) {
    drawCommentary(ctx, cm);
  }

  // 装饰
  for (const dec of page.decorations) {
    drawDecoration(ctx, dec);
  }
}

/** 绘制边框 */
function drawBorders(ctx: CanvasRenderingContext2D, canvas: CanvasConfig) {
  const { margins, outerBorder, innerBorder, leafCenterWidth, leafCol } = canvas;

  // 外框
  ctx.strokeStyle = outerBorder.color || "black";
  ctx.lineWidth = outerBorder.width || 10;
  const outerX = margins.left;
  const outerY = margins.top;
  const outerW = canvas.width - margins.left - margins.right;
  const outerH = canvas.height - margins.top - margins.bottom;
  ctx.strokeRect(outerX, outerY, outerW, outerH);

  // 内框
  ctx.strokeStyle = innerBorder.color || "black";
  ctx.lineWidth = innerBorder.width || 1;
  const iMargin = 5;
  ctx.strokeRect(
    margins.left + iMargin,
    margins.top + iMargin,
    canvas.width - margins.left - margins.right - iMargin * 2,
    canvas.height - margins.top - margins.bottom - iMargin * 2,
  );

  // 中缝线 (版心分隔)
  if (leafCenterWidth > 0) {
    const centerX = canvas.width / 2;
    ctx.strokeStyle = innerBorder.color || "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, margins.top);
    ctx.lineTo(centerX, canvas.height - margins.bottom);
    ctx.stroke();
  }

  // 分栏线 (column separator lines)
  // Formula from vintage.pl: x = ml + wd + clw * cid
  //   where wd = (cid > cln/2) ? (lcw - clw) : 0
  const usableWidth = canvas.width - margins.left - margins.right - leafCenterWidth;
  const colWidth = usableWidth / leafCol;
  const color = innerBorder.color || "black";
  ctx.strokeStyle = color;
  ctx.lineWidth = innerBorder.width || 1;
  for (let cid = 1; cid <= leafCol; cid++) {
    const wd = cid > leafCol / 2 ? leafCenterWidth - colWidth : 0;
    const x = margins.left + wd + colWidth * cid;
    ctx.beginPath();
    ctx.moveTo(x, margins.top);
    ctx.lineTo(x, canvas.height - margins.bottom);
    ctx.stroke();
  }

  // 多栏水平分隔线
  if (canvas.multiRows.enabled && canvas.multiRows.num > 1) {
    const rowHeight = (canvas.height - margins.top - margins.bottom) / canvas.multiRows.num;
    ctx.strokeStyle = canvas.multiRows.separatorColor || "#f5f5f5";
    ctx.lineWidth = canvas.multiRows.lineWidth || 2;
    for (let i = 1; i < canvas.multiRows.num; i++) {
      const y = margins.top + i * rowHeight;
      ctx.beginPath();
      ctx.moveTo(margins.left, y);
      ctx.lineTo(canvas.width - margins.right, y);
      ctx.stroke();
    }
  }
}

/** 绘制鱼尾 */
function drawFishTails(ctx: CanvasRenderingContext2D, canvas: CanvasConfig) {
  const { fishTail, margins } = canvas;
  const centerX = canvas.width / 2;
  const color = fishTail.top.color || "black";
  const halfColWidth = (canvas.width - margins.left - margins.right - canvas.leafCenterWidth) / (2 * canvas.leafCol);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  // 上鱼尾
  drawSingleFishTail(ctx, centerX, fishTail.top.y, fishTail.top.rectHeight, fishTail.top.triHeight, fishTail.top.lineWidth, 0);

  // 下鱼尾
  const btmDir = fishTail.bottom.direction || 1;
  drawSingleFishTail(ctx, centerX, fishTail.bottom.y, fishTail.bottom.rectHeight, fishTail.bottom.triHeight, fishTail.bottom.lineWidth, btmDir);
}

function drawSingleFishTail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  rectH: number,
  triH: number,
  lineWidth: number,
  direction: number,
) {
  // 鱼尾主体 (矩形)
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(cx - lineWidth / 2, y, lineWidth, rectH);

  // 三角形
  ctx.beginPath();
  const triDir = direction === 0 ? -1 : 1; // 0=向下, 1=向上
  ctx.moveTo(cx, y + rectH + triDir * triH);
  ctx.lineTo(cx - lineWidth * 3, y + rectH);
  ctx.lineTo(cx + lineWidth * 3, y + rectH);
  ctx.closePath();
  ctx.fill();
}

/** 绘制竖排文字 */
function drawVerticalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size: number; color: string; lineSpacing?: number; fontFamily?: string },
) {
  const { size, color, lineSpacing = 1.25, fontFamily = "serif" } = opts;
  const chars = [...text];

  ctx.fillStyle = color;
  ctx.font = `${size}px "${fontFamily}", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let i = 0; i < chars.length; i++) {
    const cy = y + i * size * lineSpacing;
    ctx.fillText(chars[i], x, cy);
  }
}

/** 绘制单个字符 (IR Character) */
function drawCharacter(ctx: CanvasRenderingContext2D, char: import("../types/layout").Character) {
  ctx.save();
  ctx.fillStyle = char.color || "black";
  const scale = char.scale || 1;
  const fontSize = char.fontSize * scale;
  ctx.font = `${fontSize}px "${char.fontFamily}", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (char.rotation) {
    ctx.translate(char.x, char.y);
    ctx.rotate((char.rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.fillText(char.char, 0, 0);
  } else {
    ctx.translate(char.x, char.y);
    ctx.scale(scale, scale);
    ctx.fillText(char.char, 0, 0);
  }

  ctx.restore();
}

/** 绘制夹批 (双列小字) */
function drawCommentary(ctx: CanvasRenderingContext2D, cm: import("../types/layout").Commentary) {
  ctx.save();
  ctx.fillStyle = cm.color || "black";
  ctx.font = `${cm.fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const chars = cm.chars;
  const colWidth = cm.fontSize * 0.6; // 半字符宽
  const rowStep = cm.rowHeight || cm.fontSize; // 用网格行高对齐正文，回退到 fontSize

  for (let i = 0; i < chars.length; i++) {
    const col = Math.floor(i / 2);
    const inCol = i % 2;
    const cx = cm.x + (inCol === 0 ? 0 : colWidth);
    const cy = cm.y + col * rowStep;
    ctx.fillText(chars[i], cx, cy);
  }

  ctx.restore();
}

/** 绘制装饰标记 */
function drawDecoration(ctx: CanvasRenderingContext2D, dec: import("../types/layout").Decoration) {
  ctx.save();
  ctx.strokeStyle = dec.color || "black";
  ctx.lineWidth = dec.strokeWidth || 2;
  ctx.lineCap = "round";

  const { x1, y1, x2, y2 } = dec.bounds;

  switch (dec.type) {
    case "wavyLine":
      // 正弦波浪线
      drawWavyLine(ctx, x1, y1, x2, y2, dec.strokeWidth);
      break;
    case "circleNote":
      // 圈注 — 逐字绘制小圆
      if (dec.charPositions && dec.charPositions.length > 0) {
        const r = dec.strokeWidth * 2;
        for (const cp of dec.charPositions) {
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(x1, y1, dec.strokeWidth * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case "lineNote":
      // 行注 — 逐字绘制竖线
      if (dec.charPositions && dec.charPositions.length > 0) {
        for (const cp of dec.charPositions) {
          const halfH = (dec.strokeWidth || 2) * 6;
          ctx.beginPath();
          ctx.moveTo(cp.x, cp.y - halfH);
          ctx.lineTo(cp.x, cp.y + halfH);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      break;
    case "pointNote":
      // 顿点注 (、) — 逐字绘制
      ctx.fillStyle = dec.color || "black";
      ctx.font = `${dec.strokeWidth * 4}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (dec.charPositions && dec.charPositions.length > 0) {
        for (const cp of dec.charPositions) {
          ctx.fillText("、", cp.x, cp.y);
        }
      } else {
        ctx.fillText("、", x1, y1);
      }
      break;
    case "rectFrame":
      // 圆角矩形框 (仿 vRain draw_rect0/1)
      {
        const radius = 8; // 圆角半径
        const w = x2 - x1;
        const h = y2 - y1;
        ctx.beginPath();
        ctx.moveTo(x1 + radius, y1);
        ctx.lineTo(x2 - radius, y1);
        ctx.arcTo(x2, y1, x2, y1 + radius, radius);
        ctx.lineTo(x2, y2 - radius);
        ctx.arcTo(x2, y2, x2 - radius, y2, radius);
        ctx.lineTo(x1 + radius, y2);
        ctx.arcTo(x1, y2, x1, y2 - radius, radius);
        ctx.lineTo(x1, y1 + radius);
        ctx.arcTo(x1, y1, x1 + radius, y1, radius);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    case "circleFrame":
      // 圆圈 — 逐字绘制
      if (dec.charPositions && dec.charPositions.length > 0) {
        for (const cp of dec.charPositions) {
          const r = (dec.strokeWidth || 2) * 3;
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        const radius = Math.max(x2 - x1, y2 - y1) / 2;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

/** 绘制正弦波浪线 (书名号装饰) */
function drawWavyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amplitude: number,
) {
  const steps = Math.max(1, Math.ceil(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)));
  const waveAmp = amplitude || 2;
  const waveLen = 10;

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseX = x1 + (x2 - x1) * t;
    const baseY = y1 + (y2 - y1) * t;
    const waveOffset = Math.sin((t * Math.PI * 2 * steps) / waveLen) * waveAmp;
    // 垂直于线条方向的偏移
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;
    const px = baseX + nx * waveOffset;
    const py = baseY + ny * waveOffset;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
}

/** 绘制版心标题 */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  bookConfig: BookConfig,
  page: Page,
) {
  const chars = [...title];
  const yStart = bookConfig.titleY;
  const fontSize = bookConfig.titleFontSize;
  const spacing = bookConfig.titleYDis;

  ctx.fillStyle = bookConfig.titleColor || "black";
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // 动态测量标题字符实际渲染宽度，居中于中缝区域
  // 中缝区域: [canvas.width/2 - leafCenterWidth/2, canvas.width/2 + leafCenterWidth/2]
  const gapLeft = page.canvas.width / 2 - page.canvas.leafCenterWidth / 2;
  const gapWidth = page.canvas.leafCenterWidth;
  const charWidth = ctx.measureText(chars[0] || "").width;
  const canvasCenterX = gapLeft + (gapWidth - charWidth) / 2 + charWidth / 2;

  for (let i = 0; i < chars.length; i++) {
    const cy = yStart + i * fontSize * spacing;
    ctx.fillText(chars[i], canvasCenterX, cy);
  }
}

/** 绘制版心页码 (中文数字竖排) */
function drawPageNumber(ctx: CanvasRenderingContext2D, pageNum: number, config: BookConfig, canvas: CanvasConfig) {
  const numStr = numToZhChinese(pageNum);
  const chars = [...numStr];
  const yStart = config.pagerY;
  const fontSize = config.pagerFontSize;
  // 居中于中缝区域
  const gapLeft = canvas.width / 2 - canvas.leafCenterWidth / 2;
  const gapWidth = canvas.leafCenterWidth;
  const charWidth = ctx.measureText(chars[0] || "").width;
  const centerX = gapLeft + (gapWidth - charWidth) / 2 + charWidth / 2;

  ctx.fillStyle = config.pagerColor || "black";
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let i = 0; i < chars.length; i++) {
    const cy = yStart + i * fontSize * 1.2;
    ctx.fillText(chars[i], centerX, cy);
  }
}

/** 阿拉伯数字转中文数字字符串 */
function numToZhChinese(n: number): string {
  if (n === 0) return "〇";
  if (n <= 9) return "一二三四五六七八九"[n - 1];
  if (n === 10) return "十";
  if (n < 20) return "十一十二十三十四十五十六十七十八十九"[n - 11 - 1] + "十"; // 简易
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    const tensStr = "一二三四五六七八九"[tens - 1];
    return ones === 0 ? tensStr + "十" : tensStr + "十" + "一二三四五六七八九"[ones - 1];
  }
  // 100+
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const hStr = "一二三四五六七八九"[hundreds - 1];
  return remainder === 0 ? hStr + "百" : hStr + "百" + numToZhChinese(remainder);
}
