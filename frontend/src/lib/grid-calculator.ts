/**
 * 网格计算器 — 将原 vrain.pl 中的布局网格计算逻辑移植为 TypeScript
 *
 * 原代码: vrain.pl lines 250-318
 *
 * 核心功能:
 *   1. 计算列宽和行高
 *   2. 生成正文字符坐标数组 @pos_l
 *   3. 生成夹批坐标数组 @pos_r
 *   4. 处理版心中缝偏移
 *   5. 处理多栏布局模式
 */

import type { CanvasConfig, Page } from "../types/layout";

/** 单个坐标点 */
export interface Point {
  x: number;
  y: number;
}

/** 网格单元格信息 */
export interface CellInfo {
  x: number;
  y: number;
  colIndex: number;
  rowIndex: number;
  commentX: number;
  commentY: number;
  rowIndexInBand?: number;
}

/**
 * 计算网格尺寸
 */
export interface GridMetrics {
  colWidth: number;
  rowHeight: number;
  colNum: number;          // 实际列数
  rowNum: number;          // 每列行数
  pageCharsNum: number;    // 每页字符容量
  multirowsNum: number;    // 多栏块数 (1=单栏)
}

export function computeGridMetrics(
  canvas: CanvasConfig,
  rowNum: number,
  multirowsHorizontalLayout?: 0 | 1 | 2
): GridMetrics {
  const { colWidth, rowHeight } = computeDimensions(canvas);

  const colNum = canvas.leafCol;
  const multirowsNum = canvas.multiRows.enabled ? canvas.multiRows.num : 1;
  const effectiveRowNum = multirowsNum > 1 ? rowNum / multirowsNum : rowNum;

  // 页容量 = col_num * row_num (标准) 或 col_num * row_num * multirows_num
  const pageCharsNum = colNum * rowNum;

  return {
    colWidth,
    rowHeight,
    colNum,
    rowNum: effectiveRowNum,
    pageCharsNum,
    multirowsNum,
  };
}

/**
 * 计算列宽和行高
 * col_width = (canvas_width - ml - mr - leaf_center_width) / col_num
 * row_height = (canvas_height - mt - mb) / row_num
 */
function computeDimensions(canvas: CanvasConfig): {
  colWidth: number;
  rowHeight: number;
} {
  const { colWidth, rowHeight } = computeStandardDimensions(canvas);
  return { colWidth, rowHeight };
}

/**
 * 标准模式维度计算
 */
function computeStandardDimensions(canvas: CanvasConfig): {
  colWidth: number;
  rowHeight: number;
} {
  const contentWidth =
    canvas.width - canvas.margins.left - canvas.margins.right - canvas.leafCenterWidth;
  const contentHeight = canvas.height - canvas.margins.top - canvas.margins.bottom;
  const colNum = canvas.leafCol;

  return {
    colWidth: contentWidth / colNum,
    rowHeight: contentHeight,
  };
}

/**
 * 生成页面字符坐标
 */
export function generatePositionGrid(
  canvas: CanvasConfig,
  grid: GridMetrics,
  rowNum: number,
  rowDeltaY: number
): {
  textPositions: Point[];
  commentPositions: Point[];
} {
  const { colWidth, colNum, multirowsNum } = grid;
  const { leafCol } = canvas;
  const isMultirows = canvas.multiRows.enabled;
  const effectiveRowNum = multirowsNum > 1 ? rowNum / multirowsNum : rowNum;
  const contentHeight = canvas.height - canvas.margins.top - canvas.margins.bottom;
  const rowHeight = contentHeight / rowNum;

  const textPositions: Point[] = [];
  const commentPositions: Point[] = [];

  if (!isMultirows) {
    // 标准模式: 右向左逐列
    for (let col = 0; col < leafCol; col++) {
      for (let row = 0; row < rowNum; row++) {
        const pt = computeStandardPosition(canvas, col, row, colWidth, rowHeight, rowNum, rowDeltaY);
        const commentPt = computeCommentPosition(canvas, col, row, colWidth, rowHeight, rowNum);
        textPositions.push(pt);
        commentPositions.push(commentPt);
      }
    }
  } else {
    // 多栏模式: 按水平条带划分
    const rowsPerBand = rowNum / multirowsNum;
    for (let band = 0; band < multirowsNum; band++) {
      for (let col = 0; col < leafCol; col++) {
        for (let rowInBand = 0; rowInBand < rowsPerBand; rowInBand++) {
          const globalRow = band * rowsPerBand + rowInBand;
          const pt = computeMultirowPosition(canvas, col, globalRow, colWidth, rowNum, rowHeight, rowDeltaY, band, rowInBand);
          commentPositions.push(computeCommentPosition(canvas, col, globalRow, colWidth, rowNum, rowHeight));
          textPositions.push(pt);
        }
      }
    }
  }

  return { textPositions, commentPositions };
}

/**
 * 标准模式: 计算单个字符位置
 * 左半列使用左边距公式, 右半列额外偏移 leaf_center_width
 */
function computeStandardPosition(
  canvas: CanvasConfig,
  colIndex: number,
  rowIndex: number,
  colWidth: number,
  rowHeight: number,
  rowNum: number,
  rowDeltaY: number
): Point {
  const isLeftHalf = colIndex < Math.floor(canvas.leafCol / 2);

  let x: number;
  if (isLeftHalf) {
    x = canvas.width - canvas.margins.right - colWidth * (canvas.leafCol - colIndex) + colWidth / 2;
  } else {
    x =
      canvas.width -
      canvas.margins.right -
      colWidth * (canvas.leafCol - colIndex) +
      colWidth / 2 -
      canvas.leafCenterWidth;
  }

  // 从顶部向下排列
  let y = canvas.margins.top + rowHeight * rowIndex + rowHeight / 2;

  // 最后一字符纵向偏移
  if (rowIndex === rowNum - 1) {
    y += rowDeltaY;
  }

  return { x, y };
}

/**
 * 多栏模式: 计算字符位置
 */
function computeMultirowPosition(
  canvas: CanvasConfig,
  colIndex: number,
  rowIndex: number,
  colWidth: number,
  rowNum: number,
  rowHeight: number,
  rowDeltaY: number,
  bandIndex: number,
  rowInBand: number
): Point {
  const isLeftHalf = colIndex < Math.floor(canvas.leafCol / 2);

  let x: number;
  if (isLeftHalf) {
    x = canvas.width - canvas.margins.right - colWidth * (canvas.leafCol - colIndex) + colWidth / 2;
  } else {
    x =
      canvas.width -
      canvas.margins.right -
      colWidth * (canvas.leafCol - colIndex) +
      colWidth / 2 -
      canvas.leafCenterWidth;
  }

  // 多栏模式下按水平条带计算 Y 坐标
  const bandHeight = (canvas.height - canvas.margins.top - canvas.margins.bottom);
  const multirowsNum = canvas.multiRows.num || 1;
  const rowsPerBand = rowNum / multirowsNum;
  const rowH = bandHeight / rowNum; // 每行高度

  // bandIndex 决定条带起始位置，rowInBand 决定条带内行位置
  let y = canvas.margins.top + bandIndex * rowsPerBand * rowH + rowInBand * rowH + rowH / 2;

  // 条带内最后一行偏移
  if (rowInBand === rowsPerBand - 1) {
    y += rowDeltaY;
  }

  return { x, y };
}

/**
 * 计算夹批位置 (半字符宽, 紧邻正文右侧)
 */
function computeCommentPosition(
  canvas: CanvasConfig,
  colIndex: number,
  rowIndex: number,
  colWidth: number,
  rowNum: number,
  rowHeight: number
): Point {
  const isLeftHalf = colIndex < Math.floor(canvas.leafCol / 2);

  let x: number;
  if (isLeftHalf) {
    x = canvas.width - canvas.margins.right - colWidth * (canvas.leafCol - colIndex);
  } else {
    x =
      canvas.width -
      canvas.margins.right -
      colWidth * (canvas.leafCol - colIndex) -
      canvas.leafCenterWidth;
  }

  const y = canvas.margins.top + rowHeight * rowIndex + rowHeight / 2;

  return { x, y };
}

/**
 * 将坐标数组转换为 Page IR
 */
export function positionsToPages(
  canvas: CanvasConfig,
  grid: GridMetrics,
  bookTitle: string,
  textPositions: Point[],
  commentPositions: Point[]
): Page[] {
  const pages: Page[] = [];
  let pageCount = 0;

  for (let i = 0; i < textPositions.length; i += grid.pageCharsNum) {
    const pageNum = pageCount + 1;
    const slice = textPositions.slice(i, i + grid.pageCharsNum);
    const commentSlice = commentPositions.slice(i, i + grid.pageCharsNum);

    pages.push({
      pageNumber: pageNum,
      canvas,
      title: `${bookTitle} 卷${pageNum}`,
      characters: [],  // 填充在 TextParser 之后
      commentaries: [],
      decorations: [],
      marks: [],
    });

    pageCount++;
  }

  return pages;
}
