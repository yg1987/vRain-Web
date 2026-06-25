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

  // 封面中间粗竖线
  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(plx, ch);
  ctx.lineTo(plx, 0);
  ctx.stroke();

  // 封面中间细竖线 (plx ± 50)
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plx - 50, ch);
  ctx.lineTo(plx - 50, 0);
  ctx.moveTo(plx + 50, ch);
  ctx.lineTo(plx + 50, 0);
  ctx.stroke();

  // 封面中间细横线 (从底部往上每 200px)
  ctx.lineWidth = 1;
  for (let lid = 0; lid <= ch / 200; lid++) {
    const ly = ch - 200 * lid;
    ctx.beginPath();
    ctx.moveTo(plx - 50, ly);
    ctx.lineTo(plx + 50, ly);
    ctx.stroke();
  }

  // 书名 — 左侧竖排 (从下往上: x = fontSize*1.5)
  const titleChars = [...config.title];
  const titleFS = config.coverTitleFontSize;
  for (let i = 0; i < titleChars.length; i++) {
    const fx = titleFS * 1.5;
    const fy = ch - config.coverTitleY - titleFS * i * 1.2;
    ctx.font = `${titleFS}px "${config.coverTitleFontFamily}", serif`;
    ctx.fillStyle = config.coverFontColor || "black";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(titleChars[i], fx, fy);
  }

  // 作者 — 左侧竖排 (x = fontSize*1.2)
  const authorChars = [...config.author];
  const authorFS = config.coverAuthorFontSize;
  for (let i = 0; i < authorChars.length; i++) {
    const fx = authorFS * 1.2;
    const fy = ch - config.coverAuthorY - authorFS * i * 1.2;
    ctx.font = `${authorFS}px "${config.textFontFamily}", serif`;
    ctx.fillStyle = config.coverFontColor || "black";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(authorChars[i], fx, fy);
  }
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

  // 批注背景色 — 按 cmBlockId 分块
  const cmChars = page.characters.filter(ch => ch.isCommentary && ch.backgroundColor && ch.cmBlockId != null);
  const blockMap = new Map<number, typeof cmChars>();
  for (const c of cmChars) {
    const list = blockMap.get(c.cmBlockId!) || [];
    list.push(c);
    blockMap.set(c.cmBlockId!, list);
  }
  for (const [, chars] of blockMap) {
    const minX = Math.min(...chars.map(c => c.x));
    const maxX = Math.max(...chars.map(c => c.x));
    const minY = Math.min(...chars.map(c => c.y));
    const maxY = Math.max(...chars.map(c => c.y));
    const pad = chars[0].fontSize * 0.55;
    ctx.save();
    ctx.fillStyle = chars[0].backgroundColor!;
    ctx.fillRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
    ctx.restore();
  }

  // 装饰的填充层 — 在文字之前绘制，避免遮盖文字
  const textFontSize = bookConfig.fonts[0]?.textPointSize ?? 60;
  for (const dec of page.decorations) {
    if (dec.fillColor) {
      drawDecorationFill(ctx, dec, textFontSize);
    }
  }

  // 字符 (含批注小字)
  for (const ch of page.characters) {
    drawCharacter(ctx, ch);
  }

  // 夹批 (保留兼容，新批注已通过 Character 流渲染)
  for (const cm of page.commentaries) {
    drawCommentary(ctx, cm);
  }

  // 装饰的描边层 — 在文字之后绘制
  for (const dec of page.decorations) {
    drawDecoration(ctx, dec, textFontSize);
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

/** 绘制装饰的填充层 (在文字之前绘制) */
function drawDecorationFill(ctx: CanvasRenderingContext2D, dec: import("../types/layout").Decoration, fontSize: number) {
  if (dec.type !== "circleFrame" && dec.type !== "rectFrame") return;
  if (!dec.fillColor) return;

  ctx.save();
  ctx.fillStyle = dec.fillColor;

  if (dec.type === "circleFrame" && dec.charPositions && dec.charPositions.length > 0) {
    for (const cp of dec.charPositions) {
      const r = (dec.strokeWidth || 2) * 3;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (dec.type === "rectFrame") {
    const { x1, y1, x2, y2 } = dec.bounds;
    const radius = 8;
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
    ctx.fill();
  }

  ctx.restore();
}

/** 绘制装饰标记 */
function drawDecoration(ctx: CanvasRenderingContext2D, dec: import("../types/layout").Decoration, fontSize: number) {
  ctx.save();
  ctx.strokeStyle = dec.color || "black";
  ctx.lineWidth = dec.strokeWidth || 2;
  ctx.lineCap = "round";

  const { x1, y1, x2, y2 } = dec.bounds;

  switch (dec.type) {
    case "wavyLine":
      // 书名波浪线 — 在文字右侧画竖波浪线 (resolveDecorationRanges 已按列分段)
      if (dec.charPositions && dec.charPositions.length > 0) {
        const charX = dec.charPositions[0].x;
        const waveX = charX + fontSize * 0.5; // 偏移量跟随字号缩放
        const topY = dec.charPositions[0].y;
        const bottomY = dec.charPositions[dec.charPositions.length - 1].y;
        drawWavyLine(ctx, waveX, topY, waveX, bottomY, dec.strokeWidth, fontSize);
      } else {
        drawWavyLine(ctx, x1, y1, x2, y2, dec.strokeWidth, fontSize);
      }
      break;
    case "circleNote":
      // 圈注 — 位置=字符中心 + 配置偏移 (offset 比例 × fontSize)
      if (dec.charPositions && dec.charPositions.length > 0) {
        const ox = dec.noteOffsetX ?? fontSize * 0.45;
        const oy = dec.noteOffsetY ?? 0;
        const r = dec.noteRadius ?? dec.strokeWidth * 2;
        for (const cp of dec.charPositions) {
          ctx.beginPath();
          ctx.arc(cp.x + ox, cp.y + oy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(x1, y1, dec.noteRadius ?? dec.strokeWidth * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case "lineNote":
      // 行注 — 从首字上方到末字下方画一条连续竖线
      if (dec.charPositions && dec.charPositions.length > 0) {
        const lox = dec.noteOffsetX ?? fontSize * 0.5;
        const loy = dec.noteOffsetY ?? 0;
        const ext = fontSize * 0.45; // 首末各延伸半字高
        const first = dec.charPositions[0];
        const last = dec.charPositions[dec.charPositions.length - 1];
        ctx.beginPath();
        ctx.moveTo(first.x + lox, first.y - ext + loy);
        ctx.lineTo(last.x + lox, last.y + ext + loy);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x1 + (dec.noteOffsetX ?? 0), y1 + (dec.noteOffsetY ?? 0));
        ctx.lineTo(x2 + (dec.noteOffsetX ?? 0), y2 + (dec.noteOffsetY ?? 0));
        ctx.stroke();
      }
      break;
    case "pointNote":
      // 顿点注 (、) — 位置=字符中心 + 配置偏移 (offset 比例 × fontSize)
      ctx.fillStyle = dec.color || "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const pSize = dec.noteSize ?? dec.strokeWidth * 4;
      const pox = dec.noteOffsetX ?? fontSize * 0.55;
      const poy = dec.noteOffsetY ?? 0;
      ctx.font = `${pSize}px serif`;
      if (dec.charPositions && dec.charPositions.length > 0) {
        for (const cp of dec.charPositions) {
          ctx.fillText("、", cp.x + pox, cp.y + poy);
        }
      } else {
        ctx.fillText("、", x1 + pox, y1 + poy);
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
      // 圆圈 — 逐字描边 (填充已在上层绘制)
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
  fontSize: number = 60,
) {
  // 纯竖线：x1==x2 时，len = |y2-y1|；y1==y2（单字）时用最小高度
  const dx = x2 - x1;
  const dy = y2 - y1;
  let len = Math.sqrt(dx * dx + dy * dy);
  let sy1 = y1, sy2 = y2;
  if (len < 1) {
    // 起点终点重合（单字），扩展为以该点为中心的短竖线
    const halfH = fontSize * 0.45;
    sy1 = y1 - halfH;
    sy2 = y1 + halfH;
    len = sy2 - sy1;
  }

  const steps = Math.max(2, Math.ceil(len / 3)); // 至少 2 步，~3px/步
  const waveAmp = (amplitude || 2) * 3;
  const waveLen = 10;
  // 垂线方向：竖线 (dx≈0) 水平摆动，横线 (dy≈0) 垂直摆动
  const isVertical = Math.abs(dx) < 1;
  const nx = isVertical ? 1 : -dy / (len || 1);
  const ny = isVertical ? 0 : dx / (len || 1);

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseX = x1;
    const baseY = sy1 + len * t;
    const waveOffset = Math.sin((t * Math.PI * 2 * steps) / waveLen) * waveAmp;
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
