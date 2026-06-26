# vRain Web — 古典线装书风格竖排 PDF 电子书生成工具

> 跨平台可视化古籍刻本排版工具，浏览器打开即用

> 基于 [shanleiguang/vRain](https://github.com/shanleiguang/vRain) 改造，完整保留原始提交历史。原始项目为 Perl 命令行工具，本工程将其改造为 Web 应用。

![vRain](https://img.shields.io/badge/vRain-v0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-70%20passed-brightgreen)

## 简介

vRain (兀雨) 是一个将 UTF-8 纯文本转换为**仿古籍刻本风格竖排 PDF 电子书**的 Web 工具。

- **可视化配置** — 字体、颜色、间距、装饰标记、标点规则，实时预览
- **跨平台** — 浏览器打开即用，无需安装 Perl 或任何依赖
- **实时预览** — Canvas 2D 逐字渲染，参数改一下就能看效果
- **一键导出** — 生成 PDF 直接下载
- **简繁对照** — 内置后端 opencc API + 前端映射表回退

---

## 功能特性

| 功能 | 原版 vRain | vRain Web |
|------|-----------|-----------|
| 跨平台 | 需 Perl 环境 (Mac 友好，Windows 几乎不可用) | 浏览器直连，零依赖 |
| 可视化配置 | 编辑纯文本 .cfg 文件 | 实时配置面板 |
| 实时预览 | 生成 PDF 要等几分钟 | Canvas 2D 即时刷新 |
| PDF 导出 | Puppeteer + Ghostscript | Puppeteer (同源) |
| 项目管理 | 磁盘目录 | 内置项目 CRUD |
| 简繁对照 | vrain_mr.pl (独立脚本 + Encode::HanConvert) | 内置配置选项 (opencc) |
| 装饰标记 | 基础支持 | 完整支持 (书名号/框/注/放大) |
| 夹批双列 | 支持 | 支持 |

---

## 快速开始

### 环境要求

| 依赖 | 最低版本 | 说明 |
|------|:------:|------|
| Node.js | ≥ 18 | 运行环境 |
| npm | ≥ 9 | 包管理（项目使用 npm workspaces） |
| Python | ≥ 3.6 | `better-sqlite3` 原生模块编译需要（仅 `npm install` 时需要） |
| C++ 编译工具链 | — | Windows: Visual Studio Build Tools；macOS: Xcode CLI；Linux: build-essential |

### 安装

```bash
git clone <repo-url> vrain-web
cd vrain-web
npm install     # workspaces 模式，同时安装 frontend + backend 依赖
```

> **注意**：`npm install` 会触发 Puppeteer 自动下载 Chromium（~300 MB），安装时间取决于网络环境。
> 如果不需要 PDF 导出功能，可跳过：设置环境变量 `PUPPETEER_SKIP_DOWNLOAD=true` 后再 `npm install`。

### 开发模式（带热重载）

```bash
npm run dev
```

- 前端 (Vite HMR): http://localhost:3000
- 后端 (tsx watch): http://localhost:8080
- 前端通过 Vite proxy 将 `/api` 请求转发到后端，开发时无需额外配置

修改源代码后前端自动热更新，后端自动重启。

### 生产模式（单端口部署）

```bash
npm run build       # 编译前端 (tsc + vite) + 后端 (tsc)
npm run serve       # Fastify 在 localhost:8080 同时 serve 前端静态文件 + API
```

构建产物位于 `frontend/dist/` 和 `backend/dist/`。生产模式下只需要访问后端端口一个地址，`@fastify/static` 会自动将非 `/api` 请求指向前端构建产物。

### 启动脚本说明

| 命令 | 用途 | 前端 | 后端 | 适用场景 |
|------|------|------|------|----------|
| `npm run dev` | 开发（热重载） | Vite dev server | tsx watch | 日常开发 |
| `npm start` | 开发（无热重载） | Vite dev server | tsx（单次运行） | 快速验证 |
| `npm run build` | 编译构建 | tsc + vite build | tsc | 生产部署前 |
| `npm run serve` | 生产服务 | 静态文件 (Fastify serve) | Fastify | 生产部署 |

### 端口配置

通过项目根目录的 `.env.local` 文件配置端口（此文件已被 `.gitignore` 忽略）：

```bash
# .env.local
VITE_PORT=3000      # 前端开发端口
PORT=8080           # 后端端口
```

也可以通过命令行参数临时覆盖：

```bash
npm run dev -- --port 3100 --backend-port 8180
```

`start.mjs` 启动时会自动检测端口占用情况，如有冲突会提示更换。

### 运行测试

```bash
npm test            # 运行全部 70 项单元测试（vitest）
```

---

## 部署架构

vRain Web 支持两种运行模式：

### 开发模式（双端口）

```
┌──────────────┐     /api  proxy     ┌──────────────┐
│   Vite :3000  │ ──────────────────► │  tsx :8080    │
│  (前端 HMR)   │                     │  (API + 字体)  │
└──────────────┘                     └──────┬───────┘
                                            │
                                     ┌──────┴───────┐
                                     │  vrain.db     │
                                     │  (SQLite)     │
                                     └──────────────┘
```

- `npm run dev` 启动
- Vite 提供前端 HMR，`/api` 请求代理到后端
- 适合开发调试

### 生产模式（单端口）

```
                     ┌─────────────────────┐
   Browser ────────► │  Fastify :8080       │
                     │  /           → dist/ │
                     │  /api/*      → API   │
                     │  /api/fonts/ → fonts │
                     └──────────┬──────────┘
                                │
                         ┌──────┴───────┐
                         │  vrain.db     │
                         │  (SQLite)     │
                         └──────────────┘
```

- `npm run build && npm run serve` 启动
- Fastify 统一服务前端静态文件 + 后端 API
- 只需开放一个端口，适合部署到服务器

### 数据存储

- 项目数据：`backend/data/vrain.db`（SQLite，WAL 模式，启动时自动建表）
- 上传字体：`backend/uploads/fonts/`（启动时自动创建目录）
- 端口配置：`.env.local`（不进入版本控制）

---

## 使用指南

### 1. 创建项目

打开首页，输入项目名称即可创建新项目。

### 2. 配置书籍

- **书名/作者**: 显示在封面和版心标题中
- **每列字数**: 控制正文密度
- **画布 ID**: 选择预设画布 (24_black_blank, 24_paper, simple 等)
- **字体**: 支持多级字体回退链
- **颜色**: 正文/批注颜色独立设置

### 3. 编辑文本

在文本标签页输入或粘贴古文内容。使用以下装饰标记:

| 标记 | 效果 |
|------|------|
| `《书名》` | 书名号线 (波浪线) |
| `〔字〕` | 圆角矩形框 |
| `〈字〉` | 圆圈 |
| `(字)` | 文字放大 |
| `｛字｝` | 圈注 |
| `＜字＞` | 顿点注 |
| `［字］` | 行注 |
| `【批注】` | 夹批 (双列小字) |
| `%` | 分页符 |

### 4. 预览

切换到"预览"标签，实时查看竖排效果。支持缩放和翻页。

### 5. 导出 PDF

在"导出"标签页设置选项，生成 PDF 后直接下载。

### 6. 简繁对照 (替代 vrain_mr.pl)

在配置面板中勾选**"简繁对照"**，正文会自动从简体中文转为繁体中文渲染。

这替代了原版 `vrain_mr.pl` 的 `try_st=1` 字体回退机制：
- 原版: 每字渲染前检测字体是否支持，不支持则用 `Encode::HanConvert` 转换
- vRain Web: 文本解析时统一用 `opencc` 转换，预览和 PDF 效果一致

---

## 迁移指南

### 从原版 vRain 迁移到 vRain Web

1. **准备好原项目文件**

   ```
   books/01/
   ├── book.cfg
   ├── canvas.cfg       (可选)
   ├── cover.jpg        (可选)
   └── text/
       ├── 00.txt
       ├── 01.txt
       └── ...
   ```

2. **验证配置**

   - 切换到"预览"标签，确认排版效果与原版一致
   - 如有需要可微调参数

3. **生成 PDF**

   - 在"导出"标签页生成 PDF
   - 下载后与原版 PDF 对比

### 从 vrain_mr.pl 迁移

原版 `vrain_mr.pl` 的 `try_st=1` 选项在 vRain Web 中直接映射为配置:

- 在配置面板勾选 **"简繁对照"** 即可启用
- 底层使用 `opencc` 库实现，与原版 `Encode::HanConvert` 效果一致

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│                  vRain Web                   │
│                                              │
│  ┌──────────────┐    ┌───────────────────┐   │
│  │   Frontend    │    │    Backend API     │   │
│  │  React 18+TS  │◄──►│   Fastify 5+TS     │   │
│  │              │    │                    │   │
│  │ 配置面板      │    │ 项目 CRUD          │   │
│  │ 文本编辑器    │    │ PDF 生成           │   │
│  │ Canvas 预览   │    │ 字体检测           │   │
│  └──────────────┘    └───────────────────┘   │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │       Layout Engine (纯 TypeScript)     │  │
│  │  • Config Parser  • Grid Calculator     │  │
│  │  • Text Parser  • Pagination Controller │  │
│  │  • Markup Parser  • Font Resolver       │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 核心依赖替换

| Perl 依赖 | vRain Web 替代 |
|-----------|---------------|
| `PDF::Builder` | CSS + Puppeteer `page.pdf()` |
| `Font::FreeType` | `opentype.js` |
| `Image::Magick` | Canvas 2D API / CSS |
| `Encode::HanConvert` | `opencc` (简繁转换) |
| `Getopt::Std` | HTTP API / React 表单 |
| `POSIX::strftime` | `Intl.DateTimeFormat` |
| Ghostscript (`gs`) | Puppeteer `page.pdf({ compress: true })` |

---

## 项目结构

```
vrain-web/
├── frontend/                          # React 前端 (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/                # UI 组件 (13 个)
│   │   │   ├── ProjectList.tsx            # 项目列表（创建/删除，对接后端 API）
│   │   │   ├── ProjectDetail.tsx          # 主工作区（4 标签页）
│   │   │   ├── ProjectSidebar.tsx         # 项目侧边栏（文件选择/章节管理）
│   │   │   ├── ProjectLayout.tsx          # 布局容器（侧边栏 + 详情区）
│   │   │   ├── ConfigEditor.tsx           # 书籍 + 画布配置
│   │   │   ├── DecorationPanel.tsx        # 装饰标记配置（7 种独立参数）
│   │   │   ├── PunctuationPanel.tsx       # 标点规则配置（替换/删除/旋转/偏移）
│   │   │   ├── TextEditor.tsx             # 文本编辑器（含标记工具栏，14 种按钮）
│   │   │   ├── PreviewViewport.tsx        # Canvas 实时预览（缩放/翻页）
│   │   │   ├── PdfExportPanel.tsx         # PDF 导出面板
│   │   │   ├── ImportExportPanel.tsx      # JSON Bundle / .cfg+.txt 导入导出
│   │   │   ├── FontSelector.tsx           # 字体选择器
│   │   │   └── ErrorBoundary.tsx          # 错误边界（全局异常捕获）
│   │   ├── hooks/                     # 自定义 Hooks
│   │   │   ├── usePreview.ts              # 预览状态管理
│   │   │   ├── usePdfExport.ts            # PDF 导出状态
│   │   │   └── useProjectStore.ts         # 项目持久化（对接后端 API）
│   │   ├── lib/                       # 布局引擎核心（纯 TypeScript，12 个模块）
│   │   │   ├── config-parser.ts           # .cfg 文件解析
│   │   │   ├── grid-calculator.ts         # 网格坐标计算（含多栏模式）
│   │   │   ├── text-parser.ts             # 文本预处理（标点/数字/夹批）
│   │   │   ├── markup-parser.ts           # 装饰标记解析 → Decoration IR
│   │   │   ├── pagination-controller.ts   # 分页控制（5 种控制标记）
│   │   │   ├── preview-renderer.ts        # Canvas 2D 渲染（469 行）
│   │   │   ├── ir-to-css.ts              # IR → HTML/CSS（PDF 用）
│   │   │   ├── font-resolver.ts           # 字体字形检测（opentype.js）
│   │   │   ├── simp-trad.ts              # 简繁转换（API 优先 + 本地回退）
│   │   │   ├── num2zh.ts                 # 中文数字转换
│   │   │   ├── bundle.ts                 # JSON Bundle 导入/导出（v0.2，含 coverImage）
│   │   │   ├── api.ts                    # 后端 API 封装
│   │   │   ├── visual-regression.ts       # 视觉回归测试工具
│   │   │   └── __tests__/                # 70 项单元测试
│   │   ├── types/layout.ts           # IR 类型定义（前后端共享）
│   │   └── styles/                   # 全局样式
│   ├── vite.config.ts                  # Vite 配置（含 API proxy）
│   └── package.json
│
├── backend/                           # Fastify 5 API 服务器
│   ├── src/
│   │   ├── app.ts                         # 服务入口 + 路由注册 + 静态服务 + 数据库初始化
│   │   ├── routes/
│   │   │   ├── projects.ts                # 项目 CRUD（SQLite）
│   │   │   ├── fonts.ts                   # 字体上传/列表/静态服务
│   │   │   └── tools.ts                   # 简繁转换（opencc）
│   │   ├── services/
│   │   │   ├── project-store.ts           # SQLite 持久化层（better-sqlite3 + WAL）
│   │   │   └── pdf-generator.ts           # Puppeteer PDF 生成
│   │   └── types/
│   │       └── layout.ts                  # 类型 re-export（引用前端源文件）
│   ├── data/                          # SQLite 数据库（自动创建，.gitignore）
│   ├── uploads/fonts/                 # 上传字体存储
│   └── package.json
│
├── doc/                              # 文档
│   ├── PLAN.md                           # 原始开发计划
│   ├── FEATURES.md                       # 原版 vRain 功能清单（Perl）
│   ├── analysis-report.md                # CodeGraph 代码分析报告
│   ├── continue-plan.md                  # 继续开发计划
│   ├── persist-plan.md                   # 持久化 & 一键部署计划
│   ├── text-toolbar-plan.md              # 文本编辑标记工具栏计划
│   └── markup-spec.md                    # 装饰标记规范
│
├── vRain/                            # 原版 Perl 代码（参考，不参与构建）
├── start.mjs                         # 跨平台开发启动（端口检测 + 双进程管理）
├── .env.local                        # 端口配置（被 .gitignore 忽略，不会被提交）
├── .gitignore
├── package.json                      # npm workspaces 根配置
└── README.md
```

---

## 开发指南

```bash
# 安装依赖（含 Chromium 下载）
npm install

# 开发模式（前端 HMR + 后端 watch）
npm run dev

# 类型检查
npm run typecheck

# 运行测试（70 项，vitest）
npm test

# 格式化代码
npm run format
```

### 代码规范

- **TypeScript** 严格模式，前后端共享 `types/layout.ts` 类型定义
- **测试** 每个布局引擎模块有对应的 `__tests__/`，使用 `vitest`
- **格式化** Prettier，扫描范围 `frontend/src/**` + `backend/src/**`
- **后端类型** `backend/src/types/layout.ts` 通过 `export type { ... } from` 引用前端源文件，避免重复定义

### 后端 API

#### 项目管理 (SQLite 持久化)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取所有项目列表 |
| POST | `/api/projects` | 创建新项目 `{ name } → { id, name, ... }` |
| GET | `/api/projects/:id` | 获取单个项目详情 |
| PUT | `/api/projects/:id` | 更新项目配置/文本 |
| DELETE | `/api/projects/:id` | 删除项目 |

#### 工具 & 导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/tools/health` | 服务状态（含 opencc 检测） |
| POST | `/api/tools/simp2trad` | 简繁转换 `{ text } → { result }` |
| POST | `/api/render/pdf` | PDF 生成（接收 IR Page[]） |

#### 字体管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/fonts/upload` | 字体上传（.ttf/.otf/.woff2, ≤50MB） |
| GET | `/api/fonts` | 字体列表 |
| GET | `/api/fonts/file/:filename` | 字体静态文件服务 |

> **数据存储**：项目数据存储在 `backend/data/vrain.db`（SQLite + WAL 模式），启动时自动建表。
> 字体文件存储在 `backend/uploads/fonts/`。

### 测试

70 项单元测试覆盖核心布局引擎：

| 测试文件 | 数量 | 覆盖模块 |
|----------|:----:|----------|
| `config-parser.test.ts` | 17 | .cfg 解析、BookConfig/CanvasConfig 转换 |
| `text-parser.test.ts` | 13 | 标点替换/删除/句号模式/夹批提取 |
| `markup-parser.test.ts` | 15 | 7 种装饰标记剥离、包围盒计算、跨页分配 |
| `pagination-controller.test.ts` | 9 | 分页、坐标分配、控制标记、canvas 透传 |
| `grid-calculator.test.ts` | 7 | 网格尺寸、中缝偏移、多栏模式 |
| `num2zh.test.ts` | 9 | 中文数字映射、页码、标题后缀 |

---

## 项目状态

| 模块 | 状态 | 说明 |
|------|:----:|------|
| **布局引擎** | ✅ | 核心管线完整（Config → Grid → Text → Markup → Pagination → IR） |
| **Canvas 预览** | ✅ | 实时渲染封面/鱼尾/边框/夹批/7 种装饰 |
| **PDF 导出** | ✅ | IR → HTML/CSS → Puppeteer → PDF（含封面页/压缩） |
| **项目管理** | ✅ | SQLite 持久化，创建/保存/列表/删除，刷新不丢失 |
| **装饰标记** | ✅ | 7 种完整支持，配置面板可调参数 |
| **简繁对照** | ✅ | 后端 opencc API（精确转换）+ 前端映射表回退（658 字） |
| **字体管理** | ✅ | 上传/列表/静态服务，支持 .ttf/.otf/.woff2 |
| **测试** | ✅ | 70 项单元测试覆盖核心引擎 |
| **文本编辑** | ✅ | 标记工具栏一键插入装饰标记符（14 种） |
| **导入/导出** | ✅ | JSON Bundle 格式 + 原版 .cfg/.txt 兼容格式 |
| **错误处理** | ✅ | React Error Boundary + 后端优雅关闭 |

---

## 许可证

MIT © shanleiguang

---

*基于 vRain v1.5.1 源码重写 | 当前版本 v0.2.0 | 最后更新: 2026-06-26*
