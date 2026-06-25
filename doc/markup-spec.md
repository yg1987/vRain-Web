# vrain-web 特殊符号实现规格

> 基于 vRain v1.5 原版行为和古籍排版传统整理。最后更新：2026-06-24（P0 已修复）。

---

## 目录

- [一、注释类](#一注释类)
- [二、标记与装饰类](#二标记与装饰类)
- [三、排版控制类](#三排版控制类)
- [四、实现优先级](#四实现优先级)
- [五、与传统对应关系](#五与传统对应关系)
- [六、数据流](#六数据流)

---

## 一、注释类

### 【】夹批注释

| 项目 | 说明 |
|------|------|
| **传统含义** | 双行夹注。指在正文行间插入解释性文字。竖排古籍最常见的“双行夹注”：用比正文小一号的字，排成两行小字，插在对应正文的下方。现代横排书里常用圆括号或方括号将注文与正文隔开。 |
| **vRain 原版行为** | 提取【】内文字，按双排小字列在正文对应位置的右侧。奇数个字自动补空格补齐（保证双列成对）。批注字符不占正文位（不推进正文位置计数器 `$pcnt`）。批注坐标用 `@pos_r`（列左边缘）。 |
| **vrain-web 当前状态** | `text-parser.ts` 提取后去除【】，`pagination-controller.ts` 在对应 `charIndex` 处创建 `Commentary` IR，`preview-renderer.ts` 的 `drawCommentary` 双列渲染。 |
| **正确实现** | 见下方。 |

**应实现行为：**

1. **位置**：批注应在正文所在列的**左侧**（列左边缘），即在当前列与其右侧列之间。公式：`x = columnLeftEdge`（与 `computeStandardPosition` 相同的列坐标公式，但不加 `colWidth/2`）。
2. **竖向对齐**：批注每行（2 小字）的 y 间距 = `rowHeight`（网格行高），而非 `cm.fontSize`。确保批注行与正文网格行对齐。
3. **双列宽度**：两列小字总宽度应控制在列间距内。当前 24 列布局下列宽约 94px，正文约 60px 宽，列间距仅约 34px。需要确保批注字号够小（建议 ≤正文的 50%），或动态调整双列间距。
4. **跨列处理**：批注行数超过当前列剩余行数时，截断不渲染超出行。
5. **正文不丢字**：同位置有批注时，正文仍需渲染（当前已修复：`paginate()` 中正文和批注独立处理）。

---

## 二、标记与装饰类

### 《》书名号（波浪线）

| 项目 | 说明 |
|------|------|
| **传统含义** | 竖排古籍专用书名号。在书名下方画一条波浪线（﹏）。横排现代书中用《》，竖排古书中用波浪线。 |
| **vRain 原版行为** | 去括号，文字保留渲染。在文字左侧画正弦波浪线 `draw_line`（PDF::Builder 路径），从首字左侧延伸到末字左侧。 |
| **vrain-web 当前状态** | `markup-parser.ts` → `DecorationRange(type: "wavyLine")` → `resolveDecorationRanges` 算包围盒 → `drawWavyLine()` 画正弦波浪线。有实现。 |
| **正确实现** | 见下方。 |

**应实现行为：**

- 竖排时波浪线沿字符**左侧**垂直延伸（同 x，y 从首字 y1 到末字 y2），而不是沿包围盒对角线
- 当前 `drawWavyLine` 使用两点间连线方向 → 竖排首末字不在同一行时为斜线，应改为垂直方向
- 修复方案：传入文字方向参数，竖排时只沿 y 方向画波浪，横排时沿 x 方向

### 〔〕圆角方框

| 项目 | 说明 |
|------|------|
| **传统含义** | 为正文中需要强调或引用的字句加框。常用于补注、考证等。 |
| **vRain 原版行为** | `draw_rect0`（单字符：四角圆弧 + 内外矩形叠加）、`draw_rect1`（多字符连续：自动补齐字符间连接线），支持圆角和边框/填充配置。 |
| **vrain-web 当前状态** | ✅ 已实现。`markup-parser.ts` → `DecorationRange(type: "rectFrame")` → `resolveDecorationRanges` 算包围盒（±25px 边距）→ `preview-renderer.ts` 用 `ctx.arcTo()` 手绘圆角矩形路径。`paginate()` 通过 `charIndexMap` 修正控制标记导致的索引偏移。 |
| **已知限制** | 多字符连续时画整体一个圆角边框（未实现字符间连接线补齐）。包围盒边距硬编码为 25px，未按字号动态调整。 |

### 〈〉圆圈

| 项目 | 说明 |
|------|------|
| **传统含义** | 对应古籍中的“句读”标记。小圆圈通常相当于现代的句号，用于断句。 |
| **vRain 原版行为** | `draw_circle0`（描边圆形，逐字）、`draw_circle1`（填充圆形底色，用于圆框背景）。配置支持边框类型（`borderType`）、颜色和填充色。 |
| **vrain-web 当前状态** | `markup-parser.ts` → `circleFrame` → 逐字 `ctx.arc()`。配置有 `fillColor` 但渲染层未使用。配置有 `borderType`（0=粗边框/3px，1=细边框/1px）已应用。 |
| **正确实现** | 🟡 渲染时先 `ctx.fill()` 画底色再 `ctx.stroke()` 描边（使用配置的 `fillColor`）。 |

### （）字体放大

| 项目 | 说明 |
|------|------|
| **传统含义** | 古文排版中注释通常用小字。此处"字体放大"属于工具特殊功能，用于强调某段正文，与传统相反。 |
| **vRain 原版行为** | 去括号，括号内文字按配置的缩放因子放大渲染。括号本身不占位不显示。 |
| **vrain-web 当前状态** | ✅ 已实现。`markup-parser.ts` → `TextZoomRange` 记录区间 + `zoomFactor` + `color`。`usePreview.ts` 构建 `zoomByIndex` 映射传入 `paginate()`。`paginate()` 在创建字符时用 `zoomByIndex[charIndex]` 查表（利用 `charIndex` 即 allChars 绝对索引，不受控制标记跳过影响）。`drawCharacter` 对 fontSize 和 canvas transform 双缩放。配置默认 `zoomFactor: 1.1, color: #cc0000`。DecorationPanel 提供颜色选项。 |
| **已知限制** | 缩放以字符中心为原点，大字可能与相邻字符轻微重叠。 |

### ｛｝圈注

| 项目 | 说明 |
|------|------|
| **传统含义** | 一种“圈点”和“注释”的结合体。在正文文字旁用小圆圈标记（表示精彩、重要或句读），同时可能附简短文字说明。 |
| **vRain 原版行为** | `draw_circle0` 描边小圆，逐字在右侧画圈。配置支持偏移（`offset.x/y`）、半径、颜色、线宽。 |
| **vrain-web 当前状态** | `markup-parser.ts` → `circleNote` → 逐字 `ctx.arc()`。配置有 `radius`、`width`、`color`、`offset`，但渲染层用 `strokeWidth * 2` 作半径，未使用配置值。 |
| **正确实现** | 🟡 `circleNote` 渲染时使用配置的 `radius`、`width`、`color`。`offset` 用于微调相对于字符中心的位置。 |

### ＜＞顿点注

| 项目 | 说明 |
|------|------|
| **传统含义** | 与“圆圈”类似，但特指用作断句的顿点（、）。传统上表示句中较小的停顿，相当于逗号/顿号。 |
| **vRain 原版行为** | 逐字在右侧画顿点（、标记）。 |
| **vrain-web 当前状态** | `markup-parser.ts` → `pointNote` → 逐字 `fillText("、")`。配置有 `size`、`color`、`offset`，但渲染用 `strokeWidth * 4` 作字号，未使用配置值。 |
| **正确实现** | 🟡 使用配置的 `size`（字体大小）、`color`、`offset`。 |

### ［］行注

| 项目 | 说明 |
|------|------|
| **传统含义** | 单行夹注。与双行夹注不同，将注文排成一行小字插在正文行内。方括号标记注文范围。 |
| **vRain 原版行为** | `draw_line` 逐字在右侧画竖线。 |
| **vrain-web 当前状态** | `markup-parser.ts` → `lineNote` → 逐字画竖线。配置有 `width`、`color`、`offset`，渲染高度用了固定公式 `strokeWidth * 6`。 |
| **正确实现** | 🟡 使用配置的 `width`（线宽）、`color`、`offset`。竖线高度应与字符大小匹配。 |

---

## 三、排版控制类

### 控制标记总览

| 符号 | 名称 | vRain 原版行为 | vrain-web 当前 | 状态 |
|------|------|---------------|---------------|------|
| `%` | 强制换页 | 当前位置开新页，符号不显示 | `paginate()` → `PageBreak` → `pages.push()` + `createNewPage()` | ✅ |
| `$` | 半页跳 | 跳到当前页半页位置。已过半页则无操作 | `paginate()` → `HalfPage` → `pcnt = pageCharsNum/2` | ✅ |
| `&` | 末列跳 | 跳到当前页最后一列开头 | `paginate()` → `LastColumn` → `pcnt = pageCharsNum - rowNum + 1` | ✅ |
| `^` | 多栏跳 | 仅多栏模式生效，跳到下一栏 | `paginate()` → `NextColumn` → `pcnt` 跳到下一栏边界 | ✅ |
| `@` | 空格 | 替换为空格字符（占一个字符位） | `text-parser.ts`：`text.replace(/@/g, " ")` | ✅ |
| `T` | 段落缩进 | 前进一行（`pcnt++`），段首空一格 | `paginate()` → `AdvanceRow` → `pcnt++` | ✅ |

**控制标记详细说明：**

- **`%` 强制换页**：处理到 `%` 时，当前页结束、创建新页、`pcnt` 归零。符号本身不渲染。用于章节分页。
- **`$` 半页跳**：如果当前 `pcnt` 尚未达到半页，则跳到半页位置。常用于分隔不同类型的内容（如序与正文）在同一页内。
- **`&` 末列跳**：当前页剩余空间跳过，直接到最后一列。常用于将末尾几字单独成列。
- **`^` 多栏跳**：仅 `canvas.multiRows.enabled === true` 时生效。跳到下一个水平条带的相同列。
- **`@` 空格**：在正文中插入一个空格（占一个字符位，推进 `pcnt`）。
- **`T` 段落缩进**：段首标记，推进一个字符位但不放置文字，效果为段首空一格。行首的 `T` 不包含在正文字符流中。

---

## 四、实现优先级

✅ = 已修复。

| 优先级 | 符号 | 问题 | 改动范围 |
|--------|------|------|---------|
| ✅ ~~P0~~ | `（）` 字体放大 | 已实现。缩放 + 颜色，通过 `zoomByIndex` 和 `charIndexMap` 对齐索引 | `markup-parser.ts`·`paginate()`·`drawCharacter`·`DecorationPanel` |
| ✅ ~~P0~~ | `〔〕` 圆角方框 | 已实现。`arcTo` 圆角路径 + 包围盒 ±25px + `charIndexMap` 索引修正 | `preview-renderer.ts`·`markup-parser.ts` |
| ✅ ~~P1~~ | `《》` 波浪线 | 已实现。`drawWavyLine` 改为在文字右侧画竖波浪线（x 固定 = 字符列 x + 28px，y 从首字到末字） | `preview-renderer.ts` |
| **P1** | `〈〉` 圆圈 | 缺填充色支持 | `preview-renderer.ts`（加 `ctx.fill()` 调用） |
| **P2** | `｛｝` 圈注 | 配置的 `radius`/`width`/`offset` 未正确使用 | `preview-renderer.ts`（改用配置值） |
| **P2** | `＜＞` 顿点注 | 配置的 `size`/`offset` 未正确使用 | `preview-renderer.ts`（改用配置值） |
| **P2** | `［］` 行注 | 配置的 `width`/`offset` 未正确使用 | `preview-renderer.ts`（改用配置值） |
| **P2** | `【】` 夹批 | 批注位置需用列左边缘 + 行间距用 `rowHeight` | `grid-calculator.ts`·`preview-renderer.ts`（已修，待验证） |

> **共享修复**：`paginate()` 新增 `charIndexMap`，将 `allChars` 索引映射为页面展平字符索引（排除 `T` 等控制标记）。所有 7 种装饰标记的区间索引偏移问题一并修复。

---

## 五、与传统对应关系

| 传统术语 | 对应符号 | 传统做法 | vrain-web IR 类型 | 视觉效果 |
|---------|---------|---------|------------------|---------|
| 双行夹注 | `【】` | 正文间插双行小字注释 | `Commentary` | 正文右侧双列小字 |
| 书名号（竖排） | `《》` | 书名下方画波浪线 ﹏ | `Decoration(type: "wavyLine")` | 文字左侧竖波浪线 |
| 句读圆圈 | `〈〉` | 字旁画小圆圈 ○ | `Decoration(type: "circleFrame")` | 逐字画圈 |
| 句读顿点 | `＜＞` | 字旁画顿点 、 | `Decoration(type: "pointNote")` | 逐字画顿点 |
| 圈点批注 | `｛｝` | 字右侧画小圈表重要 | `Decoration(type: "circleNote")` | 逐字画小圈 |
| 行间竖线 | `［］` | 字右侧画竖线表注解 | `Decoration(type: "lineNote")` | 逐字画竖线 |
| 墨框/围框 | `〔〕` | 文字周围画方框 | `Decoration(type: "rectFrame")` | 圆角包围框 |
| 大字醒目 | `（）` | 重点字词放大显示 | `Character.scale > 1` | 字符放大 |

---

## 六、数据流

### 6.1 文本处理流水线（单行）

```
原始文本行
    │
    ▼
preprocessLine() [text-parser.ts]
    ├── 简繁转换（可选）
    ├── 标点替换
    ├── 数字替换
    ├── 标点删除
    ├── 无标点模式
    ├── 句号归一化
    ├── 空格转换 (@ → " ")
    └── 提取夹批【】→ commentaries[] + 清理后文本
    │
    ▼
extractDecorationRanges() [markup-parser.ts]
    ├── 《》→ wavyLine 区间
    ├── 〔〕→ rectFrame 区间
    ├── 〈〉→ circleFrame 区间
    ├── （）→ 剥离括号（无区间）  ← 🔴 缺放大逻辑
    ├── ｛｝→ circleNote 区间
    ├── ＜＞→ pointNote 区间
    └── ［］→ lineNote 区间
    │
    ▼
characters[] (净化后字符流) + decorationRanges[]
```

### 6.2 排版流水线

```
characters[] + commentaryData[] + decorationRanges[]
    │
    ▼
generatePositionGrid() [grid-calculator.ts]
    └── textPositions[] + commentPositions[]
    │
    ▼
paginate() [pagination-controller.ts]
    ├── 处理控制标记 (% $ & ^ T)
    ├── 逐字符分配坐标 → Character{ x, y, char }
    ├── 批注分配坐标 → Commentary{ x, y, chars }
    └── 分页 → Page[]{ characters, commentaries }
    │
    ▼
resolveDecorationRanges() [markup-parser.ts]
    └── DecorationRange[] → Decoration[]{ bounds, charPositions }
    │
    ▼
assignDecorationsToPages()
    └── 按页分配 decorations
    │
    ▼
Page[] (完整 IR)
    │
    ▼
renderPages() [preview-renderer.ts]
    ├── drawCharacter() 逐个渲染字符
    ├── drawCommentary() 双列小字
    └── drawDecoration() 7 种装饰标记
```

### 6.3 关键类型

```typescript
// Character — 正文单个字符
interface Character {
  x: number; y: number;
  char: string;
  fontFamily: string;
  fontSize: number;
  scale: number;      // ← 当前未用，需用于 （）字体放大
  rotation: number;
  color: string;
  isCommentary: boolean;
}

// Commentary — 夹批注释（每个包含一组双列小字）
interface Commentary {
  x: number; y: number;
  chars: string[];     // 拆成单字数组
  fontSize: number;
  fontFamily: string;
  color: string;
  rowHeight: number;   // 网格行高，用于竖向对齐
  side: "left" | "right";
}

// Decoration — 装饰标记
interface Decoration {
  type: "wavyLine" | "rectFrame" | "circleFrame" |
        "circleNote" | "pointNote" | "lineNote";
  bounds: { x1: number; y1: number; x2: number; y2: number };
  strokeWidth: number;
  color: string;
  charPositions: Position[];  // 逐字坐标
}
```

---

*参考：vRain v1.5 原版 Perl 代码、古籍刻本排版传统。*
