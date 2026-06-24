import { describe, it, expect } from "vitest";
import {
  preprocessLine,
  parseTextFile,
  calculatePadding,
} from "../text-parser";
import type { BookConfig } from "../../types/layout";

function makeConfig(partial: Partial<BookConfig>): BookConfig {
  return {
    name: "测试",
    title: "测试",
    author: "测试作者",
    canvasId: "test",
    rowNum: 30,
    rowDeltaY: 8,
    fonts: [
      { name: "test.ttf", filename: "test.ttf", textPointSize: 60, commentPointSize: 45, rotate: 0 },
    ],
    textFontFamily: "test.ttf",
    commentFontFamily: "test.ttf",
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
    punctuationReplacements: [
      { from: ",", to: "，" },
      { from: ".", to: "。" },
      { from: ":", to: "：" },
    ],
    punctuationDeletions: "．|－| ",
    noPunctuationMode: false,
    onlyPeriodMode: false,
    noPositionPunctuation: "、|，|。",
    noPositionPunctuationSize: 1.1,
    noPositionPunctuationOffset: { x: 0.45, y: 0.5 },
    rotatedPunctuation: "「」『』",
    rotatedPunctuationSize: 0.8,
    rotatedPunctuationOffset: { x: 0.35, y: 0.65 },
    commentNoPositionPunctuation: "、|，|。",
    commentRotatedPunctuation: "「」『」…",
    decorativeMarks: {
      bookLine: { enabled: true, width: 2, color: "black" },
      rectFrame: { enabled: true, borderType: 1, borderColor: "black", fillColor: "black" },
      circleFrame: { enabled: false, borderType: 1, borderColor: "black", fillColor: "white" },
      textZoom: { enabled: true, zoomFactor: 1.1, color: "#cc0000" },
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

describe("preprocessLine", () => {
  it("应用标点替换", async () => {
    const config = makeConfig({});
    const result = await preprocessLine("Hello, world.", config);
    expect(result.text).toBe("Hello， world。");
  });

  it("替换阿拉伯数字为中文", async () => {
    const config = makeConfig({});
    const result = await preprocessLine("共有123人", config);
    expect(result.text).toBe("共有一二三人");
  });

  it("删除指定标点", async () => {
    const config = makeConfig({ punctuationDeletions: "－" });
    const result = await preprocessLine("这是－一个测试", config);
    expect(result.text).toBe("这是一个测试");
  });

  it("转换 @ 为空格", async () => {
    const config = makeConfig({});
    const result = await preprocessLine("标题@@章节@@内容", config);
    expect(result.text).toBe("标题  章节  内容");
  });

  it("提取夹批", async () => {
    const config = makeConfig({});
    const result = await preprocessLine("正文【这是一条注释】继续正文", config);
    expect(result.text).toBe("正文继续正文");
    expect(result.commentaries).toEqual(["这是一条注释"]);
  });

  it("多个夹批", async () => {
    const config = makeConfig({});
    const result = await preprocessLine("【注释一】正文【注释二】", config);
    expect(result.text).toBe("正文");
    expect(result.commentaries).toEqual(["注释一", "注释二"]);
  });

  it("处理段落开头 T 标记", async () => {
    const config = makeConfig({});
    const result = await preprocessLine("T下一字符", config);
    expect(result.text).toBe("一字符");
  });

  it("无标点模式", async () => {
    const config = makeConfig({
      noPunctuationMode: true,
      noPositionPunctuation: "",
    });
    const result = await preprocessLine("这是一个测试", config);
    expect(result.text).toBe("这是一个测试");
  });

  it("统一句号模式", async () => {
    const config = makeConfig({
      onlyPeriodMode: true,
      noPositionPunctuation: "",
    });
    const result = await preprocessLine("这是一个测试", config);
    expect(result.text).toBe("这是一个测试");
  });
});

describe("parseTextFile", () => {
  it("解析基本文本文件", async () => {
    const config = makeConfig({});
    const lines = [
      "第一章 姜贞毅先生传",
      "",
      "姜贞毅先生名埈，字正心。",
      "號貞毅，江南華亭人。",
      "",
      "唐王即位福州，授御史。",
    ];
    const result = await parseTextFile("01.txt", lines, config);

    expect(result.filename).toBe("01.txt");
    expect(result.paragraphs.length).toBeGreaterThanOrEqual(3);
    expect(result.paragraphs[0].text).toBe("第一章 姜贞毅先生传");
    expect(result.paragraphs[0].commentaries).toEqual([]);
    expect(result.paragraphs[1].text).toContain("名埈");
  });

  it("段落按空行分隔", async () => {
    const config = makeConfig({});
    const lines = ["段落一", "", "段落二", "", "段落三"];
    const result = await parseTextFile("test.txt", lines, config);
    expect(result.paragraphs).toHaveLength(3);
  });

  it("空行和连续空行不产生空段落", async () => {
    const config = makeConfig({});
    const lines = ["", "", "内容", "", "", ""];
    const result = await parseTextFile("test.txt", lines, config);
    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].text).toBe("内容");
  });
});

describe("calculatePadding", () => {
  it("计算填充空格", () => {
    const paragraphs = [
      { text: "hello", paddingSpaces: 0 },
      { text: "world!", paddingSpaces: 0 },
    ];

    const result = calculatePadding(paragraphs as any);
    expect(result).toBeDefined();
  });
});
