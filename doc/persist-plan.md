# 持久化 & 一键部署计划

> 目标：使 vRain Web 可分享给别人独立运行，配置和项目数据持久化存储

---

## 一、后端：SQLite 持久化

### 1.1 数据库层 `backend/src/services/project-store.ts`

新建文件，封装 `better-sqlite3` 操作。

**表结构：**

```sql
projects (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  book_config   TEXT,  -- JSON
  canvas_config TEXT,  -- JSON
  text_files     TEXT,  -- JSON: [{ filename, content }]
  created_at INTEGER,
  updated_at INTEGER
)
```

**导出函数：**

| 函数 | SQL | 说明 |
|------|-----|------|
| `getAllProjects()` | `SELECT * FROM projects ORDER BY updated_at DESC` | 项目列表 |
| `getProject(id)` | `SELECT * FROM projects WHERE id = ?` | 单个项目 |
| `createProject(name)` | `INSERT` + 默认 BookConfig/CanvasConfig/textLines | 新建 |
| `updateProject(id, data)` | `UPDATE` book_config/canvas_config/text_files | 保存 |
| `deleteProject(id)` | `DELETE WHERE id = ?` | 删除 |
| `initDb()` | `CREATE TABLE IF NOT EXISTS` | 启动时建表 |

**DB 文件路径：** `backend/data/vrain.db`，启动时自动创建。

---

### 1.2 API 路由 `backend/src/routes/projects.ts`

| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| `GET` | `/api/projects` | — | `{ projects: [...] }` |
| `POST` | `/api/projects` | `{ name: string }` | `{ id, name, createdAt }` |
| `GET` | `/api/projects/:id` | — | `{ id, name, book_config, canvas_config, text_files, ... }` |
| `PUT` | `/api/projects/:id` | `{ book_config, canvas_config, text_files }` | `{ updated: true }` |
| `DELETE` | `/api/projects/:id` | — | `{ deleted: true }` |

---

### 1.3 注册到 `backend/src/app.ts`

- 删除当前占位的 `/api/projects` GET/POST
- 导入并注册 `registerProjectRoutes(app)`
- 字体上传端点保留并实现（后续）

---

## 二、前端：API 对接

### 2.1 新建 `frontend/src/lib/api.ts`

封装 fetch 调用，统一后端通信。

```typescript
export const api = {
  getProjects:    () => get("/api/projects"),
  createProject:  (name) => post("/api/projects", { name }),
  getProject:     (id) => get(`/api/projects/${id}`),
  updateProject:  (id, data) => put(`/api/projects/${id}`, data),
  deleteProject:  (id) => del(`/api/projects/${id}`),
};
```

---

### 2.2 改造 `ProjectList.tsx`

- 挂载时 `api.getProjects()` 加载列表
- "新建项目"按钮 → `api.createProject(name)` → 跳转 `/project/:id`
- 每个项目卡片点击 → `/project/:id`
- 支持删除（加删除按钮）

---

### 2.3 改造 `ProjectDetail.tsx`

- 从 `useParams` 获取项目 ID
- 挂载时 `api.getProject(id)` 加载数据到 state
- 配置/文本变化后，500ms 防抖自动调用 `api.updateProject(id, data)` 保存
- `defaultConfig` 兜底：新项目（id 不存在时）使用默认值

---

### 2.4 改造 `ProjectLayout.tsx`

- 移除 `void id`
- 传递 `projectId` 给 `ProjectDetail`

---

### 2.5 改造 `App.tsx`

- 路由不变，保持 `/` → `ProjectList`, `/project/:id` → `ProjectLayout`

---

## 三、一键部署

### 3.1 `start.mjs` 已有（无需大改）

- `npm run dev` → `node start.mjs --dev` ✅ 已修复 Ctrl+C 问题
- `npm start` → `node start.mjs` ✅ 正常

---

### 3.2 生产部署

解除 `backend/src/app.ts` 中 `@fastify/static` 注释，serve `frontend/dist`：

```bash
npm run build        # 前端构建
npm start            # 后端 serve 前端 + API
```

用户只需要访问 `http://localhost:8080` 即可使用完整应用。

`README.md` 可添加：
```bash
# 一键启动（开发）
npm install
npm run dev

# 生产部署
npm install
npm run build
npm start
```

---

## 四、执行顺序

| 步骤 | 内容 | 预估 |
|:----:|------|:----:|
| 1 | 创建 `backend/src/services/project-store.ts` | 数据库层 |
| 2 | 创建 `backend/src/routes/projects.ts` | API 路由 |
| 3 | 修改 `backend/src/app.ts` | 注册路由 |
| 4 | 创建 `frontend/src/lib/api.ts` | API 封装 |
| 5 | 改造 `frontend/src/components/ProjectList.tsx` | 项目列表 |
| 6 | 改造 `frontend/src/components/ProjectDetail.tsx` | 加载/保存 |
| 7 | 改造 `frontend/src/components/ProjectLayout.tsx` | 传参 |
| 8 | 解除静态文件服务 + 验证一键部署 | 生产模式 |

---

## 五、验证标准

- [ ] `npm run dev` 启动，打开页面能看到项目列表
- [ ] 创建新项目 → 自动跳转 → 修改配置 → 刷新页面数据还在
- [ ] `Ctrl+C` 干净退出
- [ ] `npm run build && npm start` 后访问 `localhost:8080` 一切正常

---

*生成时间: 2026-06-18*
