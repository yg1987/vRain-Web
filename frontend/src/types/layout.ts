/**
 * 布局引擎中间表示 (Intermediate Representation)
 * 同时被前端预览渲染器和后端 PDF 渲染器使用
 */

// ========================
// 页面
// ========================

export interface Page {
  pageNumber: number;
  canvas: CanvasConfig;
  title?: string;
  characters: Character[];
  commentaries: Commentary[];
  decorations: Decoration[];
  marks: ControlMark[];
  outlineTitle?: string;
  outlinePage?: number;
}

// ========================
// 字符
// ========================

export interface Character {
  x: number;
  y: number;
  char: string;
  fontFamily: string;
  fontSize: number;
  scale: number;
  rotation: number;
  color: string;
  isCommentary: boolean;
}

// ========================
// 夹批注释
// ========================

export interface Commentary {
  x: number;
  y: number;
  chars: string[];
  fontSize: number;
  fontFamily: string;
  color: string;
  side: "left" | "right";
}

// ========================
// 装饰
// ========================

export interface Decoration {
  type:
    | "wavyLine"
    | "rectFrame"
    | "circleFrame"
    | "circleNote"
    | "pointNote"
    | "lineNote";
  bounds: { x1: number; y1: number; x2: number; y2: number };
  strokeWidth: number;
  color: string;
}

// ========================
// 控制标记
// ========================

export type ControlMark =
  | { type: "pageBreak" }         // %
  | { type: "halfPage" }          // $
  | { type: "lastColumn" }        // &
  | { type: "nextColumn" }        // ^
  | { type: "advanceRow" };       // T

/** 带索引的控制标记 */
export type ControlMarkWithIndex = ControlMark & { index: number };

/** 分页标记枚举 */
export type PaginationMarker = "%" | "$" | "&" | "^" | "T";

// ========================
// 坐标位置
// ========================

export interface Position {
  x: number;
  y: number;
}

// ========================
// 批注条目 (用于分页)
// ========================

export interface CommentaryEntry {
  char: string;
  isCommentary: boolean;
}

// ========================
// 配置类型
// ========================

export interface CanvasConfig {
  width: number;
  height: number;
  color: string;
  backgroundImage?: string;
  margins: { top: number; bottom: number; left: number; right: number };
  leafCol: number;
  leafCenterWidth: number;
  multiRows: {
    enabled: boolean;
    num: number;
    lineWidth: number;
    separatorColor: string;
  };
  outerBorder: { width: number; color: string; hMargin: number; vMargin: number };
  innerBorder: { width: number; color: string };
  fishTail: {
    top: {
      y: number;
      color: string;
      rectHeight: number;
      triHeight: number;
      lineWidth: number;
    };
    bottom: {
      y: number;
      color: string;
      rectHeight: number;
      triHeight: number;
      lineWidth: number;
      direction: 0 | 1;
    };
    style: "triangle" | "curved";
    flowerImage?: string;
    decorativeLines: { color: string; width: number; margin: number };
  };
  logoText?: string;
  logoImage?: string;
  logoY: number;
  logoColor: string;
  logoFont: string;
  logoFontSize: number;
}

export interface BookConfig {
  /** 项目名称 (显示用) */
  name: string;
  title: string;
  author: string;
  canvasId: string;
  rowNum: number;
  rowDeltaY: number;
  /** 正文字体 — 从 fonts 列表中选择一个字体 */
  textFontFamily: string;
  /** 批注字体 — 从 fonts 列表中选择一个字体 */
  commentFontFamily: string;
  /** 已加载的字体列表 (上传/导入的字体) */
  fonts: FontEntry[];
  textFontColor: string;
  commentFontColor: string;
  coverTitleFontSize: number;
  coverTitleY: number;
  coverAuthorFontSize: number;
  coverAuthorY: number;
  coverFontColor: string;
  titleFontSize: number;
  titleColor: string;
  titleY: number;
  titleYDis: number;
  titlePostfix: string;
  titleDirectory: boolean;
  pagerFontSize: number;
  pagerColor: string;
  pagerY: number;
  punctuationReplacements: { from: string; to: string }[];
  punctuationDeletions: string;
  noPunctuationMode: boolean;
  onlyPeriodMode: boolean;
  noPositionPunctuation: string;
  noPositionPunctuationSize: number;
  noPositionPunctuationOffset: { x: number; y: number };
  rotatedPunctuation: string;
  rotatedPunctuationSize: number;
  rotatedPunctuationOffset: { x: number; y: number };
  commentNoPositionPunctuation: string;
  commentRotatedPunctuation: string;
  decorativeMarks: {
    bookLine: { enabled: boolean; width: number; color: string };
    rectFrame: { enabled: boolean; borderType: 0 | 1; borderColor: string; fillColor: string };
    circleFrame: { enabled: boolean; borderType: 0 | 1; borderColor: string; fillColor: string };
    textZoom: { enabled: boolean; zoomFactor: number };
    circleNote: { enabled: boolean; offset: { x: number; y: number }; radius: number; width: number; color: string };
    pointNote: { enabled: boolean; offset: { x: number; y: number }; size: number; color: string };
    lineNote: { enabled: boolean; offset: { x: number; y: number }; width: number; color: string };
  };
  fontMetricAdjust: boolean;
  fallbackBold: boolean;
  fallbackBoldStrokeWidth: number;

  // 简繁对照 (替代 vrain_mr.pl)
  /** 将简体中文正文自动转换为繁体中文渲染 (替代 vrain_mr.pl 的字体回退机制) */
  simplifiedToTraditional: boolean;
}

export interface FontEntry {
  name: string;
  filename: string;
  textPointSize: number;
  commentPointSize: number;
  rotate: number;
}
