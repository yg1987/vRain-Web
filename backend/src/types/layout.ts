/**
 * 后端本地类型定义
 *
 * 与 frontend/src/types/layout.ts 保持一致，
 * 避免跨 workspace 导入导致的 rootDir 问题。
 */

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

export interface Commentary {
  x: number;
  y: number;
  chars: string[];
  fontSize: number;
  fontFamily: string;
  color: string;
  side: "left" | "right";
}

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

export type ControlMark =
  | { type: "pageBreak" }
  | { type: "halfPage" }
  | { type: "lastColumn" }
  | { type: "nextColumn" }
  | { type: "advanceRow" };

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
  fonts: FontEntry[];
  /** 正文字体 — 从 fonts 列表中选择一个字体 */
  textFontFamily: string;
  /** 批注字体 — 从 fonts 列表中选择一个字体 */
  commentFontFamily: string;
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
  simplifiedToTraditional: boolean;
}

export interface FontEntry {
  name: string;
  filename: string;
  textPointSize: number;
  commentPointSize: number;
  rotate: number;
}
