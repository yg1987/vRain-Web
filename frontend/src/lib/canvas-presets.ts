/**
 * 画布预设 — 与原版 canvas/*.cfg 对应的预设配置
 *
 * 可在 ConfigEditor 中选择预设，自动加载对应的画布参数。
 */

import type { CanvasConfig } from "../types/layout";

// ============================================================================
// 预设映射表
// ============================================================================

const PRESETS: Record<string, CanvasConfig> = {
  /** 24 栏朱丝栏 (经典刻本风格) */
  "24_paper": {
    width: 2480,
    height: 1860,
    color: "#f5f0e8",
    margins: { top: 200, bottom: 50, left: 50, right: 50 },
    leafCol: 24,
    leafCenterWidth: 120,
    multiRows: { enabled: false, num: 1, lineWidth: 0, separatorColor: "#f5f5f5" },
    outerBorder: { width: 10, color: "#8b4513", hMargin: 5, vMargin: 5 },
    innerBorder: { width: 1, color: "#8b4513" },
    fishTail: {
      top: { y: 450, color: "#8b4513", rectHeight: 50, triHeight: 30, lineWidth: 15 },
      bottom: { y: 1550, color: "#8b4513", rectHeight: 50, triHeight: 30, lineWidth: 15, direction: 1 },
      style: "triangle",
      decorativeLines: { color: "#8b4513", width: 1, margin: 5 },
    },
    logoY: 1680,
    logoColor: "#8b4513",
    logoFont: "qiji-combo.ttf",
    logoFontSize: 40,
  },

  /** 24 栏黑线空白 (默认简约风格) */
  "24_black_blank": {
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
  },

  /** 18 栏红格 */
  "18_red": {
    width: 2480,
    height: 1860,
    color: "#faf5ee",
    margins: { top: 200, bottom: 50, left: 50, right: 50 },
    leafCol: 18,
    leafCenterWidth: 120,
    multiRows: { enabled: false, num: 1, lineWidth: 0, separatorColor: "#f5f5f5" },
    outerBorder: { width: 10, color: "#cc3333", hMargin: 5, vMargin: 5 },
    innerBorder: { width: 1, color: "#cc3333" },
    fishTail: {
      top: { y: 450, color: "#cc3333", rectHeight: 50, triHeight: 30, lineWidth: 15 },
      bottom: { y: 1550, color: "#cc3333", rectHeight: 50, triHeight: 30, lineWidth: 15, direction: 1 },
      style: "triangle",
      decorativeLines: { color: "#cc3333", width: 1, margin: 5 },
    },
    logoY: 1680,
    logoColor: "#cc3333",
    logoFont: "qiji-combo.ttf",
    logoFontSize: 40,
  },

  /** 极简边框 (无鱼尾) */
  simple: {
    width: 2480,
    height: 1860,
    color: "white",
    margins: { top: 150, bottom: 80, left: 60, right: 60 },
    leafCol: 20,
    leafCenterWidth: 80,
    multiRows: { enabled: false, num: 1, lineWidth: 0, separatorColor: "#f5f5f5" },
    outerBorder: { width: 4, color: "#666", hMargin: 3, vMargin: 3 },
    innerBorder: { width: 1, color: "#999" },
    fishTail: {
      top: { y: 0, color: "#666", rectHeight: 1, triHeight: 1, lineWidth: 1 },
      bottom: { y: 0, color: "#666", rectHeight: 1, triHeight: 1, lineWidth: 1, direction: 1 },
      style: "triangle",
      decorativeLines: { color: "#666", width: 1, margin: 5 },
    },
    logoY: 1680,
    logoColor: "#666",
    logoFont: "serif",
    logoFontSize: 30,
  },

  /** 古旧宣纸 */
  vintage: {
    width: 2480,
    height: 1860,
    color: "#e8dcc8",
    margins: { top: 200, bottom: 80, left: 60, right: 60 },
    leafCol: 22,
    leafCenterWidth: 100,
    multiRows: { enabled: false, num: 1, lineWidth: 0, separatorColor: "#f5f5f5" },
    outerBorder: { width: 8, color: "#5c3a1e", hMargin: 4, vMargin: 4 },
    innerBorder: { width: 1, color: "#5c3a1e" },
    fishTail: {
      top: { y: 420, color: "#5c3a1e", rectHeight: 45, triHeight: 28, lineWidth: 12 },
      bottom: { y: 1520, color: "#5c3a1e", rectHeight: 45, triHeight: 28, lineWidth: 12, direction: 1 },
      style: "curved",
      decorativeLines: { color: "#5c3a1e", width: 1, margin: 5 },
    },
    logoY: 1700,
    logoColor: "#5c3a1e",
    logoFont: "qiji-combo.ttf",
    logoFontSize: 36,
  },

  /** 竹简风 */
  bamboo: {
    width: 2480,
    height: 3600,
    color: "#d4c5a9",
    margins: { top: 300, bottom: 100, left: 40, right: 40 },
    leafCol: 30,
    leafCenterWidth: 80,
    multiRows: { enabled: false, num: 1, lineWidth: 0, separatorColor: "#f5f5f5" },
    outerBorder: { width: 5, color: "#4a3520", hMargin: 3, vMargin: 3 },
    innerBorder: { width: 1, color: "#4a3520" },
    fishTail: {
      top: { y: 500, color: "#4a3520", rectHeight: 40, triHeight: 25, lineWidth: 10 },
      bottom: { y: 3200, color: "#4a3520", rectHeight: 40, triHeight: 25, lineWidth: 10, direction: 1 },
      style: "triangle",
      decorativeLines: { color: "#4a3520", width: 1, margin: 5 },
    },
    logoY: 3400,
    logoColor: "#4a3520",
    logoFont: "qiji-combo.ttf",
    logoFontSize: 35,
  },
};

// ============================================================================
// 公共 API
// ============================================================================

/** 获取所有预设 ID 列表 */
export function getCanvasPresetIds(): string[] {
  return Object.keys(PRESETS);
}

/** 获取预设显示名 */
export function getCanvasPresetLabel(id: string): string {
  const labels: Record<string, string> = {
    "24_paper": "24 栏朱丝栏 (宣纸)",
    "24_black_blank": "24 栏黑线 (空白)",
    "18_red": "18 栏红格",
    simple: "极简 (无鱼尾)",
    vintage: "古旧宣纸",
    bamboo: "竹简风 (30 栏)",
  };
  return labels[id] || id;
}

/** 按 ID 获取预设画布配置 */
export function getCanvasPreset(id: string): CanvasConfig | undefined {
  return PRESETS[id];
}

/** 检查 ID 是否为已知预设 */
export function isKnownPreset(id: string): boolean {
  return id in PRESETS;
}
