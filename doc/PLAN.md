# vRain Web 重写计划

> **目标**: 将 Perl CLI 版 vRain 重写为跨平台 Web 应用，支持可视化配置、实时预览、PDF 下载。  
> **定位**: 轻量级 — 前端 + 后端 API，配置存储在前端 localStorage / 后端 SQLite。

---

## 一、Context 背景

### 现有痛点

| 痛点 | 说明 |
|------|------|
| **Perl CLI 只限本地** | 需要本地安装 Perl + PDF::Builder + Font::FreeType + Image::Magick，Mac 友好但 Windows 几乎不可用 |
| **无实时预览** | 生成 PDF 要等几分钟，调参靠反复跑全量 |
| **vrain_mr.pl 功能缩水** | 两套代码、功能差距 500 行，维护成本高 |
| **无可视化配置** | 编辑 `.cfg` 纯文本文件，调间距/颜色/标点规则全靠试 |
| **无项目管理** | 书籍是磁盘目录，无法复用、分享、版本管理 |

### 目标

- 浏览器内打开即用，无需安装任何依赖
- 可视化配置面板，实时预览竖排效果
- 一键导出 PDF
- 统一单一代码库（消除 mr 变体差异）
- 保留 `.cfg` / `.txt` 格式可导入导出，向后兼容

---

## 二、技术栈选型

| 层 | 技术 | 理由 |
|----|------|------|
| **前端框架** | React 18 + TypeScript + Vite + TailwindCSS | 成熟生态，HMR 快，组件化配置面板 |
| **实时预览** | Canvas 2D (前端) | 逐字绘制，像素级复刻原版古籍风格，参数调好后可直接看到效果 |
| **PDF 生成** | 后端 Headless Chromium (Puppeteer) + CSS `writing-mode: vertical-rl` | 原生竖排支持，`page.pdf()` 直接导出，开发效率高 |
| **后端框架** | Fastify + TypeScript + better-sqlite3 | 高性能、类型安全、单文件数据库部署简单 |
| **布局引擎** | 纯 TypeScript (共享前端+后端) | 坐标计算/分页/文本解析不依赖浏览器，抽成纯函数库 |
| **字体检测** | `opentype.js` (Node.js) | 检测字形是否存在，替代 Font::FreeType |
| **项目管理** | SQLite (better-sqlite3) | 单文件 DB，项目配置+文本内容存库，支持导出为 JSON bundle |
| **部署** | `npm start` / 单进程 (生产) | 零容器依赖，浏览器直连 |

### 为什么预览用 Canvas、PDF 用 CSS？

| 场景 | 方案 | 原因 |
|------|------|------|
| 实时预览 | Canvas 2D 逐字渲染 | 需要逐字控制位置/字体/装饰效果，精确复刻古籍刻本美学 |
| PDF 生成 | CSS `writing-mode: vertical-rl` + Puppeteer | 原生竖排、零坐标计算开销、Chromium CJK 渲染质量高 |

---

## 三、整体架构

```
                    ┌───────────────────────────────────────────┐
                    │              vRain Web                     │
                    │                                            │
                    │  ┌─────────────┐    ┌──────────────────┐  │
                    │  │   Frontend   │    │    Backend API    │  │
                    │  │  React+TS   │◄──►│   Fastify+TS      │  │
                    │  │             │    │                   │  │
                    │  │ 配置面板     │    │ 项目 CRUD         │  │
                    │  │ 文本编辑器   │    │ 配置验证           │  │
                    │  │ Canvas 预览  │    │ PDF 生成           │  │
                    │  │ 字体选择器   │    │ 字体检测           │  │
                    │  └─────────────┘    │ 装饰渲染预览       │  │
                    │                     └──────────────────┘  │
                    │                                             │
                    │  ┌─────────────────────────────────────┐   │
                    │  │         Layout Engine (TS/JS)        │   │
                    │  │  • Config Parser (book.cfg → JSON)  │   │
                    │  │  • Grid Calculator (坐标计算)        │   │
                    │  │  • Text Parser (标点/段落处理)       │   │
                    │  │  • Pagination Controller (分页)      │   │
                    │  │  • Markup Parser (装饰标记解析)       │   │
                    │  │  • Font Resolver (opentype.js)       │   │
                    │  └─────────────────────────────────────┘   │
                    └───────────────────────────────────────────┘
```

---

## 四、核心模块设计

### 4.1 Layout Engine（布局引擎）

将原 `vrain.pl` 900+ 行渲染逻辑拆分为 6 个纯函数模块：

```
LayoutEngine
├── ConfigParser
│   ├── 解析 book.cfg → BookConfig 对象
│   ├── 解析 canvas.cfg → CanvasConfig 对象
│   └── 验证配置（类型/范围/依赖关系）
│
├── GridCalculator
│   ├── 计算 col_width, row_height
│   ├── 生成 @pos_l (正文坐标), @pos_r (批注坐标)
│   └── 处理版心中缝偏移 + 多栏布局
│
├── TextParser
│   ├── 读取文本文件
│   ├── 标点替换/删除/归一化流水线
│   ├── 提取批注 【】
│   └── 段落拼接 + 填充空格
│
├── PaginationController
│   ├── 字符位置计数器
│   ├── 分页标记: %, $, &, T, ^
│   └── 跨页批注处理
│
├── MarkupParser
│   ├── 解析装饰标记: 《》 〔〉 （） ｛｝ ＜＞ ［］
│   └── 生成装饰绘制指令
│
└── FontResolver
    ├── opentype.js 字形存在检测
    ├── 多级回退链
    └── 字体度量校准 (参考字符 "国" 高度对比)
```

**核心输出 — 中间表示 (IR)**:

```typescript
interface Page {
  pageNumber: number;
  canvas: CanvasConfig;
  title: string;
  characters: Character[];
  commentaries: Commentary[];
  decorations: Decoration[];
  marks: ControlMark[];    // %, $, &, T, ^ 控制标记
  outlineTitle?: string;
  outlinePage?: number;
}

interface Character {
  x: number;
  y: number;
  char: string;
  fontFamily: string;
  fontSize: number;
  scale: number;
  rotation: number;
  color: string;
}

interface Commentary {
  x: number;
  y: number;
  chars: string[];        // 半字符宽，双列
  fontSize: number;
  fontFamily: string;
  color: string;
}

interface Decoration {
  type: 'wavyLine' | 'rectFrame' | 'circleFrame' | 'circleNote' | 'pointNote' | 'lineNote';
  bounds: { x1: number; y1: number; x2: number; y2: number };
  strokeWidth: number;
  color: string;
}
```

### 4.2 预览渲染器（前端 Canvas 2D）

接收 Layout Engine 输出的 IR，在 Canvas 2D 上逐帧绘制：

```
PreviewRenderer
├── drawBackground(canvasConfig)    // 画布背景 + 边框 + 鱼尾 + Logo
├── drawCharacter(char)             // 单个字
├── drawCommentary(commentary)      // 夹批双列
├── drawDecoration(decoration)      // 书名号线、圆角框、圆圈等
├── drawTitle(title, page)          // 版心标题
├── drawPageNumber(page)            // 版心页码
└── drawCover(bookTitle, author)    // 封面页
```

### 4.3 PDF 渲染器（后端 Chromium）

将 IR 转换为 HTML + CSS 渲染：

```
PDFRenderer
├── IR → HTML 转换
│   ├── Character → <span style="writing-mode: vertical-rl; position: absolute; left: X; top: Y;">
│   ├── Decoration → SVG overlay
│   └── Canvas background → CSS background-image
├── Puppeteer headless page.pdf()
└── Outline/书签 注入
```

---

## 五、前端应用结构

```
frontend/
├── src/
│   ├── App.tsx                          # 路由 + 布局
│   │
│   ├── components/
│   │   ├── ProjectSidebar.tsx           # 项目树 (书籍/文本/配置)
│   │   ├── ConfigEditor.tsx             # 双面板配置编辑 (Book + Canvas)
│   │   │   ├── BookConfigEditor.tsx     # 书籍配置: 字体/颜色/标点/标记
│   │   │   └── CanvasConfigEditor.tsx   # 画布配置: 尺寸/边框/鱼尾/Logo
│   │   ├── TextEditor.tsx               # 源文本编辑器 (支持标记高亮)
│   │   ├── PreviewViewport.tsx          # Canvas 实时预览
│   │   ├── FontSelector.tsx             # 字体选择器 (带字形预览)
│   │   ├── DecorationPanel.tsx          # 装饰标记开关 + 参数滑块
│   │   ├── PunctuationPanel.tsx         # 标点规则编辑器
│   │   ├── CoverEditor.tsx              # 封面编辑器 (自定义/自动生成)
│   │   └── PdfExportPanel.tsx           # 导出选项 (测试页数/压缩)
│   │
│   ├── hooks/
│   │   ├── useLayoutEngine.ts           # 布局引擎调用
│   │   ├── useConfigState.ts            # 配置状态管理
│   │   ├── usePreview.ts                # 预览渲染循环
│   │   └── usePdfExport.ts              # PDF 导出
│   │
│   ├── lib/
│   │   ├── layout-engine.ts             # 布局引擎核心 (共享 TS)
│   │   ├── preview-renderer.ts          # Canvas 2D 渲染
│   │   ├── config-schema.ts             # 配置 JSON Schema
│   │   ├── font-resolver.ts             # opentype.js 字形检测
│   │   ├── num2zh.ts                    # 中文数字映射表
│   │   └── api-client.ts                # 后端 API 客户端
│   │
│   ├── types/
│   │   ├── config.ts                    # BookConfig, CanvasConfig 类型定义
│   │   ├── layout.ts                    # Page, Character, Decoration IR
│   │   └── font.ts                      # FontInfo 类型
│   │
│   └── styles/
│       └── ancient-theme.css             # 古风 UI 主题
```

---

## 六、后端 API 设计

```
backend/
├── src/
│   ├── app.ts                             # Fastify 服务
│   │
│   ├── routes/
│   │   ├── projects.ts                    # POST /projects, GET /projects/:id
│   │   ├── fonts.ts                       # POST /fonts/upload, GET /fonts
│   │   ├── render.ts                      # POST /render/pdf (生成 PDF)
│   │   └── export.ts                      # POST /export/bundle (导出 JSON)
│   │
│   ├── services/
│   │   ├── pdf-generator.ts               # Puppeteer headless PDF 生成
│   │   ├── font-checker.ts                # opentype.js 字形检测
│   │   ├── config-validator.ts            # 配置 Schema 验证
│   │   └── project-store.ts               # SQLite CRUD
│   │
│   └── utils/
│       ├── layout-ir-to-css.ts            # IR → HTML/CSS 转换
│       └── css-to-pdf.ts                  # Puppeteer 捕获 PDF
```

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/:id` | 获取项目详情 |
| PUT | `/api/projects/:id` | 更新项目 (配置/文本) |
| POST | `/api/fonts/upload` | 上传字体文件 (.ttf/.otf) |
| GET | `/api/fonts` | 列出已上传字体 |
| POST | `/api/render/pdf` | 生成 PDF (返回 PDF blob URL) |
| GET | `/api/render/preview` | 生成预览图 (返回 PNG) |
| POST | `/api/export/bundle` | 导出项目为 JSON bundle |
| POST | `/api/import/bundle` | 从 JSON bundle 导入项目 |

---

## 七、数据结构设计

### 7.1 BookConfig (替代 book.cfg)

```typescript
interface BookConfig {
  // 元数据
  title: string;
  author: string;
  
  // 布局
  canvasId: string;
  rowNum: number;          // 每列字数
  rowDeltaY: number;       // 末字纵向偏移
  
  // 字体链 (最多 5 级)
  fonts: FontEntry[];      // { name, filename, textPointSize, commentPointSize, rotate }
  textFontOrder: number[]; // 正文字体优先级
  commentFontOrder: number[]; // 批注字体优先级
  
  // 颜色
  textFontColor: string;
  commentFontColor: string;
  
  // 封面
  coverImage?: string;     // cover.jpg 文件引用
  coverTitleFontSize: number;
  coverTitleY: number;
  coverAuthorFontSize: number;
  coverAuthorY: number;
  coverFontColor: string;
  
  // 版心标题
  titleFontSize: number;
  titleColor: string;
  titleY: number;
  titleYDis: number;       // 字间距倍数
  titlePostfix: string;    // 卷X, X 自动替换
  titleDirectory: boolean; // 生成 PDF 书签
  
  // 页码
  pagerFontSize: number;
  pagerColor: string;
  pagerY: number;
  
  // 标点规则
  punctuationReplacements: { from: string; to: string }[];
  punctuationDeletions: string;
  noPunctuationMode: boolean;
  onlyPeriodMode: boolean;
  
  // 正文标点
  noPositionPunctuation: string;  // 不占位标点
  noPositionPunctuationSize: number;
  noPositionPunctuationOffset: { x: number; y: number };
  rotatedPunctuation: string;     // 旋转标点
  rotatedPunctuationSize: number;
  rotatedPunctuationOffset: { x: number; y: number };
  
  // 批注标点 (独立配置)
  commentNoPositionPunctuation: string;
  commentRotatedPunctuation: string;
  
  // 装饰标记
  decorativeMarks: {
    bookLine:    { enabled: boolean; width: number; color: string };
    rectFrame:   { enabled: boolean; borderType: 0|1; borderColor: string; fillColor: string };
    circleFrame: { enabled: boolean; borderType: 0|1; borderColor: string; fillColor: string };
    textZoom:    { enabled: boolean; zoomFactor: number };
    circleNote:  { enabled: boolean; offset: { x: number; y: number }; radius: number; width: number; color: string };
    pointNote:   { enabled: boolean; offset: { x: number; y: number }; size: number; color: string };
    lineNote:    { enabled: boolean; offset: { x: number; y: number }; width: number; color: string };
  };
  
  // 高级
  fontMetricAdjust: boolean;    // 字体度量校准
  fallbackBold: boolean;        // 回退字体加粗
  fallbackBoldStrokeWidth: number;
}
```

### 7.2 CanvasConfig (替代 canvas.cfg)

```typescript
interface CanvasConfig {
  // 画布基础
  width: number;
  height: number;
  color: string;
  backgroundImage?: string;
  
  // 边距
  margins: { top: number; bottom: number; left: number; right: number };
  
  // 网格
  leafCol: number;           // 列数
  leafCenterWidth: number;   // 版心中缝宽度
  
  // 多栏
  multiRows: {
    enabled: boolean;
    num: number;             // 水平栏块数
    lineWidth: number;
    separatorColor: string;
  };
  
  // 边框
  outerBorder: { width: number; color: string; hMargin: number; vMargin: number };
  innerBorder: { width: number; color: string };
  
  // 鱼尾
  fishTail: {
    top: { y: number; color: string; rectHeight: number; triHeight: number; lineWidth: number };
    bottom: { y: number; color: string; rectHeight: number; triHeight: number; lineWidth: number; direction: 0|1 };
    style: 'triangle' | 'curved';
    flowerImage?: string;
    decorativeLines: { color: string; width: number; margin: number };
  };
  
  // Logo
  logoText?: string;
  logoImage?: string;
  logoY: number;
  logoColor: string;
  logoFont: string;
  logoFontSize: number;
}
```

### 7.3 Project (SQLite)

```
projects 表
├── id (TEXT PK)
├── name (TEXT)
├── book_config (JSON)
├── canvas_config (JSON)
├── cover_image (TEXT, 文件路径)
├── created_at (INTEGER)
├── updated_at (INTEGER)

text_files 表
├── id (TEXT PK)
├── project_id (TEXT FK)
├── filename (TEXT)       // 00.txt, 01.txt, ...
├── content (TEXT)
├── sort_order (INTEGER)

uploaded_fonts 表
├── id (TEXT PK)
├── project_id (TEXT FK)
├── filename (TEXT)       // qiji-combo.ttf
├── file_path (TEXT)      // 磁盘路径
├── file_size (INTEGER)
├── uploaded_at (INTEGER)
```

---

## 八、向后兼容

| 现有格式 | 处理方式 |
|----------|----------|
| `book.cfg` | 导入时自动转换为 `BookConfig` JSON 存入 SQLite |
| `canvas.cfg` | 导入时自动转换为 `CanvasConfig` JSON 存入 SQLite |
| `text/*.txt` | 直接读取存入 `text_files` 表 |
| `fonts/*.ttf` | 上传到后端 `uploaded_fonts` 表 |
| 导出 | 支持导出为原始 `.cfg` + `.txt` 目录结构，与原版兼容 |
| 数据库 | 项目导出为 JSON Bundle (含配置 + 文本 + 字体引用) |

---

## 九、实现计划 (分阶段)

### Phase 1: 基础架构 (Weeks 1-3)

| 任务 | 产出 |
|------|------|
| 搭建 monorepo (Vite 前端 + Fastify 后端) | 可运行的空壳项目 |
| 定义 TypeScript 类型 (BookConfig, CanvasConfig, IR) | `types/` 目录 |
| 实现 ConfigParser (book.cfg / canvas.cfg → JSON) | `lib/config-parser.ts` |
| 实现 SQLite 项目 CRUD | `backend/services/project-store.ts` |
| 实现配置文件编辑 UI | `ConfigEditor.tsx` |

### Phase 2: 布局引擎核心 (Weeks 4-6)

| 任务 | 产出 |
|------|------|
| GridCalculator (坐标计算) | `lib/grid-calculator.ts` |
| TextParser (标点/段落处理) | `lib/text-parser.ts` |
| PaginationController (分页控制) | `lib/pagination-controller.ts` |
| FontResolver (opentype.js 字形检测) | `lib/font-resolver.ts` |
| 中文数字映射表 (替代 db/num2zh_jid.txt) | `lib/num2zh.ts` |

### Phase 3: 实时预览 (Weeks 7-9)

| 任务 | 产出 |
|------|------|
| Canvas 2D 预览渲染器 | `lib/preview-renderer.ts` |
| PreviewViewport 组件 | `PreviewViewport.tsx` |
| 字体选择器 (带字形预览) | `FontSelector.tsx` |
| 配置变更 → 预览即时刷新 | 端到端联调 |

### Phase 4: 装饰标记 (Weeks 10-12)

| 任务 | 产出 |
|------|------|
| 书名号线波浪线渲染 | Canvas 2D + PDF CSS |
| 圆角框/圆圈渲染 | 同上 |
| 字体放大/圈注/顿点注/行注 | 同上 |
| 装饰标记参数面板 | `DecorationPanel.tsx` |
| 夹批双列渲染 (跨页支持) | 完整支持 |

### Phase 5: PDF 生成 (Weeks 13-15)

| 任务 | 产出 |
|------|------|
| IR → HTML/CSS 转换 | `utils/ir-to-css.ts` |
| Puppeteer PDF 生成服务 | `services/pdf-generator.ts` |
| 封面页生成 | 自定义/程序化 |
| PDF 书签/Outline 生成 | 自动从章节标题 |
| 导出面板 + 下载 | `PdfExportPanel.tsx` |

### Phase 6: 整合打磨 (Weeks 16-18)

| 任务 | 产出 |
|------|------|
| 简繁对照支持 (替代 vrain_mr.pl) | 作为 BookConfig 的一个选项 |
| 项目导入导出 (JSON Bundle) | 与原版 .cfg/.txt 互转 |
| 视觉回归测试 (对比原版 PDF) | 自动化 diff 测试 |
| 文档和迁移指南 | README + 使用教程 |

---

## 十、关键决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 预览渲染 | Canvas 2D | 逐字精确控制，复刻古籍美学细节 |
| PDF 渲染 | CSS + Puppeteer | 原生竖排、开发快、CJK 渲染质量高 |
| 布局引擎语言 | 纯 TypeScript | 不需要 WASM 复杂度，TS 性能足够 |
| 字体检测 | opentype.js | 纯 JS，无需编译，npm 即用 |
| 数据存储 | SQLite | 单文件、易备份、部署简单 |
| 架构规模 | 轻量级单体 | 前端 SPA + 后端 API，无微服务开销 |
| 配置存储 | JSON 优先 | 保留 .cfg 兼容但内部用结构化 JSON |

---

## 十一、需要替换的核心依赖

| Perl 依赖 | Web 替代 |
|-----------|----------|
| `PDF::Builder` | CSS + Puppeteer `page.pdf()` |
| `Font::FreeType` | `opentype.js` |
| `Image::Magick` | Canvas 2D API (预览) / CSS (PDF) |
| `Encode::HanConvert` | `opencc4js` (简繁转换) |
| `Getopt::Std` | HTTP API / React 表单 |
| `POSIX::strftime` | `Intl.DateTimeFormat` |
| Ghostscript (`gs`) | Puppeteer `page.pdf({ compress: true })` |

---

## 十二、验证方案

1. **配置导入验证**: 用现有 `books/01/book.cfg` + `canvas/24_paper.cfg` 导入，确认解析正确
2. **预览一致性**: Canvas 2D 预览 vs 原版 PDF 逐页像素对比
3. **PDF 一致性**: Puppeteer PDF vs 原版 PDF 逐页像素对比
4. **功能矩阵测试**: 120+ 项功能逐一测试 (参考 FEATURES.md)
5. **性能基准**: 生成一本书 (< 30 页) 的总耗时 < 5 秒

---

*计划生成: 2026-06-11 | 基于 vRain v1.5.1 源码及 706 行功能清单*
