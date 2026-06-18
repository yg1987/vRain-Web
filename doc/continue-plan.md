# vRain Web 继续开发计划

> 基于: `analysis-report.md` (实际代码分析) + `PLAN.md` (原始计划) + `FEATURES.md` (完整功能清单)  
> 生成日期: 2026-06-18

---

## 一、总览：计划 vs 实际

### 原始 PLAN.md 六阶段完成度

| 阶段 | 计划任务 | 完成度 | 说明 |
|------|----------|:------:|------|
| **Phase 1**: 基础架构 | 5 项 | 3/5 ✅ | CRUD 和 SQLite 未实现 |
| **Phase 2**: 布局引擎核心 | 5 项 | 5/5 ✅ | 全部完成 |
| **Phase 3**: 实时预览 | 4 项 | 2/4 ⚠️ | 坐标未对接、字体上传缺后端 |
| **Phase 4**: 装饰标记 | 5 项 | 0/5 ❌ | 解析器跳过标记但不生成 Decoration IR |
| **Phase 5**: PDF 生成 | 5 项 | 3/5 ⚠️ | 封面页和书签未实现 |
| **Phase 6**: 整合打磨 | 4 项 | 2/4 ⚠️ | 测试空目录 |

### 整体进度估算

| 维度 | 数值 |
|------|------|
| 总代码行 (不含 node_modules) | ~3,500 行 |
| 布局引擎核心 | ✅ 90% 完成 |
| 前后端管线 | ✅ 70% 完成 |
| UI 组件 | ✅ 60% 完成 |
| 后端 API | ⬜ 20% 完成 |
| 装饰渲染 | ❌ 0% 完成 |
| 测试 | ❌ 0% |
| **综合** | **~45%** |

---

## 二、差距分析（按优先级）

### P0 — 阻塞级（必须先修复，否则产品不可用）

| # | 差距 | 具体问题 | 影响 | 涉及文件 |
|---|------|----------|------|----------|
| **P0-1** | **Position Grid ↔ Page IR 坐标未对接** | `computeGridMetrics()` + `generatePositionGrid()` 计算了精确坐标，但 `paginate()` 中的 `createNewPage()` 硬编码默认画布，`Character.x`/`y` 全为 0 | 前端 Canvas 渲染和后端 PDF 所有字符都在 (0,0) 堆叠——预览和 PDF 完全不可用 | `pagination-controller.ts`, `grid-calculator.ts`, `usePreview.ts` |
| **P0-2** | **Decoration IR 未生成** | `markup-parser.ts` 的 `parseMarkup()` 只跳过装饰标记字符，不产生 `Decoration[]`；`paginate()` 传入空数组 `[]` | 所有装饰标记（书名号线、圆角框、圆圈、圈注等）在预览和 PDF 中完全无效 | `markup-parser.ts`, `pagination-controller.ts` |
| **P0-3** | **项目 CRUD 无持久化** | `/api/projects` GET/POST 返回空数据/占位 ID，所有配置仅在内存中 | 刷新页面数据丢失，无法真正使用 | `backend/src/app.ts`, 需新建 `project-store.ts` |

### P1 — 高优先级（影响核心功能体验）(已全部解决)

| # | 差距 | 状态 | 解决方案 |
|---|------|:----:|----------|
| **P1-1** | **封面页 HTML 未实现** | ✅ 已实现 | `generateCoverHtml()` 在 `ir-to-css.ts` 中已完整实现（古纸背景、中缝线、书名作者竖排） |
| **P1-2** | **PDF Outline/书签未实现** | ⚠️ 部分实现 | `generateOutlineCss()` 使用 CSS Paged Media `bookmark-*` 属性。现代 Chromium 不支持 CSS 书签，如需完整书签功能需用 `pdf-lib` 后处理 |
| **P1-3** | **字体上传端点占位** | ✅ 已实现 | 新建 `backend/src/routes/fonts.ts`：POST 上传 + GET 列表 + 静态服务 (`/api/fonts/file/:filename`)，限 50MB，支持 .ttf/.otf/.woff2 |
| **P1-4** | **简繁转换映射表不完整** | ✅ 已实现 | 新增 `backend/src/routes/tools.ts` 使用 `opencc` 原生包做精确转换；前端 `simp-trad.ts` 优先调用 API，失败时回退本地 658 字映射表 |

### P2 — 中优先级（完善和优化）(已全部解决)

| # | 差距 | 状态 | 解决方案 |
|---|------|:----:|----------|
| **P2-1** | **装饰渲染 UI 面板缺失** | ✅ 已实现 | 新建 `DecorationPanel.tsx`（7 种装饰开关+滑块/颜色/下拉参数）+ `PunctuationPanel.tsx`（标点替换/删除/无标点/句号/不占位/旋转/批注独立配置）；集成到 ProjectDetail 配置标签页 |
| **P2-2** | `createNewPage()` **硬编码默认画布** | ✅ 已在 P0-1 修复 | — |
| **P2-3** | **静态文件服务被注释** | ✅ 已实现 | 解除 `@fastify/static` 注释，serve `frontend/dist` 目录用于生产部署 |
| **P2-4** | **字体下载路径未实现** | ✅ 已在 P1-3 修复 | — |
| **P2-5** | **多栏模式坐标** | ✅ 已修复 | `computeMultirowPosition()` 重写：按 bandIndex×rowsPerBand+rowInBand 计算条带内 Y 坐标，末行 rowDeltaY 偏移生效，非简单复用标准逻辑 |
| **P2-6** | **后端类型定义重复** | ✅ 已消除 | `backend/src/types/layout.ts` 改为 `export type { ... } from "../../../frontend/src/types/layout"`，单一数据源 |

### P3 — 低优先级（打磨和测试）(已全部解决)

| # | 差距 | 状态 | 解决方案 |
|---|------|:----:|----------|
| **P3-1** | **测试覆盖不足** | ✅ 70 测试通过 | `frontend/src/lib/__tests__/` 下已有 6 个测试文件（70 项），覆盖 config-parser/grid-calculator/text-parser/pagination-controller/num2zh/markup-parser。补写了 15 个 markup-parser 测试（提取装饰范围/解析包围盒/分配页面）和 3 个 pagination 坐标/装饰测试 |
| **P3-2** | **缺少 Error Boundary** | ✅ 已实现 | 新建 `components/ErrorBoundary.tsx`，支持自定义 fallback UI + 重试按钮；集成到 App.tsx 根级 |
| **P3-3** | **coverImage 支持** | ✅ 已实现 | `VrainBundle` 新增可选字段 `coverImage` (base64 data URL)；`createBundle` 接受 `coverImage` 参数；版本升至 v0.2，向后兼容 v0.1 |
| **P3-4** | **视觉回归测试** | ⏸️ 搁置 | 需要原版 Perl 输出的 PDF 作为 baseline，目前无可用文件 |
| **P3-5** | **性能基准测试** | ⏸️ 搁置 | 需要运行时环境实际的基准数据 |

---

## 三、继续开发推荐路线

### Sprint 1: 核心修复（让产品跑起来）

**目标**: 解决 P0 阻塞项，使基本的预览和 PDF 导出可用

| 任务 | 预估工作量 | 说明 |
|------|:----------:|------|
| **S1-1** Position Grid → Page IR 对接 | 2 天 | `paginate()` 接收 `Position[]`，将坐标填入 `Character.x/y`；`usePreview.buildPages()` 传递 positions |
| **S1-2** Decoration IR 生成 | 2 天 | `markup-parser.ts` 生成 `Decoration[]`；`paginate()` 接收并传递；`preview-renderer.ts` 实现装饰绘制 |
| **S1-3** 项目 CRUD + localStorage 持久化 | 2 天 | 前端用 `localStorage` 或 `IndexedDB` 实现项目增删改查；修复 `ProjectList.tsx` 展示真实项目列表 |
| **S1-4** `createNewPage()` 参数化 | 0.5 天 | 去掉硬编码默认值，使用传入的 `canvasConfig` |

**产出**: 用户可创建项目 → 配置书籍 → 编辑文本 → 实时预览（含坐标准确、装饰可见）

---

### Sprint 2: 功能完善（补全核心体验）

**目标**: 解决 P1 项，使 PDF 导出、字体管理、封面页可用

| 任务 | 预估工作量 | 说明 |
|:-----|:----------:|------|
| **S2-1** `generateCoverHtml()` 实现 | 1 天 | 将 `preview-renderer.ts` 中 `drawCover()` 的逻辑翻译为 HTML/CSS |
| **S2-2** PDF Outline 生成 | 1 天 | 在 `pagesToHtml()` 中注入 PDF bookmarks，或 Puppeteer 层面注入 |
| **S2-3** 字体上传 API + 静态服务 | 2 天 | 后端 `/api/fonts/upload` 实现文件存储；`/api/fonts/:filename` 静态服务；前端 FontSelector 联调 |
| **S2-4** 简繁转换映射表扩充 | 1 天 | 基于 Unicode 官方 CJK 映射表补充至 5,000+ 字；或改用 opencc-js WASM 库 |

**产出**: PDF 导出有封面有书签、可上传字体、简繁转换更完整

---

### Sprint 3: 装饰与 UI（补齐交互体验）

**目标**: 解决 P2 项，完善装饰渲染和 UI 面板

| 任务 | 预估工作量 | 说明 |
|:-----|:----------:|------|
| **S3-1** `DecorationPanel.tsx` | 1.5 天 | 7 种装饰标记的开关 + 参数滑块组件 |
| **S3-2** `PunctuationPanel.tsx` | 1 天 | 标点替换规则编辑器 + 预设模板 |
| **S3-3** `CoverEditor.tsx` | 1.5 天 | 封面编辑：标题/作者位置/字号/颜色/自定义图片 |
| **S3-4** 装饰 Canvas 渲染 | 1 天 | `preview-renderer.ts` 中实现 6 种装饰类型绘制（当前只绘制了鱼尾和边框） |
| **S3-5** 装饰 PDF CSS 渲染 | 1 天 | `ir-to-css.ts` 中为装饰类型生成对应的 SVG/CSS |
| **S3-6** 后端类型去重 | 0.5 天 | 创建共享 `@vrain/types` 包或使用符号链接 |

**产出**: 完整的配置面板、所有装饰在预览和 PDF 中可见

---

### Sprint 4: 测试与部署（可交付）

**目标**: 解决 P3 项，补充测试、稳定部署

| 任务 | 预估工作量 | 说明 |
|:-----|:----------:|------|
| **S4-1** 核心函数单元测试 | 2 天 | `computeGridMetrics`, `paginate`, `parseBookConfig`, `preprocessLine` 等 |
| **S4-2** 预览渲染器 test harness | 1 天 | Canvas 2D 渲染的 fixture 测试 |
| **S4-3** 视觉回归测试 | 2 天 | 用原版 vRain 输出的 PDF 作为 baseline，逐页像素对比 |
| **S4-4** 生产部署配置 | 1 天 | 解除 staticPlugin 注释、`.env` 配置、npm scripts 完善 |
| **S4-5** Error Boundary 和 Edge Cases | 1 天 | 前端全局错误边界、空状态、大文件处理 |

**产出**: 测试覆盖核心函数、生产环境可部署

---

## 四、关键技术决策（延续原计划）

| 决策 | 建议 | 原因 |
|------|------|------|
| **持久化方案** | 先 `localStorage` / `IndexedDB`，后 `SQLite` | 前端即时可用，用户无需搭建后端；SQLite 作为后续的服务器端方案 |
| **简繁转换** | 先用映射表补充至 5,000+ 字；后续考虑 `opencc-js` WASM | 映射表零依赖、立即生效、无 WASM 加载延迟 |
| **封面页** | Canvas 2D 截图 → 内联 Base64 图片嵌入 HTML | 复用已有 `drawCover()` 逻辑，无需重写 |
| **PDF 书签** | Puppeteer `page.pdf()` 不支持原生 outline | 考虑用 `pdf-lib` 后处理注入书签，或用 `jsPDF` 替代 |
| **坐标系统** | paginate() 接收 Position[]，按 grid 顺序依次填充 | 保持纯函数、可测试 |

---

## 五、原 PLAN.md 与 FEATURES.md 差异项

以下功能在 `FEATURES.md`（原版 Perl）中存在，但 `PLAN.md` 和当前代码中都未覆盖：

| 功能 | FEATURES.md 参考 | 优先级 | 说明 |
|------|-----------------|:------:|------|
| **花鱼尾 (curved fish tail)** | §7.2 `if_fishflower=1` | P2 | 当前只实现了三角鱼尾 |
| **PDF 压缩 (Ghostscript)** | §8.3 `-c` 参数 | P3 | 跨平台实现需要不同策略 |
| **印章添加工具** | §9.5 `addyin.pl` | P3 | 原计划中未规划 |
| **缩进预处理** | §9.4 `indentxt.pl` | P3 | 段落缩进已有 `T` 标记，但缺少批量预处理脚本 |
| **拉丁字母自动旋转** | §3.2 拉丁字母 `-90°` | P2 | 当前 `text-parser.ts` 未处理 |
| **省略号/破折号特殊处理** | §4.6 拉长渲染 | P2 | 标点渲染的特殊情况 |
| **页尾标记回溯** | §5.4 标记开始符推回 | P1 | `pagination-controller.ts` 未实现页尾装饰标记回溯 |
| **批注嵌套标记** | §5.5 批注内支持书名号/框/圆圈 | P2 | 当前批注纯文本不解析嵌套标记 |

---

## 六、关键文件影响矩阵

| 任务 | 需修改/创建的文件 |
|------|-------------------|
| S1-1 坐标对接 | `pagination-controller.ts`, `usePreview.ts`, `grid-calculator.ts` |
| S1-2 Decoration IR | `markup-parser.ts`, `pagination-controller.ts`, `preview-renderer.ts`, `ir-to-css.ts` |
| S1-3 本地持久化 | 新建 `hooks/useProjectStore.ts`, 修改 `ProjectList.tsx`, `ProjectDetail.tsx` |
| S1-4 createNewPage | `pagination-controller.ts` |
| S2-1 封面 HTML | `ir-to-css.ts` |
| S2-2 PDF Outline | `ir-to-css.ts`, `pdf-generator.ts` |
| S2-3 字体服务 | 新建 `backend/src/routes/fonts.ts`, 修改 `app.ts`, `FontSelector.tsx` |
| S2-4 简繁扩充 | `simp-trad.ts` 或引入 `opencc-js` |
| S3-1~3 UI 面板 | 新建 3 个组件文件 |
| S3-4~5 装饰渲染 | `preview-renderer.ts`, `ir-to-css.ts` |
| S4-1~3 测试 | `tests/layout-engine/*.test.ts`, `tests/visual-regression/*.test.ts` |
| S4-4 部署配置 | `backend/src/app.ts`, `start.mjs`, `package.json` |

---

## 七、快速启动（Sprint 1 详细任务）

### S1-1: Position Grid ↔ Page IR 对接

```
现状:  computeGridMetrics() → 坐标算好了
       generatePositionGrid() → textPositions[] + commentPositions[]
       paginate() → 硬编码 createNewPage() → Character.x/y = 0
       usePreview.buildPages() → 未传递 positions 给 paginate()

目标:  Character.x/y 使用真实坐标

改动:
  1. pagination-controller.ts:
     - paginate() 新增参数: textPositions: Point[], commentPositions: Point[]
     - 填充字符时使用 positions[charIndex] 的 x/y
     - 移除 createNewPage() 中的硬编码默认画布
     - createNewPage() 使用传入的 canvasConfig

  2. usePreview.ts:
     - buildPages() 调用 paginate() 时传入 positions
     - 验证 page.characters[].x/y 非零
```

### S1-2: Decoration IR 生成

```
现状:  markup-parser.ts → parseMarkup() 跳过所有装饰标记
       paginate() → 传入 [] 作为 decorations

目标:  装饰标记生成 Decoration[]，渲染时可见

改动:
  1. markup-parser.ts:
     - parseMarkup() 对每个装饰标记生成 Decoration 对象
     - 记录 decorationIndexMap (标记起始位置 → 字符索引)
     - 返回完整的 decorations 数组

  2. pagination-controller.ts:
     - 接收 decorations[] 并按分页分配到对应页面
     - 跨页装饰标记处理
```

### S1-3: 项目 CRUD + localStorage

```
现状:  ProjectList.tsx → 只显示"暂无项目"
       ProjectDetail.tsx → 仅内存数据

目标:  创建/切换/保存项目，刷新不丢失

改动:
  1. 新建 frontend/src/hooks/useProjectStore.ts:
     - useProjectStore(): { projects, currentProject, createProject, saveProject, deleteProject }
     - localStorage 读写 + JSON 序列化
     - 配合 bundle.ts 的导入导出

  2. ProjectList.tsx:
     - 从 useProjectStore 读取 projects
     - 展示项目卡片，点击进入

  3. ProjectDetail.tsx:
     - 配置变化时自动保存到 localStorage
```

---

## 附录：当前文件状态速查

| 文件 | 状态 | 行数 | 备注 |
|------|:----:|:----:|------|
| `frontend/src/types/layout.ts` | ✅ | 218 | 完整 |
| `frontend/src/lib/config-parser.ts` | ✅ | ~270 | 完整 |
| `frontend/src/lib/grid-calculator.ts` | ✅ | 267 | 完整 |
| `frontend/src/lib/text-parser.ts` | ✅ | ~240 | 完整 |
| `frontend/src/lib/markup-parser.ts` | ⚠️ | 207 | 只解析不生成 IR |
| `frontend/src/lib/pagination-controller.ts` | ⚠️ | 252 | 坐标硬编码 |
| `frontend/src/lib/preview-renderer.ts` | ✅ | 469 | Canvas 绘制完整 |
| `frontend/src/lib/ir-to-css.ts` | ⚠️ | 333 | 封面/书签占位 |
| `frontend/src/lib/font-resolver.ts` | ✅ | 236 | 完整 |
| `frontend/src/lib/simp-trad.ts` | ⚠️ | 658 | 映射表不完整 |
| `frontend/src/lib/bundle.ts` | ✅ | 444 | 完整 |
| `frontend/src/lib/num2zh.ts` | ✅ | — | 完整 |
| `backend/src/app.ts` | ⚠️ | 119 | CRUD/字体占位 |
| `backend/src/services/pdf-generator.ts` | ✅ | 147 | 完整 |
| `backend/src/types/layout.ts` | ⚠️ | — | 与前端重复 |
| `frontend/src/components/ProjectList.tsx` | ⚠️ | 35 | 无真实数据 |
| `frontend/src/components/ProjectDetail.tsx` | ⚠️ | 282 | 无持久化 |
| `frontend/src/components/ProjectSidebar.tsx` | ✅ | — | 完整 |
| `frontend/src/components/ConfigEditor.tsx` | ✅ | — | 完整 |
| `frontend/src/components/TextEditor.tsx` | ⚠️ | — | 基本可用 |
| `frontend/src/components/PreviewViewport.tsx` | ✅ | — | 完整 |
| `frontend/src/components/PdfExportPanel.tsx` | ✅ | — | 完整 |
| `frontend/src/components/ImportExportPanel.tsx` | ✅ | — | 完整 |
| `frontend/src/components/FontSelector.tsx` | ⚠️ | — | 无后端支撑 |
| `tests/layout-engine/` | ❌ | — | 空 |
| `tests/visual-regression/` | ❌ | — | 空 |
