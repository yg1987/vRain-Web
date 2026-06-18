# vRain Web — 古典线装书风格竖排 PDF 电子书生成工具

> Web 版 — 跨平台可视化古籍刻本排版工具

> 基于 [shanleiguang/vRain](https://github.com/shanleiguang/vRain) 改造，完整保留原始提交历史。原始项目为 Perl 命令行工具，本工程将其改造为 Web 应用。

![vRain](https://img.shields.io/badge/vRain-v0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 简介

vRain (兀雨) 是一个将 UTF-8 纯文本转换为**仿古籍刻本风格竖排 PDF 电子书**的 Web 工具。

- **可视化配置** — 字体、颜色、间距、装饰标记，实时预览
- **跨平台** — 浏览器打开即用，无需安装 Perl 或任何依赖
- **实时预览** — Canvas 2D 逐字渲染，参数改一下就能看效果
- **一键导出** — 生成 PDF 直接下载
- **简繁对照** — 内置选项替代 `vrain_mr.pl` (替代 Encode::HanConvert)
- **导入导出** — JSON Bundle 备份 / 原版 `.cfg` + `.txt` 互转

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
| 导入导出 | 手动复制目录 | JSON Bundle / .cfg 互转 |
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
# PORT=8180
```

### 开发模式

```bash
npm run dev
```

- 前端: http://localhost:5173
- 后端 API: http://localhost:8080

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

### 7. 导入/导出

在"导入/导出"标签页:

- **导出 JSON Bundle**: 将项目打包为单个 `.json` 文件，方便备份和迁移
- **导出 .cfg + .txt**: 生成原版 vRain 兼容的配置和文本文件
- **导入 JSON Bundle**: 从备份恢复项目
- **导入原版配置**: 选择 `book.cfg` + `canvas.cfg` + `.txt` 文件

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

2. **在 vRain Web 中导入**

   - 打开"导入/导出"标签页
   - 选择 `book.cfg`（需同时选择 `canvas.cfg` 和 `.txt` 文件）
   - 或者选择之前导出的 JSON Bundle

3. **验证配置**

   - 切换到"预览"标签，确认排版效果与原版一致
   - 如有需要可微调参数

4. **生成 PDF**

   - 在"导出"标签页生成 PDF
   - 下载后与原版 PDF 对比

### 从 vrain_mr.pl 迁移

原版 `vrain_mr.pl` 的 `try_st=1` 选项在 vRain Web 中直接映射为配置:

- 在配置面板勾选 **"简繁对照"** 即可启用
- 底层使用 `opencc` 库实现，与原版 `Encode::HanConvert` 效果一致

### 导出为原版兼容格式

在"导入/导出"标签页点击 **"导出 .cfg + .txt (原版兼容)"**，会下载:

- `项目名-book.cfg` — 书籍配置
- `项目名-canvas.cfg` — 画布配置
- `00.txt`, `01.txt` ... — 文本文件

这些文件可以直接放回原版 vRain 的 `books/` 目录中使用。

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
│  │ 导入/导出     │    │                    │   │
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
├── frontend/                 # React 前端应用
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── ConfigEditor.tsx
│   │   │   ├── TextEditor.tsx
│   │   │   ├── PreviewViewport.tsx
│   │   │   ├── PdfExportPanel.tsx
│   │   │   └── ImportExportPanel.tsx
│   │   ├── hooks/           # 自定义 hooks
│   │   │   ├── usePreview.ts
│   │   │   └── usePdfExport.ts
│   │   ├── lib/             # 布局引擎 / 工具函数
│   │   │   ├── config-parser.ts
│   │   │   ├── grid-calculator.ts
│   │   │   ├── text-parser.ts
│   │   │   ├── pagination-controller.ts
│   │   │   ├── markup-parser.ts
│   │   │   ├── font-resolver.ts
│   │   │   ├── preview-renderer.ts
│   │   │   ├── ir-to-css.ts
│   │   │   ├── simp-trad.ts          # 简繁转换
│   │   │   ├── bundle.ts             # JSON Bundle
│   │   │   └── visual-regression.ts  # 视觉回归测试
│   │   ├── types/           # TypeScript 类型定义
│   │   └── styles/          # 全局样式
│   └── package.json
│
├── backend/                  # Fastify API 服务器
│   ├── src/
│   │   ├── app.ts
│   │   ├── services/
│   │   │   └── pdf-generator.ts
│   │   └── types/
│   │       └── layout.ts
│   └── package.json
│
├── vRain/                    # 原版 Perl 代码 (参考)
├── start.mjs                 # 跨平台一键启动 (Node.js)
├── .env.local                # 端口配置
├── PLAN.md                   # 开发计划
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

# 格式化
npm run format

# 构建
npm run build
```

---

## 许可证

MIT © shanleiguang

---

*基于 vRain v1.5.1 源码重写 | 计划生成: 2026-06-11*
