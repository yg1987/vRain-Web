import { describe, it, expect } from "vitest";
import {
  extractDecorationRanges,
  resolveDecorationRanges,
  assignDecorationsToPages,
} from "../markup-parser";
import type { BookConfig, Page, CanvasConfig, Decoration } from "../../types/layout";

function makeConfig(): BookConfig {
  return {
    name: "测试",
    title: "测试",
    author: "作者",
    canvasId: "test",
    rowNum: 30,
    rowDeltaY: 8,
    fonts: [{ name: "t.ttf", filename: "t.ttf", textPointSize: 60, commentPointSize: 45, rotate: 0 }],
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
    rotatedPunctuation: "",
    rotatedPunctuationSize: 0.8,
    rotatedPunctuationOffset: { x: 0.35, y: 0.65 },
    commentNoPositionPunctuation: "",
    commentRotatedPunctuation: "",
    decorativeMarks: {
      bookLine: { enabled: true, width: 2, color: "black" },
      rectFrame: { enabled: true, borderType: 1, borderColor: "black", fillColor: "black" },
      circleFrame: { enabled: true, borderType: 1, borderColor: "black", fillColor: "white" },
      textZoom: { enabled: true, zoomFactor: 1.2, color: "#cc0000" },
      circleNote: { enabled: true, offset: { x: 0.25, y: 0.3 }, radius: 0.15, width: 6, color: "#874434" },
      pointNote: { enabled: true, offset: { x: -0.25, y: 0 }, size: 1.2, color: "#874434" },
      lineNote: { enabled: true, offset: { x: 0.4, y: -0.25 }, width: 7, color: "#874434" },
    },
    fontMetricAdjust: false,
    fallbackBold: false,
    fallbackBoldStrokeWidth: 1.2,
    simplifiedToTraditional: false,
  };
}

describe("extractDecorationRanges", () => {
  it("剥离书名号线标记", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("前面《论语》后面", config, 0);
    expect(cleanText).toBe("前面论语后面");
    expect(ranges).toHaveLength(1);
    expect(ranges[0].type).toBe("wavyLine");
    expect(ranges[0].startCharIndex).toBe(2);
    expect(ranges[0].endCharIndex).toBe(4);
  });

  it("剥离圆角框标记", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("正文〔注释〕正文", config, 0);
    expect(cleanText).toBe("正文注释正文");
    expect(ranges[0].type).toBe("rectFrame");
  });

  it("剥离圆圈标记", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("正文〈重点〉正文", config, 0);
    expect(cleanText).toBe("正文重点正文");
    expect(ranges[0].type).toBe("circleFrame");
  });

  it("剥离圈注标记", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("正文｛注｝正文", config, 0);
    expect(cleanText).toBe("正文注正文");
    expect(ranges[0].type).toBe("circleNote");
  });

  it("剥离顿点注标记", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("正文＜注＞正文", config, 0);
    expect(cleanText).toBe("正文注正文");
    expect(ranges[0].type).toBe("pointNote");
  });

  it("剥离行注标记", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("正文［注］正文", config, 0);
    expect(cleanText).toBe("正文注正文");
    expect(ranges[0].type).toBe("lineNote");
  });

  it("字体放大标记只剥离符号保留正文", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("正文（放大）正文", config, 0);
    expect(cleanText).toBe("正文放大正文");
    // textZoom 不生成 Decoration
    expect(ranges).toHaveLength(0);
  });

  it("禁用状态下的标记保留原样", () => {
    const config = makeConfig();
    config.decorativeMarks.bookLine.enabled = false;
    config.decorativeMarks.rectFrame.enabled = false;
    const { cleanText, ranges } = extractDecorationRanges("《书名》〔框〕", config, 0);
    // 禁用时不处理，保留原字符
    expect(cleanText).toBe("《书名》〔框〕");
    expect(ranges).toHaveLength(0);
  });

  it("未闭合标记保留原样", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("《未闭合文本", config, 0);
    expect(cleanText).toBe("《未闭合文本");
    expect(ranges).toHaveLength(0);
  });

  it("baseOffset 正确偏移字符索引", () => {
    const config = makeConfig();
    // baseOffset=5 表示前面已有 5 个字符
    const { cleanText, ranges } = extractDecorationRanges("《论语》", config, 5);
    expect(cleanText).toBe("论语");
    expect(ranges[0].startCharIndex).toBe(5);
    expect(ranges[0].endCharIndex).toBe(7);
  });

  it("多个装饰标记共存", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("《书名》和〈圈〉和〔框〕", config, 0);
    expect(cleanText).toBe("书名和圈和框");
    expect(ranges).toHaveLength(3);
    expect(ranges[0].type).toBe("wavyLine");
    expect(ranges[1].type).toBe("circleFrame");
    expect(ranges[2].type).toBe("rectFrame");
  });

  it("无装饰标记时不产生范围", () => {
    const config = makeConfig();
    const { cleanText, ranges } = extractDecorationRanges("纯文本没有装饰标记", config, 0);
    expect(cleanText).toBe("纯文本没有装饰标记");
    expect(ranges).toHaveLength(0);
  });
});

describe("resolveDecorationRanges", () => {
  it("空范围返回空数组", () => {
    const pages: Page[] = [];
    const result = resolveDecorationRanges(pages, [], makeConfig());
    expect(result).toHaveLength(0);
  });

  it("根据字符坐标计算包围盒", () => {
    const pages: Page[] = [
      {
        pageNumber: 1,
        canvas: {} as CanvasConfig,
        characters: [
          { x: 100, y: 200, char: "测", fontFamily: "serif", fontSize: 60, scale: 1, rotation: 0, color: "black", isCommentary: false },
          { x: 100, y: 280, char: "试", fontFamily: "serif", fontSize: 60, scale: 1, rotation: 0, color: "black", isCommentary: false },
        ],
        commentaries: [],
        decorations: [],
        marks: [],
        fileIndex: 0,
      },
    ];

    const ranges = [
      { type: "wavyLine" as const, startCharIndex: 0, endCharIndex: 2, strokeWidth: 2, color: "black" },
    ];

    const result = resolveDecorationRanges(pages, ranges, makeConfig());
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("wavyLine");
    expect(result[0].bounds.x1).toBeLessThanOrEqual(100); // padding
    expect(result[0].bounds.x2).toBeGreaterThanOrEqual(100);
    expect(result[0].bounds.y1).toBeLessThanOrEqual(200);
    expect(result[0].bounds.y2).toBeGreaterThanOrEqual(280);
  });
});

describe("assignDecorationsToPages", () => {
  it("将装饰分配到对应页面", () => {
    const makeChar = (x: number, y: number, c: string) => ({
      x, y, char: c, fontFamily: "serif", fontSize: 60, scale: 1, rotation: 0, color: "black", isCommentary: false,
    });

    const pages: Page[] = [
      {
        pageNumber: 1,
        canvas: {} as CanvasConfig,
        characters: [makeChar(100, 200, "字"), makeChar(100, 280, "一")],
        commentaries: [],
        decorations: [],
        marks: [],
        fileIndex: 0,
      },
      {
        pageNumber: 2,
        canvas: {} as CanvasConfig,
        characters: [makeChar(200, 200, "字"), makeChar(200, 280, "二")],
        commentaries: [],
        decorations: [],
        marks: [],
        fileIndex: 0,
      },
    ];

    const ranges = [
      { type: "wavyLine" as const, startCharIndex: 0, endCharIndex: 2, strokeWidth: 2, color: "black" },
      { type: "rectFrame" as const, startCharIndex: 2, endCharIndex: 4, strokeWidth: 1, color: "black" },
    ];

    const decorations: Decoration[] = [
      { type: "wavyLine", bounds: { x1: 85, y1: 185, x2: 115, y2: 295 }, strokeWidth: 2, color: "black", pageIndex: 0 },
      { type: "rectFrame", bounds: { x1: 185, y1: 185, x2: 215, y2: 295 }, strokeWidth: 1, color: "black", pageIndex: 1 },
    ];

    const result = assignDecorationsToPages(pages, decorations, ranges);
    expect(result[0].decorations).toHaveLength(1);
    expect(result[0].decorations[0].type).toBe("wavyLine");
    expect(result[1].decorations).toHaveLength(1);
    expect(result[1].decorations[0].type).toBe("rectFrame");
  });
});
