import type { BookConfig, CanvasConfig, FontEntry } from "../types/layout";

/** — 将原 vrain.pl 中的 book.cfg / canvas.cfg 解析逻辑移植为 TypeScript
 *
 * 原代码: vrain.pl lines 69-93 (book.cfg), 204-217 (canvas.cfg)
 * 解析规则:
 *   - 跳过空白行
 *   - 跳过 # 开头的行
 *   - 非 #= 的行, # 及之后内容被删除
 *   - 删除所有空白字符
 *   - 按第一个 = 分割 key=value
 */

export type ConfigValue = string;

export type ConfigMap = Record<string, ConfigValue>;

/** 解析 .cfg 文件内容为配置映射 */
export function parseCfg(text: string): ConfigMap {
  const result: ConfigMap = {};
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // 跳过空白行
    if (line === "") continue;

    // 跳过注释行
    if (line.startsWith("#")) continue;

    // 先删除所有空白字符
    let processed = line.replace(/\s/g, "");

    // 内联注释: 不含 =# 的行, # 及之后删除
    // 注意: 检查的是 "=#" 而非 "#=" (如 color=#ff0000 中的 =# 表示颜色值)
    if (!processed.includes("=#")) {
      const commentIdx = processed.indexOf("#");
      if (commentIdx !== -1) {
        const beforeHash = processed.substring(0, commentIdx);
        if (!beforeHash.includes("=")) {
          continue; // 整行是注释, 跳过
        }
        // 删除 # 及之后的内容
        processed = processed.substring(0, commentIdx);
      }
    }

    // 按第一个 = 分割
    const eqIdx = processed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = processed.substring(0, eqIdx);
    const value = processed.substring(eqIdx + 1);

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/** 将配置映射转换为 BookConfig 对象 */
export function parseBookConfig(raw: ConfigMap): BookConfig {
  const str = (key: string, fallback = ""): string => raw[key] ?? fallback;
  const int = (key: string, fallback = 0): number =>
    parseInt(raw[key] ?? String(fallback), 10) || fallback;
  const float = (key: string, fallback = 0): number =>
    parseFloat(raw[key] ?? String(fallback)) || fallback;
  const bool = (key: string, fallback = false): boolean =>
    (raw[key] ?? String(fallback)) === "1";

  const fonts: FontEntry[] = [];
  for (let i = 1; i <= 5; i++) {
    const name = str(`font${i}`);
    if (name) {
      fonts.push({
        name,
        filename: name,
        textPointSize: int(`text_font${i}_size`),
        commentPointSize: int(`comment_font${i}_size`),
        rotate: int(`font${i}_rotate`),
      });
    }
  }

  const textFontFamily = fonts.length > 0 ? fonts[0].name : "serif";
  const commentFontFamily = fonts.length > 0 ? fonts[0].name : "serif";

  return {
    name: str("project_name", str("title", "未命名")),
    title: str("title"),
    author: str("author"),
    canvasId: str("canvas_id"),
    rowNum: int("row_num"),
    rowDeltaY: int("row_delta_y", 8),
    fonts,
    textFontFamily,
    commentFontFamily,
    textFontColor: str("text_font_color", "black"),
    commentFontColor: str("comment_font_color", "black"),
    coverTitleFontFamily: str("cover_title_font_family", ""),
    coverTitleFontSize: int("cover_title_font_size", 120),
    coverTitleY: int("cover_title_y", 200),
    coverAuthorFontSize: int("cover_author_font_size", 60),
    coverAuthorY: int("cover_author_y", 600),
    coverFontColor: str("cover_font_color", "black"),
    titleFontSize: int("title_font_size"),
    titleColor: str("title_font_color", "black"),
    titleY: int("title_y"),
    titleYDis: float("title_ydis", 1.25),
    titlePostfix: str("title_postfix"),
    titleDirectory: bool("title_directory"),
    pagerFontSize: int("pager_font_size"),
    pagerColor: str("pager_font_color", "black"),
    pagerY: int("pager_y"),
    punctuationReplacements: parseReplacePairs(str("exp_replace_comma")),
    punctuationDeletions: str("exp_delete_comma"),
    noPunctuationMode: bool("if_nocomma"),
    onlyPeriodMode: bool("if_onlyperiod"),
    noPositionPunctuation: str("text_comma_nop"),
    noPositionPunctuationSize: float("text_comma_nop_size", 1.1),
    noPositionPunctuationOffset: {
      x: float("text_comma_nop_x", 0.45),
      y: float("text_comma_nop_y", 0.5),
    },
    rotatedPunctuation: str("text_comma_90"),
    rotatedPunctuationSize: float("text_comma_90_size", 0.8),
    rotatedPunctuationOffset: {
      x: float("text_comma_90_x", 0.35),
      y: float("text_comma_90_y", 0.65),
    },
    commentNoPositionPunctuation: str("comment_comma_nop"),
    commentRotatedPunctuation: str("comment_comma_90"),
    decorativeMarks: {
      commentary: { enabled: true, color: "black", backgroundColor: "#ffffff" },
      bookLine: {
        enabled: bool("if_tag_bookline"),
        width: int("book_line_width", 5),
        color: str("book_line_color", "#000000"),
      },
      rectFrame: {
        enabled: bool("if_tag_rectframe"),
        borderType: int("rect_type", 1) as 0 | 1,
        borderColor: str("rect_bcolor", "#874434"),
        fillColor: str("rect_fcolor", "#000000"),
      },
      circleFrame: {
        enabled: bool("if_tag_circleframe"),
        borderType: int("circle_type", 1) as 0 | 1,
        borderColor: str("circle_bcolor", "#874434"),
        fillColor: str("circle_fcolor", "#ffffff"),
      },
      textZoom: {
        enabled: bool("if_tag_textzoom"),
        zoomFactor: float("text_zoom", 1.1),
        color: "#cc0000",
      },
      circleNote: {
        enabled: bool("if_tag_circlenote"),
        offset: {
          x: float("text_note_ox", 0.25),
          y: float("text_note_oy", 0.3),
        },
        radius: float("text_note_or", 0.15),
        width: int("text_note_ow", 6),
        color: str("text_note_oc", "#874434"),
      },
      pointNote: {
        enabled: bool("if_tag_pointnote"),
        offset: {
          x: float("text_note_px", -0.25),
          y: float("text_note_py", 0),
        },
        size: float("text_note_ps", 1.2),
        color: str("text_note_pc", "#874434"),
      },
      lineNote: {
        enabled: bool("if_tag_linenote"),
        offset: {
          x: float("text_note_lx", 0.4),
          y: float("text_note_ly", -0.25),
        },
        width: int("text_note_lw", 7),
        color: str("text_note_lc", "#874434"),
      },
    },
    fontMetricAdjust: bool("if_font_metric_adjust"),
    fallbackBold: bool("if_fallback_bold"),
    fallbackBoldStrokeWidth: float("fallback_bold_stroke_width", 1.2),
    // 简繁对照 — 替代 vrain_mr.pl (try_st 配置项)
    simplifiedToTraditional: bool("try_st"),
  };
}

/** 将配置映射转换为 CanvasConfig 对象 */
export function parseCanvasConfig(raw: ConfigMap): CanvasConfig {
  const str = (key: string, fallback = ""): string => raw[key] ?? fallback;
  const int = (key: string, fallback = 0): number =>
    parseInt(raw[key] ?? String(fallback), 10) || fallback;
  const bool = (key: string, fallback = false): boolean =>
    (raw[key] ?? String(fallback)) === "1";

  // 检查是否使用简化鱼尾模型 (simple.cfg)
  const hasSimpleFish = "fish_top" in raw && "fish_bottom" in raw;

  if (hasSimpleFish) {
    return buildSimpleFishCanvas(raw, str, int, bool);
  }

  return buildSplitFishCanvas(raw, str, int, bool);
}

/** 解析文本字体顺序 "123" → [0, 1, 2] */
function parseFontOrder(text: string, maxFonts: number): number[] {
  const result: number[] = [];
  for (const ch of text) {
    const idx = parseInt(ch, 10);
    if (idx >= 1 && idx <= maxFonts) {
      result.push(idx - 1); // 转为 0-based
    }
  }
  return result;
}

/**
 * 解析标点替换规则 ",，|.。|:：" → [{ from: ",", to: "，" }, ...]
 * 格式: src1|dest1|src2|dest2
 */
/**
 * 解析标点替换规则 ",，|.。" → [{ from: ",", to: "，" }, { from: ".", to: "。" }]
 * 格式: 每对字符为一组, 组间用 | 分隔
 * 每个 pair 是 2 个字符: from(1 char) + to(1 char)
 */
function parseReplacePairs(text: string): { from: string; to: string }[] {
  const result: { from: string; to: string }[] = [];
  if (!text) return result;

  // 转义: 将 \| 替换为占位符 (避免被 split 切断)
  const PLACEHOLDER = "||__PIPE__||";
  const escaped = text.replace(/\\\|/g, PLACEHOLDER);
  const pairs = escaped.split("|");

  for (const pair of pairs) {
    // 恢复转义的 |
    const clean = pair.replace(/\|\|__PIPE__\|\|/g, "\\|");
    if (clean.length < 2) continue;
    result.push({ from: clean.charAt(0), to: clean.charAt(1) });
  }

  return result;
}

/** 构建完整版鱼尾模型的 CanvasConfig */
function buildSplitFishCanvas(
  raw: ConfigMap,
  str: (k: string, fb?: string) => string,
  int: (k: string, fb?: number) => number,
  _bool: (k: string, fb?: boolean) => boolean
): CanvasConfig {
  const fishStyle = raw["if_fishflower"] === "1" ? "curved" : "triangle";

  return {
    width: int("canvas_width", 2480),
    height: int("canvas_height", 1860),
    color: str("canvas_color", "white"),
    backgroundImage: str("canvas_background_image"),
    margins: {
      top: int("margins_top", 200),
      bottom: int("margins_bottom", 50),
      left: int("margins_left", 50),
      right: int("margins_right", 50),
    },
    leafCol: int("leaf_col", 24),
    leafCenterWidth: int("leaf_center_width", 120),
    multiRows: {
      enabled: raw["if_multirows"] === "1",
      num: int("multirows_num", 5),
      lineWidth: int("multirows_linewidth", 2),
      separatorColor: str("multirows_colcolor", "#f5f5f5"),
    },
    outerBorder: {
      width: int("outline_width", 10),
      color: str("outline_color", "black"),
      hMargin: int("outline_hmargin", 5),
      vMargin: int("outline_vmargin", 5),
    },
    innerBorder: {
      width: int("inline_width", 1),
      color: str("inline_color", "black"),
    },
    fishTail: {
      top: {
        y: int("fish_top_y", 450),
        color: str("fish_top_color", "black"),
        rectHeight: int("fish_top_rectheight", 50),
        triHeight: int("fish_top_triaheight", 30),
        lineWidth: int("fish_top_linewidth", 15),
      },
      bottom: {
        y: int("fish_btm_y", 1550),
        color: str("fish_btm_color", "black"),
        rectHeight: int("fish_btm_rectheight", 50),
        triHeight: int("fish_btm_triaheight", 30),
        lineWidth: int("fish_btm_linewidth", 15),
        direction: int("fish_btm_direction", 1) as 0 | 1,
      },
      style: fishStyle,
      flowerImage: raw["fish_flower_image"] || undefined,
      decorativeLines: {
        color: str("fish_line_color", "black"),
        width: int("fish_line_width", 1),
        margin: int("fish_line_margin", 5),
      },
    },
    logoText: str("logo_text"),
    logoImage: str("logo_image"),
    logoY: int("logo_y", 1680),
    logoColor: str("logo_color", "white"),
    logoFont: str("logo_font", "qiji-combo.ttf"),
    logoFontSize: int("logo_font_size", 40),
  };
}

/** 构建简化鱼尾模型的 CanvasConfig (simple.cfg) */
function buildSimpleFishCanvas(
  raw: ConfigMap,
  str: (k: string, fb?: string) => string,
  int: (k: string, fb?: number) => number,
  _bool: (k: string, fb?: boolean) => boolean
): CanvasConfig {
  const fishY = int("fish_top", 500);
  const fishH = int("fish_rect_height", 0);
  const fishT = int("fish_path_height", 0);
  const fishLW = int("fish_top_linewidth", 15);

  return {
    width: int("canvas_width", 2480),
    height: int("canvas_height", 1860),
    color: str("canvas_color", "white"),
    backgroundImage: str("canvas_background_image"),
    margins: {
      top: int("margins_top", 200),
      bottom: int("margins_bottom", 50),
      left: int("margins_left", 50),
      right: int("margins_right", 50),
    },
    leafCol: int("leaf_col", 24),
    leafCenterWidth: int("leaf_center_width", 120),
    multiRows: {
      enabled: raw["if_multirows"] === "1",
      num: int("multirows_num", 5),
      lineWidth: int("multirows_linewidth", 2),
      separatorColor: str("multirows_colcolor", "#f5f5f5"),
    },
    outerBorder: {
      width: int("outline_width", 10),
      color: str("outline_color", "black"),
      hMargin: int("outline_hmargin", 5),
      vMargin: int("outline_vmargin", 5),
    },
    innerBorder: {
      width: int("inline_width", 1),
      color: str("inline_color", "black"),
    },
    fishTail: {
      top: {
        y: fishY,
        color: str("fish_color", "black"),
        rectHeight: fishH,
        triHeight: fishT,
        lineWidth: int("fish_top_linewidth", 15),
      },
      bottom: {
        y: int("fish_bottom", 2000),
        color: str("fish_color", "black"),
        rectHeight: fishH,
        triHeight: fishT,
        lineWidth: int("fish_btm_linewidth", 15),
        direction: 1,
      },
      style: "triangle",
      decorativeLines: {
        color: str("fish_line_color", "black"),
        width: int("fish_line_width", 1),
        margin: int("fish_line_margin", 5),
      },
    },
    logoText: str("logo_text"),
    logoImage: str("logo_image"),
    logoY: int("logo_y", 1680),
    logoColor: str("logo_color", "white"),
    logoFont: str("logo_font", "qiji-combo.ttf"),
    logoFontSize: int("logo_font_size", 40),
  };
}
