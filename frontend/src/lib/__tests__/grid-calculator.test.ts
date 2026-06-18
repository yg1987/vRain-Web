import { describe, it, expect } from "vitest";
import { computeGridMetrics, generatePositionGrid, GridMetrics } from "../grid-calculator";
import type { CanvasConfig } from "../../types/layout";

describe("computeGridMetrics", () => {
  const standardCanvas: CanvasConfig = {
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

  it("计算标准模式网格尺寸", () => {
    const metrics = computeGridMetrics(standardCanvas, 30);

    // colWidth = (2480 - 50 - 50 - 120) / 24 = 2260 / 24 = 94.1667
    expect(metrics.colWidth).toBeCloseTo(94.1667, 2);
    // rowHeight = (1860 - 200 - 50) = 1610
    expect(metrics.rowHeight).toBe(1610);
    expect(metrics.colNum).toBe(24);
    expect(metrics.rowNum).toBe(30);
    expect(metrics.pageCharsNum).toBe(24 * 30); // 720
    expect(metrics.multirowsNum).toBe(1);
  });

  it("处理无中缝的画布", () => {
    const noCenterCanvas: CanvasConfig = {
      ...standardCanvas,
      leafCenterWidth: 0,
    };
    const metrics = computeGridMetrics(noCenterCanvas, 20);

    // colNum 继承 standardCanvas 的 24, rowNum=20
    // colWidth = (2480 - 50 - 50 - 0) / 24 = 99.1667
    expect(metrics.colWidth).toBeCloseTo(99.1667, 2);
    expect(metrics.colNum).toBe(24);
    expect(metrics.rowNum).toBe(20);
    expect(metrics.pageCharsNum).toBe(24 * 20); // 480
  });

  it("处理多栏模式", () => {
    const multirowCanvas: CanvasConfig = {
      ...standardCanvas,
      multiRows: { enabled: true, num: 5, lineWidth: 2, separatorColor: "#f5f5f5" },
    };

    const metrics = computeGridMetrics(multirowCanvas, 30);

    // pageCharsNum = col_num * row_num (不受 multirows 影响)
    expect(metrics.pageCharsNum).toBe(24 * 30);
    expect(metrics.multirowsNum).toBe(5);
  });
});

describe("generatePositionGrid", () => {
  const standardCanvas: CanvasConfig = {
    width: 2480,
    height: 1860,
    color: "white",
    margins: { top: 200, bottom: 50, left: 50, right: 50 },
    leafCol: 4,
    leafCenterWidth: 100,
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

  const grid: GridMetrics = {
    colWidth: 600,
    rowHeight: 20,
    colNum: 4,
    rowNum: 5,
    pageCharsNum: 20,
    multirowsNum: 1,
  };

  it("生成正确的坐标数量", () => {
    const result = generatePositionGrid(standardCanvas, grid, 5, 8);

    // 4 列 x 5 行 = 20 个坐标
    expect(result.textPositions).toHaveLength(20);
    expect(result.commentPositions).toHaveLength(20);
  });

  it("第一列在右侧", () => {
    const result = generatePositionGrid(standardCanvas, grid, 5, 8);

    // 列从右向左排列
    // 右半列 (col >= 2) 在右侧 (x 较大), 左半列 (col < 2) 在左侧 (x 较小)
    // 但 col 0 是左半列的第一个, 所以 x 较小
    const last = result.textPositions[19]; // col 3 (最右)
    const first = result.textPositions[0]; // col 0 (最左)
    expect(last.x).toBeGreaterThan(first.x);
  });

  it("行序从上到下", () => {
    const result = generatePositionGrid(standardCanvas, grid, 5, 8);

    // 同一列内, 行号越大 y 越大 (从上到下)
    const row0 = result.textPositions[0];
    const row1 = result.textPositions[4]; // col 0, row 1
    expect(row1.y).toBeGreaterThan(row0.y);
  });

  it("末字有纵向偏移", () => {
    const result = generatePositionGrid(standardCanvas, grid, 5, 8);

    // 使用实际 canvas 计算: rowHeight = 1610, rowNum = 5
    // 每行高度 = 1610 / 5 = 322
    const firstColFirstRow = result.textPositions[0];
    const firstColLastRow = result.textPositions[4];
    const yDiff = firstColLastRow.y - firstColFirstRow.y;
    // 行高 x 4 + rowDeltaY
    expect(yDiff).toBeCloseTo(322 * 4 + 8, 1);
  });
});
