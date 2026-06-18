# vRain Web 项目分析报告

> 生成日期: 2026-06-18
> 分析工具: CodeGraph v1.0.1
> 项目路径: `D:\claudeDesk\zhushu\vrain-web`

---

## 一、项目概述

**vRain (兀雨)** — 将 UTF-8 纯文本转换为**仿古籍刻本风格竖排 PDF 电子书**的 Web 工具。

- 原项目: [shanleiguang/vRain](https://github.com/shanleiguang/vRain)（Perl 命令行工具）
- 本工程: 将其改造为 Web 应用（浏览器打开即用，零依赖）
- **版本**: v0.1.0 | **许可证**: MIT | **作者**: shanleiguang
- **技术栈**: React 18 + TypeScript + Vite (前端) / Fastify 5 + TypeScript (后端) / Puppeteer (PDF 生成)

---

## 二、项目结构

```
vrain-web/
├── frontend/                          # React 前端 (Vite)
│   ├── src/
│   │   ├── components/                # 10 个 UI 组件
│   │   │   ├── ProjectList.tsx            # 项目列表页
│   │   │   ├── ProjectDetail.tsx          # 主工作区 (含 4 个标签页)
│   │   │   ├── ProjectSidebar.tsx         # 侧边栏
│   │   │   ├── ProjectLayout.tsx          # 布局容器
│   │   │   ├── ConfigEditor.tsx           # 配置面板
│   │   │   ├── TextEditor.tsx             # 文本编辑器
│   │   │   ├── PreviewViewport.tsx        # Canvas 预览
│   │   │   ├── PdfExportPanel.tsx         # PDF 导出面板
│   │   │   ├── ImportExportPanel.tsx      # 导入/导出面板
│   │   │   └── FontSelector.tsx           # 字体选择器
│   │   ├── hooks/                     # 2 个自定义 Hook
│   │   │   ├── usePreview.ts              # 预览状态管理
│   │   │   └── usePdfExport.ts            # PDF 导出状态管理
│   │   ├── lib/                       # 布局引擎核心 (12 个模块)
│   │   │   ├── config-parser.ts           # .cfg 文件解析
│   │   │   ├── grid-calculator.ts         # 网格计算 (列宽/行高/坐标)
│   │   │   ├── text-parser.ts             # 文本预处理 (标点/数字/夹批)
│   │   │   ├── markup-parser.ts           # 装饰标记解析
│   │   │   ├── pagination-controller.ts   # 分页控制
│   │   │   ├── preview-renderer.ts        # Canvas 2D 渲染 (469 行)
│   │   │   ├── ir-to-css.ts               # IR → HTML/CSS (PDF 用)
│   │   │   ├── font-resolver.ts           # 字体解析 (opentype.js)
│   │   │   ├── simp-trad.ts               # 简繁转换映射表
│   │   │   ├── bundle.ts                  # JSON Bundle 导入/导出
│   │   │   ├── num2zh.ts                  # 数字转中文
│   │   │   └── visual-regression.ts       # 视觉回归测试
│   │   ├── types/
│   │   │   └── layout.ts              # IR 类型定义 (Page, BookConfig, CanvasConfig...)
│   │   └── styles/                    # 全局样式
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                           # Fastify 后端
│   ├── src/
│   │   ├── app.ts                         # API 入口
│   │   ├── services/
│   │   │   └── pdf-generator.ts           # Puppeteer PDF 生成
│   │   └── types/
│   │       └── layout.ts                  # 后端类型 (复用前端 IR)
│   └── package.json
│
├── tests/                             # 测试目录 (空)
│   ├── layout-engine/
│   └── visual-regression/
│
├── doc/                               # 文档
│   └── analysis-report.md                 # 本文件
│
├── start.mjs                          # 一键启动脚本
├── .env.local                         # 端口配置
├── package.json                       # 根 package.json (workspace)
├── PLAN.md                            # 开发计划
└── README.md                          # 项目说明
```

---

## 三、核心数据流

```
┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌──────────────────┐
│  .cfg     │→  │ ConfigParser  │→  │ BookConfig│   │   Canvas 预览    │
│  文件     │   │ parseBookCfg  │   │          │   │  preview-        │
│          │   │ parseCanvasCfg │→  │CanvasCfg │   │  renderer.ts     │
├──────────┤   └──────┬───────┘   └─────┬────┘   │  ← 469 行        │
│ .txt     │          │                  │        └────────┬─────────┘
│ 文本文件  │          ▼                  ▼                  │
├──────────┤   ┌──────────────┐   ┌──────────┐              ▼
│ 文本输入  │→  │  text-       │→  │  字符流   │   ┌──────────────────┐
│          │   │  parser.ts   │   │  + 夹批   │   │   ir-to-css.ts    │
└──────────┘   └──────┬───────┘   └────┬─────┘   │   → HTML → PDF   │
                      │                │         └──────────────────┘
                      ▼                ▼
               ┌──────────────┐   ┌──────────┐
               │  grid-        │   │  markup- │
               │  calculator   │   │  parser  │
               │  computeGrid  │   │  装饰标记 │
               │  Metrics()    │   │  解析     │
               └──────┬───────┘   └────┬─────┘
                      │                │
                      ▼                ▼
               ┌──────────────────────────┐
               │  pagination-controller   │
               │  paginate() 分页+控制标记  │
               │  %换页 $半页 &末列 T前进   │
               └──────────┬───────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   IR Page[]  │ ← 前后端共享的中间表示
                   └──────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
   ┌──────────────────┐       ┌──────────────────┐
   │  PreviewRenderer  │       │   pdf-generator   │
   │  Canvas 2D 逐字    │       │   Puppeteer       │
   │  渲染 (前端)      │       │   page.pdf()      │
   └──────────────────┘       └──────────────────┘
```

---

## 四、核心模块详解

### 4.1 类型系统 (`frontend/src/types/layout.ts`, 218 行)

前后端共享的 **中间表示 (Intermediate Representation)**：

| 类型 | 作用 | 关键字段 |
|------|------|----------|
| `Page` | 单页 IR | `pageNumber`, `canvas`, `characters`, `commentaries`, `decorations`, `marks` |
| `Character` | 字符 | `x`, `y`, `char`, `fontFamily`, `fontSize`, `scale`, `rotation`, `color` |
| `Commentary` | 夹批（双列小字） | `x`, `y`, `chars[]`, `fontSize`, `side: "left"\|"right"` |
| `Decoration` | 装饰 | `type`(6 种), `bounds`, `strokeWidth`, `color` |
| `ControlMark` | 控制标记 | `"pageBreak"\|"halfPage"\|"lastColumn"\|"nextColumn"\|"advanceRow"` |
| `BookConfig` | 书籍配置 | 字体(5级)、颜色、标点规则、装饰开关(7种)、简繁对照 |
| `CanvasConfig` | 画布配置 | 尺寸、边距、栏数(leafCol)、中缝宽、鱼尾、外框/内框、多栏模式 |

### 4.2 Config Parser (`frontend/src/lib/config-parser.ts`, ~270 行)

- `parseCfg(text)` — 解析原版 `.cfg` 格式的 `key=value` 文本（含内联注释处理）
- `parseBookConfig(raw)` — 将配置映射转为 `BookConfig` 对象
  - 支持 5 级字体回退链
  - 7 种装饰标记独立开关
  - 标点替换/删除/旋转/偏移等精细控制
- `parseCanvasConfig(raw)` — 转为 `CanvasConfig`
  - 支持两种鱼尾模型：简易鱼尾 (`simple.cfg`) 和分体鱼尾 (`split.cfg`)

### 4.3 Grid Calculator (`frontend/src/lib/grid-calculator.ts`, 267 行)

移植自原版 `vrain.pl` lines 250-318：

- `computeGridMetrics(canvas, rowNum)` — 计算网格尺寸
  - `colWidth = (canvasW - ml - mr - leafCenterW) / leafCol`
  - `rowHeight = canvasH - mt - mb`
  - 支持多栏模式 (`multiRows.enabled`)
- `generatePositionGrid(canvas, grid, rowNum, rowDeltaY)` — 生成逐字坐标
  - 标准模式：从右向左逐列，从上到下逐行
  - 多栏模式：按水平条带划分
  - 中缝偏移：左半列和右半列不同公式

### 4.4 Text Parser (`frontend/src/lib/text-parser.ts`, ~240 行)

文本预处理管道，执行顺序严格：

1. **简繁转换** — 调用 `simp-trad.ts` 的映射表
2. **标点替换** — 正则替换（如 `, → ，`）
3. **数字替换** — 阿拉伯数字 → 中文数字
4. **标点删除** — 删除指定字符
5. **无标点模式** — 删除所有非必要标点
6. **统一句号模式** — 所有标点 → 句号，合并连续句号
7. **空格转换** — `@` → 空格
8. **夹批提取** — `【批注】` 提取为独立批注，正文移除标记
9. **段落标记去除** — 删除 `T` 开头的控制字符

### 4.5 Markup Parser (`frontend/src/lib/markup-parser.ts`, 207 行)

解析装饰标记符并生成 `Decoration` IR：

| 标记 | 装饰类型 | 说明 |
|------|----------|------|
| `《text》` | `wavyLine` | 书名号线（波浪线） |
| `〔text〕` | `rectFrame` | 圆角矩形框 |
| `〈text〉` | `circleFrame` | 圆圈 |
| `（text）` | `textZoom` | 字体放大 |
| `｛text｝` | `circleNote` | 圈注 |
| `＜text＞` | `pointNote` | 顿点注 |
| `［text］` | `lineNote` | 行注 |
| `【text】` | (夹批) | 提取为 Commentary |

控制标记：`%`(换页) `$`(半页) `&`(末列) `^`(多栏跳) `T`(前进一行)

### 4.6 Pagination Controller (`frontend/src/lib/pagination-controller.ts`, 252 行)

移植自原版 `vrain.pl` main loop (lines 553-936)：

- `paginate(canvas, config, grid, characters, commentaryData, decorations)` — 核心分页函数
- 分页逻辑：
  - 按网格容量 (`pageCharsNum = colNum * rowNum`) 分配字符
  - 处理 5 种控制标记
  - **页尾检查**：不占位标点保留在当前页，不推到下一页
  - **批注处理**：批注字符不占正文位置
- `createNewPage()` — 硬编码默认画布 (2480×1860, 24列, 30行)

### 4.7 输出渲染管线

#### 前端预览 (`frontend/src/lib/preview-renderer.ts`, 469 行)

- Canvas 2D 渲染，支持 `devicePixelRatio` 高清输出
- `drawCover()` — 仿古纸张背景（#f2ead9），竖排书名/作者
- `drawPage()` — 逐字渲染（`fillText`），竖排显示
  - 背景 → 外框/内框 → 鱼尾 → 版心标题 → 正文 → 夹批 → 装饰
- `drawFishTail()` — 支持三角鱼尾和曲线鱼尾
- 装饰渲染：波浪线 (`<path>`)、矩形框 (`strokeRect`)、圆圈 (`arc`)

#### 后端 PDF (`frontend/src/lib/ir-to-css.ts` 333 行 + `backend/src/services/pdf-generator.ts` 147 行)

- `pageToHtml()` / `pagesToHtml()` — IR → HTML + CSS
  - 字符: `<span class="vrain-char" style="writing-mode:vertical-rl">`
  - 夹批: `<div class="vrain-commentary">`
  - 装饰: `<svg>` 覆盖层
  - 背景: CSS `background` 或 Canvas 截图
- `generatePdf()` — Puppeteer headless Chromium 渲染
  - 浏览器单例（lazy init，优雅关闭）
  - 设置视口匹配画布尺寸
  - `page.pdf()` 输出，支持压缩

### 4.8 Font Resolver (`frontend/src/lib/font-resolver.ts`, 236 行)

- 基于 `opentype.js` 的字形存在检测 (`hasGlyph()`)
- 多级字体回退链
- 字体度量校准（参考字符高度对比）
- 加载缓存（`Map<string, FontCacheEntry>`）

### 4.9 简繁转换 (`frontend/src/lib/simp-trad.ts`, 658 行)

- **硬编码映射表**：658 个简体汉字 → 繁体
- 替代原版 `vrain_mr.pl` 的 `Encode::HanConvert` 和字体回退机制
- `simplifyToTraditional(text)` — 逐字转换，非汉字自动跳过

---

## 五、后端 API

| 路由 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/api/health` | GET | ✅ 实现 | 健康检查 |
| `/api/render/pdf` | POST | ✅ 实现 | PDF 生成（接收 IR → 返回 PDF 文件） |
| `/api/projects` | GET | ⬜ 占位 | 返回 `{ projects: [] }` |
| `/api/projects` | POST | ⬜ 占位 | 返回 `{ id: "placeholder-id" }` |
| `/api/fonts/upload` | POST | ⬜ 占位 | 返回占位消息 |

---

## 六、Codegraph 统计

| 指标 | 数值 |
|------|------|
| 索引文件 | 40 |
| 代码节点 | 335 |
| 引用边 | 1,019 |
| 数据库大小 | 1.41 MB |

**按语言分布**：

| 语言 | 文件数 |
|------|--------|
| TypeScript | 24 |
| TSX | 12 |
| JavaScript | 3 |
| YAML | 1 |

**按节点类型**：

| 类型 | 数量 |
|------|------|
| function | 106 |
| import | 85 |
| interface | 47 |
| file | 39 |
| constant | 31 |
| method | 10 |
| type_alias | 7 |
| variable | 6 |
| property | 3 |
| class | 1 |

**关键调用链 (Blast Radius)**：

| 符号 | 调用方 | 测试覆盖 |
|------|--------|----------|
| `Page` | 3 个调用方 (backend) | ⚠️ 无 |
| `ConfigMap` | 5 个调用方 | ⚠️ 无 |
| `getMarkerType` | 1 个调用方 | ⚠️ 无 |
| `parseReplacePairs` | 1 个调用方 | ⚠️ 无 |

---

## 七、项目成熟度评估

### ✅ 已完成

- 布局引擎核心逻辑完整移植（Config → Grid → Text → Pagination → IR）
- 前后端共享的 IR 类型系统
- Canvas 2D 预览渲染（含封面、鱼尾、边框、夹批）
- 后端 PDF 生成管线（IR → HTML/CSS → Puppeteer → PDF）
- 简繁转换映射表（658 汉字）
- JSON Bundle 导入/导出
- 原版 `.cfg` + `.txt` 兼容格式导入/导出
- 一键启动脚本（端口检测、冲突处理、环境变量配置）

### ⬜ 待完成 / 已知问题

| 模块 | 状态 | 详细说明 |
|------|------|----------|
| **项目 CRUD** | ⬜ 占位 | GET 返回空数组，POST 返回占位 ID，无持久化 |
| **字体上传** | ⬜ 占位 | 端点未实现，前端 FontSelector 组件存在但无后端支撑 |
| **配置持久化** | ⬜ 未实现 | 当前使用 `/api/projects` 占位，配置数据仅在内存中 |
| **测试** | ⬜ 空目录 | `tests/layout-engine/` 和 `tests/visual-regression/` 均为空 |
| **装饰 Decoration IR 生成** | ⚠️ 部分完成 | `markup-parser.ts` 解析时只跳过标记字符，未生成 Decoration IR；`paginate()` 传 `[]` |
| **createNewPage 默认画布** | ⚠️ 硬编码 | `pagination-controller.ts` 第 202-222 行硬编码了默认画布参数，未使用传入的 `canvasConfig` |
| **前端构建产物静态服务** | ⚠️ 注释掉 | `backend/src/app.ts` 第 16 行 `staticPlugin` 注册被注释 |
| **preview-renderer 坐标** | ⚠️ 未对接 | 渲染时使用 `ch.x`/`ch.y`，但 `paginate()` 中的 `createNewPage()` 填充的 `Character.x`/`y` 均为 0；坐标填充逻辑需在 position grid 和 IR 之间对接 |
| **字体下载路径** | ⚠️ 未实现 | `FontResolver.loadFont(fontUrl)` 通过 fetch 加载，但项目中无字体文件的静态服务端点 |

### 🔴 风险点

1. **简繁转换映射表不完整**：658 个汉字远未覆盖 Unicode CJK 统一汉字（20,992 个），古籍特有异体字/生僻字可能遗漏
2. **opentype.js 体积**：WASM 加载 + 字体解析对大文件（如 60MB 的「汉明」字体）可能影响性能
3. **Puppeteer 依赖**：在受限环境（CI、无头服务器）中需要额外配置 `--no-sandbox` 参数
4. **无错误边界**：前端组件缺少 React Error Boundary，渲染异常可能导致白屏

---

## 八、改进建议（按优先级）

1. **🔴 内存配置 → 本地持久化** — 使用 `localStorage` 或 `IndexedDB` 存储项目数据，让「项目 CRUD」真正可用
2. **🔴 对接 Position Grid 与 Page IR** — `paginate()` 需要接收 `Position[]` 并将坐标填入 `Character.x/y`
3. **🟡 补齐测试** — 布局引擎核心函数（`computeGridMetrics`, `paginate`, `parseBookConfig`, `preprocessLine`）应优先编写单元测试
4. **🟡 字体服务端点** — 后端提供 `/api/fonts/:filename` 静态服务，或前端配置 `public/` 目录
5. **🟢 generateCoverHtml 实现** — 当前 `generateCoverHtml()` 在 `ir-to-css.ts` 中只有占位符
6. **🟢 静态文件服务** — 解除 `staticPlugin` 注释，使后端可直接 serve 前端构建产物用于生产部署
