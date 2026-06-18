import { describe, it, expect } from "vitest";
import { parseCfg, parseBookConfig, parseCanvasConfig } from "../config-parser";

describe("parseCfg", () => {
  it("解析基本 key=value", () => {
    const cfg = parseCfg(`
title=虞初新志
author=清张潮辑
row_num=30
    `);
    expect(cfg.title).toBe("虞初新志");
    expect(cfg.author).toBe("清张潮辑");
    expect(cfg.row_num).toBe("30");
  });

  it("跳过空白行和注释", () => {
    const cfg = parseCfg(`
# 这是一行注释

title=测试

  # 内联注释
key=value
    `);
    expect(cfg.title).toBe("测试");
    expect(cfg.key).toBe("value");
    expect(cfg[""]).toBeUndefined();
  });

  it("处理内联注释但不影响颜色值", () => {
    const cfg = parseCfg("color=#ff0000\nkey=val\n");
    expect(cfg.color).toBe("#ff0000");
    expect(cfg.key).toBe("val");
  });

  it("删除所有空白字符", () => {
    const cfg = parseCfg(`
  title  =  虞初新志
    `);
    expect(cfg.title).toBe("虞初新志");
  });

  it("忽略没有 = 的行", () => {
    const cfg = parseCfg(`
title=测试
invalid_line_without_equals
author=张三
    `);
    expect(cfg.title).toBe("测试");
    expect(cfg.author).toBe("张三");
    expect(cfg.invalid_line_without_equals).toBeUndefined();
  });
});

describe("parseBookConfig", () => {
  const sampleBookCfg = `
title=虞初新志
author=清张潮辑
canvas_id=24_black_blank
row_num=30
row_delta_y=8
font1=qiji-combo.ttf
font2=HanaMinA.ttf
font3=HanaMinB.ttf
text_fonts_array=123
comment_fonts_array=123
text_font1_size=60
text_font2_size=50
text_font3_size=50
comment_font1_size=45
comment_font2_size=40
comment_font3_size=40
text_font_color=black
comment_font_color=black
cover_title_font_size=120
cover_title_y=200
cover_author_font_size=60
cover_author_y=600
cover_font_color=black
title_font_size=65
title_font_color=black
title_y=1250
title_ydis=1.25
title_postfix=卷X
title_directory=1
pager_font_size=30
pager_font_color=black
pager_y=540
exp_replace_comma=,，|.。
exp_delete_comma=．| |－
if_nocomma=0
if_onlyperiod=1
text_comma_nop=、|，|。
text_comma_nop_size=1.1
text_comma_nop_x=0.45
text_comma_nop_y=0.5
text_comma_90=「」『』
text_comma_90_size=0.8
text_comma_90_x=0.35
text_comma_90_y=0.65
comment_comma_nop=、|，|。
comment_comma_90=「」『』…
if_tag_bookline=1
book_line_width=2
book_line_color=black
if_tag_rectframe=1
rect_type=1
rect_bcolor=black
rect_fcolor=black
if_tag_circleframe=0
circle_type=1
circle_bcolor=black
circle_fcolor=white
if_tag_textzoom=1
text_zoom=1.1
if_font_metric_adjust=1
if_fallback_bold=1
fallback_bold_stroke_width=1.2
if_tag_circlenote=1
text_note_ox=0.25
text_note_oy=0.3
text_note_or=0.15
text_note_ow=6
text_note_oc=#874434
if_tag_pointnote=1
text_note_px=-0.25
text_note_py=0
text_note_ps=1.2
text_note_pc=#874434
if_tag_linenote=1
text_note_lx=0.4
text_note_ly=-0.25
text_note_lw=7
text_note_lc=#874434
  `;

  it("解析完整书籍配置", () => {
    const raw = parseCfg(sampleBookCfg);
    const config = parseBookConfig(raw);

    expect(config.title).toBe("虞初新志");
    expect(config.author).toBe("清张潮辑");
    expect(config.canvasId).toBe("24_black_blank");
    expect(config.rowNum).toBe(30);
    expect(config.rowDeltaY).toBe(8);
  });

  it("解析字体链", () => {
    const raw = parseCfg(sampleBookCfg);
    const config = parseBookConfig(raw);

    expect(config.fonts).toHaveLength(3);
    expect(config.fonts[0].filename).toBe("qiji-combo.ttf");
    expect(config.fonts[0].textPointSize).toBe(60);
    expect(config.fonts[0].commentPointSize).toBe(45);
    expect(config.fonts[1].filename).toBe("HanaMinA.ttf");
    expect(config.fonts[2].filename).toBe("HanaMinB.ttf");
  });

  it("解析字体优先级", () => {
    const raw = parseCfg(sampleBookCfg);
    const config = parseBookConfig(raw);

    expect(config.textFontFamily).toBe("qiji-combo.ttf");
    expect(config.commentFontFamily).toBe("qiji-combo.ttf");
  });

  it("解析标点替换规则", () => {
    const raw = parseCfg(sampleBookCfg);
    const config = parseBookConfig(raw);

    expect(config.punctuationReplacements).toHaveLength(2);
    expect(config.punctuationReplacements[0]).toEqual({ from: ",", to: "，" });
    expect(config.punctuationReplacements[1]).toEqual({ from: ".", to: "。" });
  });

  it("解析装饰标记配置", () => {
    const raw = parseCfg(sampleBookCfg);
    const config = parseBookConfig(raw);

    expect(config.decorativeMarks.bookLine.enabled).toBe(true);
    expect(config.decorativeMarks.bookLine.width).toBe(2);
    expect(config.decorativeMarks.bookLine.color).toBe("black");

    expect(config.decorativeMarks.rectFrame.enabled).toBe(true);
    expect(config.decorativeMarks.rectFrame.borderType).toBe(1);

    expect(config.decorativeMarks.circleFrame.enabled).toBe(false);

    expect(config.decorativeMarks.textZoom.enabled).toBe(true);
    expect(config.decorativeMarks.textZoom.zoomFactor).toBe(1.1);

    expect(config.decorativeMarks.circleNote.enabled).toBe(true);
    expect(config.decorativeMarks.pointNote.enabled).toBe(true);
    expect(config.decorativeMarks.lineNote.enabled).toBe(true);
  });

  it("解析高级选项", () => {
    const raw = parseCfg(sampleBookCfg);
    const config = parseBookConfig(raw);

    expect(config.fontMetricAdjust).toBe(true);
    expect(config.fallbackBold).toBe(true);
    expect(config.fallbackBoldStrokeWidth).toBe(1.2);
  });

  it("使用默认值处理缺失字段", () => {
    const raw = parseCfg("title=测试\n");
    const config = parseBookConfig(raw);

    expect(config.title).toBe("测试");
    expect(config.rowNum).toBe(0);
    expect(config.fonts).toHaveLength(0);
    expect(config.textFontFamily).toBe("serif");
    expect(config.titleYDis).toBe(1.25);
    expect(config.textFontColor).toBe("black");
  });
});

describe("parseCanvasConfig", () => {
  const sampleCanvasCfg = `
canvas_width=2480
canvas_height=1860
canvas_color=white
margins_top=200
margins_bottom=50
margins_left=50
margins_right=50
leaf_col=24
leaf_center_width=120
if_multirows=0
multirows_num=5
multirows_linewidth=2
multirows_colcolor=#f5f5f5
if_fishflower=1
fish_top_y=450
fish_top_color=black
fish_top_rectheight=50
fish_top_triaheight=30
fish_top_linewidth=15
fish_btm_direction=1
fish_btm_y=1550
fish_btm_color=black
fish_btm_rectheight=50
fish_btm_triaheight=30
fish_btm_linewidth=15
fish_line_color=black
fish_line_width=1
fish_line_margin=5
inline_width=1
inline_color=black
outline_width=10
outline_color=black
outline_hmargin=5
outline_vmargin=5
logo_text=
logo_y=1680
logo_color=white
logo_font=qiji-combo.ttf
logo_font_size=40
  `;

  it("解析完整版画配置", () => {
    const raw = parseCfg(sampleCanvasCfg);
    const config = parseCanvasConfig(raw);

    expect(config.width).toBe(2480);
    expect(config.height).toBe(1860);
    expect(config.color).toBe("white");
    expect(config.margins.top).toBe(200);
    expect(config.margins.bottom).toBe(50);
    expect(config.margins.left).toBe(50);
    expect(config.margins.right).toBe(50);
    expect(config.leafCol).toBe(24);
    expect(config.leafCenterWidth).toBe(120);
  });

  it("解析鱼尾配置", () => {
    const raw = parseCfg(sampleCanvasCfg);
    const config = parseCanvasConfig(raw);

    expect(config.fishTail.style).toBe("curved");
    expect(config.fishTail.top.y).toBe(450);
    expect(config.fishTail.top.rectHeight).toBe(50);
    expect(config.fishTail.top.triHeight).toBe(30);
    expect(config.fishTail.bottom.direction).toBe(1);
    expect(config.fishTail.bottom.y).toBe(1550);
  });

  it("解析多栏配置", () => {
    const raw = parseCfg(sampleCanvasCfg);
    const config = parseCanvasConfig(raw);

    expect(config.multiRows.enabled).toBe(false);
    expect(config.multiRows.num).toBe(5);
  });

  it("解析边框配置", () => {
    const raw = parseCfg(sampleCanvasCfg);
    const config = parseCanvasConfig(raw);

    expect(config.outerBorder.width).toBe(10);
    expect(config.outerBorder.color).toBe("black");
    expect(config.innerBorder.width).toBe(1);
    expect(config.innerBorder.color).toBe("black");
  });

  it("解析简化鱼尾模型 (simple.cfg)", () => {
    const simpleCfg = `
canvas_width=1860
canvas_height=2480
canvas_color=white
margins_top=200
margins_bottom=100
margins_left=50
margins_right=50
leaf_col=8
leaf_center_width=120
fish_top=500
fish_bottom=2000
fish_rect_height=0
fish_path_height=0
fish_color=black
fish_top_linewidth=15
fish_btm_linewidth=15
inline_width=1
inline_color=black
outline_width=10
outline_color=black
outline_hmargin=5
outline_vmargin=5
logo_y=1680
logo_color=white
logo_font=qiji-combo.ttf
logo_font_size=40
    `;

    const raw = parseCfg(simpleCfg);
    const config = parseCanvasConfig(raw);

    expect(config.width).toBe(1860);
    expect(config.height).toBe(2480);
    expect(config.fishTail.style).toBe("triangle");
    expect(config.fishTail.top.y).toBe(500);
    expect(config.fishTail.bottom.y).toBe(2000);
    expect(config.fishTail.top.rectHeight).toBe(0);
    expect(config.fishTail.bottom.direction).toBe(1);
  });
});
