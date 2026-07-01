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
  /** 该页所属的文本文件索引（0=序, 1=附录, 2+=章节） */
  fileIndex: number;
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
  /** 背景色 (批注支持) */
  backgroundColor?: string;
  /** 批注块 ID (同一【】的字符相同，用于背景分组) */
  cmBlockId?: number;
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
  /** 网格行高 — drawCommentary 用它对齐正文网格，取代 fontSize 垂直间距 */
  rowHeight: number;
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
  /** 填充色 (圆圈、圆角框支持) */
  fillColor?: string;
  /** 逐字坐标 (供逐字渲染的装饰类型使用) */
  charPositions?: Position[];
  /** 所属页面索引 (resolveDecorationRanges 自动填充) */
  pageIndex?: number;
  // 圈注/点注/行注 — 像素级偏移和尺寸 (由 resolveDecorationRanges 根据 fontSize 计算)
  noteOffsetX?: number;
  noteOffsetY?: number;
  noteRadius?: number;   // 圈注圆半径
  noteSize?: number;     // 顿点注字号
  noteHeight?: number;   // 行注半高
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
  coverTitleFontFamily: string;
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
  /** 无标点模式下要删除的标点列表 (管道分隔) — 独立于统一句号模式 */
  noPunctuationList: string;
  /** 统一句号模式下要转为句号的标点列表 (管道分隔) — 独立于无标点模式 */
  onlyPeriodList: string;
  rotatedPunctuation: string;
  rotatedPunctuationSize: number;
  rotatedPunctuationOffset: { x: number; y: number };
  commentNoPositionPunctuation: string;
  commentRotatedPunctuation: string;
  decorativeMarks: {
    commentary: { enabled: boolean; color: string; backgroundColor: string };
    bookLine: { enabled: boolean; width: number; color: string };
    rectFrame: { enabled: boolean; borderType: 0 | 1; borderColor: string; fillColor: string };
    circleFrame: { enabled: boolean; borderType: 0 | 1; borderColor: string; fillColor: string };
    textZoom: { enabled: boolean; zoomFactor: number; color: string };
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
