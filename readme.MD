# vRain Web — 古典线装书风格竖排 PDF 电子书生成工具

> Web 版 — 跨平台可视化古籍刻本排版工具

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

- Node.js ≥ 18
- npm ≥ 9

### 安装

```bash
cd vrain-web
npm install
```

### 一键启动 (推荐)

```bash
# 自动检测端口冲突，按需提示更换
npm start
```

### 指定端口

```bash
# 方式一：命令行参数
npm start -- --port 3100 --backend-port 8180

# 方式二：编辑 .env.local
# VITE_PORT=3100
# VITE_BACKEND_PORT=8180
```

### 开发模式

```bash
npm run dev
```

- 前端: http://localhost:3000（可通过 `VITE_PORT` 环境变量修改）
- 后端 API: http://localhost:8080

### 测试

```bash
# 运行全部 70 项单元测试
npm test
```

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

4. **生成 PDF**

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
├── frontend/                          # React 前端 (Vite + TypeScript)
│   ├── src/
│   │   ├── components/                # UI 组件
│   │   │   ├── ProjectList.tsx            # 项目列表 (支持创建/删除)
│   │   │   ├── ProjectDetail.tsx          # 主工作区 (4 标签页)
│   │   │   ├── ProjectSidebar.tsx         # 项目侧边栏
│   │   │   ├── ProjectLayout.tsx          # 布局容器
│   │   │   ├── ConfigEditor.tsx           # 书籍+画布配置
│   │   │   ├── DecorationPanel.tsx        # 装饰标记配置 (7 种)
│   │   │   ├── PunctuationPanel.tsx       # 标点规则配置
│   │   │   ├── TextEditor.tsx             # 文本编辑器
│   │   │   ├── PreviewViewport.tsx        # Canvas 实时预览
│   │   │   ├── PdfExportPanel.tsx         # PDF 导出面板
│   │   │   ├── FontSelector.tsx           # 字体选择器
│   │   │   └── ErrorBoundary.tsx          # 错误边界
│   │   ├── hooks/                     # 自定义 hooks
│   │   │   ├── usePreview.ts              # 预览状态管理
│   │   │   ├── usePdfExport.ts            # PDF 导出
│   │   │   └── useProjectStore.ts         # 项目持久化 (localStorage)
│   │   ├── lib/                       # 布局引擎 (纯 TypeScript)
│   │   │   ├── config-parser.ts           # .cfg 文件解析
│   │   │   ├── grid-calculator.ts         # 网格坐标计算
│   │   │   ├── text-parser.ts             # 文本预处理 (标点/数字/夹批)
│   │   │   ├── pagination-controller.ts   # 分页控制
│   │   │   ├── markup-parser.ts           # 装饰标记解析 + Decoration IR
│   │   │   ├── font-resolver.ts           # 字体字形检测 (opentype.js)
│   │   │   ├── preview-renderer.ts        # Canvas 2D 渲染
│   │   │   ├── ir-to-css.ts              # IR → HTML/CSS (PDF)
│   │   │   ├── simp-trad.ts              # 简繁转换 (API优先+本地回退)
│   │   │   ├── num2zh.ts                 # 中文数字转换
│   │   │   ├── visual-regression.ts       # 视觉回归测试工具
│   │   │   └── __tests__/                # 70 项单元测试
│   │   ├── types/layout.ts           # IR 类型定义
│   │   └── styles/                   # 全局样式
│   └── package.json
│
├── backend/                           # Fastify API 服务器
│   ├── src/
│   │   ├── app.ts                         # 服务入口 + 路由注册
│   │   ├── routes/
│   │   │   ├── fonts.ts                   # 字体上传/列表/静态服务
│   │   │   └── tools.ts                   # 简繁转换 (opencc)
│   │   ├── services/
│   │   │   └── pdf-generator.ts           # Puppeteer PDF 生成
│   │   └── types/
│   │       └── layout.ts                  # 类型 (re-export 自前端)
│   ├── uploads/fonts/                # 上传字体存储
│   └── package.json
│
├── doc/                              # 文档
│   ├── PLAN.md                           # 原始开发计划
│   ├── FEATURES.md                       # 完整功能清单
│   ├── analysis-report.md                # Codegraph 分析报告
│   └── continue-plan.md                  # 继续开发计划
│
├── vRain/                            # 原版 Perl 代码 (参考)
├── start.mjs                         # 跨平台一键启动
├── .env.local                        # 端口配置
└── README.md
```

---

## 开发

```bash
# 安装依赖
npm install

# 开发模式 (前端 HMR + 后端热重载)
npm run dev

# 类型检查
npm run typecheck

# 运行测试 (70 项)
npm test

# 格式化
npm run format

# 生产构建
npm run build
```

### 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/tools/health` | 服务状态 (含 opencc 检测) |
| POST | `/api/tools/simp2trad` | 简繁转换 `{ text } → { result }` |
| POST | `/api/render/pdf` | PDF 生成 |
| POST | `/api/fonts/upload` | 字体上传 (.ttf/.otf/.woff2, ≤50MB) |
| GET | `/api/fonts` | 字体列表 |
| GET | `/api/fonts/file/:filename` | 字体静态文件 |

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

- **布局引擎**: 核心管线完整 (Config → Grid → Text → Markup → Pagination → IR)
- **预览**: Canvas 2D 实时渲染 (封面/鱼尾/边框/夹批)
- **PDF 导出**: IR → HTML/CSS → Puppeteer → PDF
- **项目管理**: localStorage 持久化，创建/保存/列表/自动保存
- **装饰标记**: 7 种完整支持，配置面板可调参数
- **简繁对照**: 后端 opencc API + 前端映射表双保险
- **字体管理**: 上传/列表/静态服务

---

## 许可证

MIT © shanleiguang

---

*基于 vRain v1.5.1 源码重写 | 当前版本 v0.2.0 | 最后更新: 2026-06-18*
