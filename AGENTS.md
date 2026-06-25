# vrain-web 项目指令

## 数据存储查找规范

项目使用 SQLite 数据库（`better-sqlite3`），文件路径 `backend/data/vrain.db`。
存储逻辑在 `backend/src/services/project-store.ts`。

**当涉及项目数据（配置、文件、状态）查找时，直接查询 SQLite 数据库，不要启动浏览器。**

```bash
node -e "const Database = require('better-sqlite3'); const db = new Database('./data/vrain.db'); const row = db.prepare('SELECT * FROM projects WHERE name = ?').get('项目名'); console.log(JSON.stringify(row, null, 2)); db.close();"
```

查询步骤：
1. 确认数据库路径：`backend/data/vrain.db`
2. 依项目名称查询：`SELECT * FROM projects WHERE name = ?`
3. `book_config`、`canvas_config` 字段为 JSON，需 `JSON.parse()` 展开
4. 只有在无后端存储或数据库无法访问时，才考虑浏览器 localStorage
