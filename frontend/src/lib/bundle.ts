/**
 * JSON Bundle — 项目导入/导出
 *
 * 支持:
 *   1. 导出: BookConfig + CanvasConfig + 文本文件 → 单个 JSON 文件下载
 *   2. 导入: JSON 文件 → 恢复 BookConfig/CanvasConfig/文本文件
 *   3. 互转: 从原版 .cfg/.txt 目录结构导入 → JSON Bundle
 *           JSON Bundle 导出 → 原版兼容的 .cfg/.txt 目录结构
 *
 * Bundle 格式:
 * {
 *   "version": "vrain-web/0.1",
 *   "exportedAt": "2026-06-15T...",
 *   "name": "项目名",
 *   "bookConfig": { ... },
 *   "canvasConfig": { ... },
 *   "textFiles": [
 *     { "filename": "00.txt", "content": "..." },
 *     { "filename": "01.txt", "content": "..." }
 *   ]
 * }
 */

import type { BookConfig, CanvasConfig } from "../types/layout";

// ============================================================================
// 类型定义
// ============================================================================

export interface VrainBundle {
  /** bundle 格式版本 (用于未来向后兼容) */
  version: string;
  /** 导出时间戳 */
  exportedAt: string;
  /** 项目名称 */
  name: string;
  /** 书籍配置 */
  bookConfig: BookConfig;
  /** 画布配置 */
  canvasConfig: CanvasConfig;
  /** 文本文件列表 */
  textFiles: TextFile[];
}

export interface TextFile {
  filename: string; // 00.txt, 01.txt, ...
  content: string;  // 文件原始内容
}

// ============================================================================
// 导出
// ============================================================================

/** 将项目数据打包为 JSON Bundle */
export function createBundle(
  name: string,
  bookConfig: BookConfig,
  canvasConfig: CanvasConfig,
  textFiles: TextFile[]
): VrainBundle {
  return {
    version: "vrain-web/0.1",
    exportedAt: new Date().toISOString(),
    name,
    bookConfig,
    canvasConfig,
    textFiles,
  };
}

/** 将 Bundle 序列化为 JSON 字符串并触发下载 */
export function downloadBundle(bundle: VrainBundle, filename?: string): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${bundle.name}-bundle.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 导入
// ============================================================================

/** 验证并解析 JSON Bundle */
export function parseBundle(raw: string): VrainBundle {
  const data = JSON.parse(raw) as VrainBundle;

  // 基本格式校验
  if (data.version !== "vrain-web/0.1") {
    throw new Error(`不支持的 bundle 版本: ${data.version}`);
  }
  if (!data.name) {
    throw new Error("bundle 缺少项目名称");
  }
  if (!data.bookConfig || !data.canvasConfig) {
    throw new Error("bundle 缺少 bookConfig 或 canvasConfig");
  }
  if (!Array.isArray(data.textFiles)) {
    throw new Error("bundle 缺少 textFiles 数组");
  }

  return data;
}

/** 从 parsed bundle 中提取项目数据 */
export function extractBundle(
  bundle: VrainBundle
): {
  name: string;
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  textFiles: TextFile[];
} {
  return {
    name: bundle.name,
    bookConfig: bundle.bookConfig,
    canvasConfig: bundle.canvasConfig,
    textFiles: bundle.textFiles,
  };
}

// ============================================================================
// .cfg/.txt 互转
// ============================================================================

/**
 * 将原版 .cfg/.txt 目录内容转换为 JSON Bundle
 *
 * 输入: book.cfg 内容 + canvas.cfg 内容 + 文本文件列表
 * 输出: 可用的 VrainBundle
 */
export function cfgToBundle(
  bookCfg: string,
  canvasCfg: string,
  textFiles: { filename: string; content: string }[],
  bundleName?: string
): VrainBundle {
  // 复用已有的 config-parser
  const { parseCfg, parseBookConfig, parseCanvasConfig } =
    require("./config-parser") as typeof import("../lib/config-parser");

  const bookMap = parseCfg(bookCfg);
  const canvasMap = parseCfg(canvasCfg);

  const bookConfig = parseBookConfig(bookMap);
  const canvasConfig = parseCanvasConfig(canvasMap);

  // 用 cfg 中的标题作为 bundle 名
  const name = bundleName || bookConfig.title || "未命名项目";

  return createBundle(
    name,
    bookConfig,
    canvasConfig,
    textFiles.map((tf) => ({
      filename: tf.filename.replace(/\.txt$/, "").padStart(2, "0") + ".txt",
      content: tf.content,
    }))
  );
}

/**
 * 将 JSON Bundle 导出为原版兼容的目录结构
 *
 * 返回: { bookCfg: string, canvasCfg: string, textFiles: {...} }
 * 调用方可以将其写入磁盘
 */
export function bundleToCfgDirs(
  bundle: VrainBundle
): {
  bookCfg: string;
  canvasCfg: string;
  textFiles: Record<string, string>;
} {
  // bookConfig → cfg 文本: 将 JSON 字段反向为 key=value 格式
  const bookCfg = bookConfigToCfg(bundle.bookConfig);
  const canvasCfg = canvasConfigToCfg(bundle.canvasConfig);

  const textFiles: Record<string, string> = {};
  for (const tf of bundle.textFiles) {
    textFiles[tf.filename] = tf.content;
  }

  return { bookCfg, canvasCfg, textFiles };
}

/** BookConfig → .cfg 文本 (key=value 格式, 与原版兼容) */
function bookConfigToCfg(config: BookConfig): string {
  const lines: string[] = [
    `# vRain Book Config`,
    `# 由 vRain Web 自动生成`,
    ``,
    `# 元数据`,
    `project_name=${config.name}`,
    `title=${config.title}`,
    `author=${config.author}`,
    ``,
    `# 布局`,
    `canvas_id=${config.canvasId}`,
    `row_num=${config.rowNum}`,
    `row_delta_y=${config.rowDeltaY}`,
    ``,
    `# 颜色`,
    `text_font_color=${config.textFontColor}`,
    `comment_font_color=${config.commentFontColor}`,
    ``,
    `# 版心标题`,
    `title_font_size=${config.titleFontSize}`,
    `title_font_color=${config.titleColor}`,
    `title_y=${config.titleY}`,
    `title_ydis=${config.titleYDis}`,
    `title_postfix=${config.titlePostfix}`,
    `title_directory=${config.titleDirectory ? "1" : "0"}`,
    ``,
    `# 页码`,
    `pager_font_size=${config.pagerFontSize}`,
    `pager_font_color=${config.pagerColor}`,
    `pager_y=${config.pagerY}`,
    ``,
    `# 封面`,
    `cover_title_font_size=${config.coverTitleFontSize}`,
    `cover_title_y=${config.coverTitleY}`,
    `cover_author_font_size=${config.coverAuthorFontSize}`,
    `cover_author_y=${config.coverAuthorY}`,
    `cover_font_color=${config.coverFontColor}`,
    ``,
    `# 标点 — 无标点模式`,
    `if_nocomma=${config.noPunctuationMode ? "1" : "0"}`,
    `if_onlyperiod=${config.onlyPeriodMode ? "1" : "0"}`,
    ``,
    `# 简繁对照 (替代 vrain_mr.pl)`,
    `try_st=${config.simplifiedToTraditional ? "1" : "0"}`,
    ``,
    `# 高级`,
    `if_font_metric_adjust=${config.fontMetricAdjust ? "1" : "0"}`,
    `if_fallback_bold=${config.fallbackBold ? "1" : "0"}`,
    `fallback_bold_stroke_width=${config.fallbackBoldStrokeWidth}`,
  ];

  // 字体链 (最多 5 级)
  config.fonts.forEach((font, i) => {
    const idx = i + 1;
    lines.push(`font${idx}=${font.name}`);
    lines.push(`text_font${idx}_size=${font.textPointSize}`);
    lines.push(`comment_font${idx}_size=${font.commentPointSize}`);
    lines.push(`font${idx}_rotate=${font.rotate}`);
  });

  // 正文字体 / 批注字体
  lines.push(`text_font_family=${encodeURIComponent(config.textFontFamily || "serif")}`);
  lines.push(`comment_font_family=${encodeURIComponent(config.commentFontFamily || "serif")}`);

  // 标点替换规则
  if (config.punctuationReplacements.length > 0) {
    const pairs = config.punctuationReplacements.map(
      (r) => r.from + r.to
    );
    lines.push(`exp_replace_comma=${pairs.join("|")}`);
  }

  if (config.punctuationDeletions) {
    lines.push(`exp_delete_comma=${config.punctuationDeletions}`);
  }

  // 无位置标点
  if (config.noPositionPunctuation) {
    lines.push(`text_comma_nop=${config.noPositionPunctuation}`);
    lines.push(`text_comma_nop_size=${config.noPositionPunctuationSize}`);
    lines.push(
      `text_comma_nop_x=${config.noPositionPunctuationOffset.x}`
    );
    lines.push(
      `text_comma_nop_y=${config.noPositionPunctuationOffset.y}`
    );
  }

  // 旋转标点
  if (config.rotatedPunctuation) {
    lines.push(`text_comma_90=${config.rotatedPunctuation}`);
    lines.push(`text_comma_90_size=${config.rotatedPunctuationSize}`);
    lines.push(`text_comma_90_x=${config.rotatedPunctuationOffset.x}`);
    lines.push(`text_comma_90_y=${config.rotatedPunctuationOffset.y}`);
  }

  // 夹批标点
  if (config.commentNoPositionPunctuation) {
    lines.push(`comment_comma_nop=${config.commentNoPositionPunctuation}`);
  }
  if (config.commentRotatedPunctuation) {
    lines.push(`comment_comma_90=${config.commentRotatedPunctuation}`);
  }

  // 装饰标记
  const dm = config.decorativeMarks;
  if (dm.bookLine.enabled)
    lines.push(`if_tag_bookline=1`);
  if (dm.rectFrame.enabled) {
    lines.push(`if_tag_rectframe=1`);
    lines.push(`rect_type=${dm.rectFrame.borderType}`);
    lines.push(`rect_bcolor=${dm.rectFrame.borderColor}`);
    lines.push(`rect_fcolor=${dm.rectFrame.fillColor}`);
  }
  if (dm.circleFrame.enabled) {
    lines.push(`if_tag_circleframe=1`);
    lines.push(`circle_type=${dm.circleFrame.borderType}`);
    lines.push(`circle_bcolor=${dm.circleFrame.borderColor}`);
    lines.push(`circle_fcolor=${dm.circleFrame.fillColor}`);
  }
  if (dm.textZoom.enabled)
    lines.push(`if_tag_textzoom=1`);
  if (dm.circleNote.enabled) {
    lines.push(`if_tag_circlenote=1`);
    lines.push(`text_note_ow=${dm.circleNote.width}`);
    lines.push(`text_note_oc=${dm.circleNote.color}`);
  }
  if (dm.pointNote.enabled) {
    lines.push(`if_tag_pointnote=1`);
    lines.push(`text_note_ps=${dm.pointNote.size}`);
    lines.push(`text_note_pc=${dm.pointNote.color}`);
  }
  if (dm.lineNote.enabled) {
    lines.push(`if_tag_linenote=1`);
    lines.push(`text_note_lw=${dm.lineNote.width}`);
    lines.push(`text_note_lc=${dm.lineNote.color}`);
  }

  return lines.join("\n") + "\n";
}

/** CanvasConfig → .cfg 文本 (key=value 格式, 与原版兼容) */
function canvasConfigToCfg(config: CanvasConfig): string {
  const lines: string[] = [
    `# vRain Canvas Config`,
    `# 由 vRain Web 自动生成`,
    ``,
    `# 画布`,
    `canvas_width=${config.width}`,
    `canvas_height=${config.height}`,
    `canvas_color=${config.color}`,
    ``,
    `# 边距`,
    `margins_top=${config.margins.top}`,
    `margins_bottom=${config.margins.bottom}`,
    `margins_left=${config.margins.left}`,
    `margins_right=${config.margins.right}`,
    ``,
    `# 网格`,
    `leaf_col=${config.leafCol}`,
    `leaf_center_width=${config.leafCenterWidth}`,
    ``,
    `# 边框`,
    `outline_width=${config.outerBorder.width}`,
    `outline_color=${config.outerBorder.color}`,
    `outline_hmargin=${config.outerBorder.hMargin}`,
    `outline_vmargin=${config.outerBorder.vMargin}`,
    `inline_width=${config.innerBorder.width}`,
    `inline_color=${config.innerBorder.color}`,
    ``,
    `# 鱼尾`,
    `fish_top_y=${config.fishTail.top.y}`,
    `fish_top_color=${config.fishTail.top.color}`,
    `fish_top_rectheight=${config.fishTail.top.rectHeight}`,
    `fish_top_triaheight=${config.fishTail.top.triHeight}`,
    `fish_top_linewidth=${config.fishTail.top.lineWidth}`,
    `fish_btm_y=${config.fishTail.bottom.y}`,
    `fish_btm_color=${config.fishTail.bottom.color}`,
    `fish_btm_rectheight=${config.fishTail.bottom.rectHeight}`,
    `fish_btm_triaheight=${config.fishTail.bottom.triHeight}`,
    `fish_btm_linewidth=${config.fishTail.bottom.lineWidth}`,
    `fish_btm_direction=${config.fishTail.bottom.direction}`,
    `fish_line_color=${config.fishTail.decorativeLines.color}`,
    `fish_line_width=${config.fishTail.decorativeLines.width}`,
    `fish_line_margin=${config.fishTail.decorativeLines.margin}`,
    ``,
    `# Logo`,
    `logo_y=${config.logoY}`,
    `logo_color=${config.logoColor}`,
    `logo_font=${config.logoFont}`,
    `logo_font_size=${config.logoFontSize}`,
  ];

  // 多栏
  if (config.multiRows.enabled) {
    lines.push(`if_multirows=1`);
    lines.push(`multirows_num=${config.multiRows.num}`);
    lines.push(`multirows_linewidth=${config.multiRows.lineWidth}`);
    lines.push(`multirows_colcolor=${config.multiRows.separatorColor}`);
  }

  return lines.join("\n") + "\n";
}

// ============================================================================
// 文件读写
// ============================================================================

/** 从 File 对象读取并解析 bundle */
export function readBundleFile(file: File): Promise<VrainBundle> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const bundle = parseBundle(content);
        resolve(bundle);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

/** 读取多个 .txt 文件 */
export function readTxtFiles(
  files: FileList | File[]
): Promise<TextFile[]> {
  const promises: Promise<TextFile>[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.name.endsWith(".txt")) continue;

    promises.push(
      new Promise<TextFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({ filename: file.name, content: e.target?.result as string });
        };
        reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
        reader.readAsText(file);
      })
    );
  }

  return Promise.all(promises);
}
