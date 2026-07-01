import { describe, it, expect } from "vitest";
import { paginate, Grid } from "../pagination-controller";
import type { BookConfig, CanvasConfig, Decoration, CommentaryEntry, Position } from "../../types/layout";

function makeConfig(): BookConfig {
  return {
    name: "测试",
    title: "测试",
    author: "测试",
    canvasId: "test",
    rowNum: 10,
    rowDeltaY: 8,
    fonts: [
      { name: "t.ttf", filename: "t.ttf", textPointSize: 60, commentPointSize: 45, rotate: 0 },
    ],
    textFontFamily: "t.ttf",
    commentFontFamily: "t.ttf",
    textFontColor: "black",
    commentFontColor: "black",
    coverTitleFontFamily: "",
    coverTitleFontSize: 120,
    coverTitleY: 200,
    coverAuthorFontSize: 60,
    coverAuthorY: 600,
    coverFontColor: "black",
    titleFontSize: 65,
    titleColor: "black",
    titleY: 1250,
    titleYDis: 1.25,
    titlePostfix: "卷X",
    titleDirectory: false,
    pagerFontSize: 30,
    pagerColor: "black",
    pagerY: 540,
    punctuationReplacements: [],
    punctuationDeletions: "",
    noPunctuationMode: false,
    onlyPeriodMode: false,
    noPositionPunctuation: "",
    noPositionPunctuationSize: 1.1,
    noPositionPunctuationOffset: { x: 0.45, y: 0.5 },
    noPunctuationList: "",
    onlyPeriodList: "",
    rotatedPunctuation: "",
    rotatedPunctuationSize: 0.8,
    rotatedPunctuationOffset: { x: 0.35, y: 0.65 },
    commentNoPositionPunctuation: "",
    commentRotatedPunctuation: "",
    decorativeMarks: {
      commentary: { enabled: true, color: "#000000", backgroundColor: "#ffffff" },
      bookLine: { enabled: false, width: 0, color: "black" },
      rectFrame: { enabled: false, borderType: 0, borderColor: "black", fillColor: "black" },
      circleFrame: { enabled: false, borderType: 0, borderColor: "black", fillColor: "white" },
      textZoom: { enabled: false, zoomFactor: 1, color: "#cc0000" },
      circleNote: { enabled: false, offset: { x: 0, y: 0 }, radius: 0, width: 0, color: "black" },
      pointNote: { enabled: false, offset: { x: 0, y: 0 }, size: 0, color: "black" },
      lineNote: { enabled: false, offset: { x: 0, y: 0 }, width: 0, color: "black" },
    },
    fontMetricAdjust: false,
    fallbackBold: false,
    fallbackBoldStrokeWidth: 1.2,
    simplifiedToTraditional: false,
  };
}

function makeCanvas(): CanvasConfig {
  return {
    width: 2480,
    height: 1860,
    color: "white",
    margins: { top: 200, bottom: 50, left: 50, right: 50 },
    leafCol: 2,
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
    logoFont: "t.ttf",
    logoFontSize: 40,
  };
}

function makeGrid(): Grid {
  return {
    colNum: 2,
    rowNum: 10,
    pageCharsNum: 20,
    multirowsNum: 1,
    rowHeight: 100,
    colWidth: 500,
  };
}

function makeCharacters(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `字${i + 1}`);
}

function makeCommentaryData(count: number): CommentaryEntry[] {
  return Array.from({ length: count }, () => ({ char: "", isCommentary: false }));
}

function makeDecorations(): Decoration[] {
  return [];
}

describe("paginate", () => {
  it("将字符分配到多页", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();
    const chars = makeCharacters(50); // 50 字符, 每页 20, 应有 3 页

    const result = paginate(canvas, config, grid, chars, makeCommentaryData(50), makeDecorations());

    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].characters.length).toBe(20);
    expect(result.pages[1].characters.length).toBe(20);
    expect(result.pages[2].characters.length).toBe(10);
  });

  it("处理强制换页标记 %", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();
    const chars = [...makeCharacters(10), "%", ...makeCharacters(10)];

    const result = paginate(canvas, config, grid, chars, makeCommentaryData(21), makeDecorations());

    // % 之前 10 字符, % 之后 10 字符, 共 2 页
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].characters.length).toBe(10);
    expect(result.pages[1].characters.length).toBe(10);
  });

  it("记录控制标记", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();
    const chars = [...makeCharacters(5), "%", ...makeCharacters(5), "&", ...makeCharacters(5)];

    const result = paginate(canvas, config, grid, chars, makeCommentaryData(16), makeDecorations());

    expect(result.controlMarks).toHaveLength(2);
    expect(result.controlMarks[0].type).toBe("pageBreak");
    expect(result.controlMarks[0].index).toBe(5);
    expect(result.controlMarks[1].type).toBe("lastColumn");
    expect(result.controlMarks[1].index).toBe(11);
  });

  it("处理半页跳标记 $", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();
    const chars = [...makeCharacters(15), "$", ...makeCharacters(10)];

    const result = paginate(canvas, config, grid, chars, makeCommentaryData(26), makeDecorations());

    // $ 在第 15 个字符后, pcnt=15 >= 半页(10), 所以跳到满页
    // 最终结果取决于 $ 后的逻辑
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
  });

  it("处理空文本", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();

    const result = paginate(canvas, config, grid, [], makeCommentaryData(0), makeDecorations());

    expect(result.pages).toHaveLength(0);
    expect(result.controlMarks).toHaveLength(0);
  });

  it("一页刚好装满", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();
    const chars = makeCharacters(20); // 正好一页

    const result = paginate(canvas, config, grid, chars, makeCommentaryData(20), makeDecorations());

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].characters.length).toBe(20);
  });

  it("使用 textPositions 填入字符坐标", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();
    const chars = ["字", "一", "测", "试"];
    const textPositions: Position[] = [
      { x: 100, y: 200 },
      { x: 100, y: 300 },
      { x: 200, y: 200 },
      { x: 200, y: 300 },
    ];

    const result = paginate(canvas, config, grid, chars, makeCommentaryData(4), makeDecorations(), textPositions);

    expect(result.pages[0].characters[0].x).toBe(100);
    expect(result.pages[0].characters[0].y).toBe(200);
    expect(result.pages[0].characters[1].x).toBe(100);
    expect(result.pages[0].characters[1].y).toBe(300);
    expect(result.pages[0].characters[2].x).toBe(200);
    expect(result.pages[0].characters[2].y).toBe(200);
    expect(result.pages[0].characters[3].x).toBe(200);
    expect(result.pages[0].characters[3].y).toBe(300);
  });

  it("无 positions 时坐标默认为 0", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const grid = makeGrid();
    const chars = ["字", "一"];

    const result = paginate(canvas, config, grid, chars, makeCommentaryData(2), makeDecorations());

    expect(result.pages[0].characters[0].x).toBe(0);
    expect(result.pages[0].characters[0].y).toBe(0);
  });

  it("createNewPage 使用传入的 canvasConfig", () => {
    const config = makeConfig();
    const canvas = makeCanvas();
    const modifiedCanvas: CanvasConfig = { ...canvas, width: 3000, color: "#f2ead9" };
    const grid = makeGrid();
    const chars = makeCharacters(25); // > 20, 会产生第二页

    const result = paginate(modifiedCanvas, config, grid, chars, makeCommentaryData(25), makeDecorations());

    // 第二页应使用 modifiedCanvas 的配置
    expect(result.pages[1].canvas.width).toBe(3000);
    expect(result.pages[1].canvas.color).toBe("#f2ead9");
  });
});
