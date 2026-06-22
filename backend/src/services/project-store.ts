/**
 * project-store — SQLite 持久化层
 *
 * 使用 better-sqlite3 存储项目数据（BookConfig + CanvasConfig + 文本），
 * 替代前端 localStorage 实现跨设备/跨会话持久化。
 *
 * DB 路径: backend/data/vrain.db（启动时自动创建）
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 类型定义
// ============================================================================

export interface ProjectRow {
  id: string;
  name: string;
  book_config: string; // JSON
  canvas_config: string; // JSON
  text_files: string; // JSON: [{ filename, content }]
  created_at: number;
  updated_at: number;
}

export interface ProjectData {
  id: string;
  name: string;
  bookConfig: Record<string, unknown>;
  canvasConfig: Record<string, unknown>;
  textLines: string[][];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 数据库初始化
// ============================================================================

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(__dirname, "../../data/vrain.db");
    db = new Database(dbPath);
    // 启用 WAL 模式提升并发性能
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      book_config TEXT,
      canvas_config TEXT,
      text_files TEXT,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);

  console.log("[project-store] Database initialized");
}

// ============================================================================
// CRUD 操作
// ============================================================================

/**
 * 获取所有项目列表
 */
export function getAllProjects(): ProjectData[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
    .all() as ProjectRow[];

  return rows.map(rowToData);
}

/**
 * 获取单个项目
 */
export function getProject(id: string): ProjectData | null {
  const database = getDb();
  const row = database.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | ProjectRow
    | undefined;

  return row ? rowToData(row) : null;
}

/**
 * 创建新项目
 */
export function createProject(
  name: string,
  defaultBookConfig: Record<string, unknown> = {},
  defaultCanvasConfig: Record<string, unknown> = {},
  defaultTextLines: string[][] = [],
): ProjectData {
  const database = getDb();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = Date.now();

  const bookConfig = { ...defaultBookConfig, name, title: name };
  const canvasConfig = { ...defaultCanvasConfig };
  const textFiles = textLinesToFiles(defaultTextLines);

  database
    .prepare(
      `INSERT INTO projects (id, name, book_config, canvas_config, text_files, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, name, JSON.stringify(bookConfig), JSON.stringify(canvasConfig), JSON.stringify(textFiles), now, now);

  return {
    id,
    name,
    bookConfig,
    canvasConfig,
    textLines: defaultTextLines,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}

/**
 * 更新项目
 */
export function updateProject(
  id: string,
  data: {
    bookConfig?: Record<string, unknown>;
    canvasConfig?: Record<string, unknown>;
    textLines?: string[][];
  },
): boolean {
  const database = getDb();
  const existing = database.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | ProjectRow
    | undefined;

  if (!existing) return false;

  const bookConfig = data.bookConfig
    ? JSON.stringify(data.bookConfig)
    : existing.book_config;
  const canvasConfig = data.canvasConfig
    ? JSON.stringify(data.canvasConfig)
    : existing.canvas_config;
  const textFiles = data.textLines
    ? JSON.stringify(textLinesToFiles(data.textLines))
    : existing.text_files;

  database
    .prepare(
      `UPDATE projects SET book_config = ?, canvas_config = ?, text_files = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(bookConfig, canvasConfig, textFiles, Date.now(), id);

  return true;
}

/**
 * 删除项目
 */
export function deleteProject(id: string): boolean {
  const database = getDb();
  const result = database.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}

// ============================================================================
// 辅助函数
// ============================================================================

function rowToData(row: ProjectRow): ProjectData {
  const textFiles = JSON.parse(row.text_files || "[]") as { filename: string; content: string }[];
  const textLines = filesToTextLines(textFiles);

  return {
    id: row.id,
    name: row.name,
    bookConfig: JSON.parse(row.book_config || "{}"),
    canvasConfig: JSON.parse(row.canvas_config || "{}"),
    textLines,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * 将 textLines 数组转为后端存储的文件列表
 * 约定:
 *   [0] → _preface.txt (序)
 *   [1] → _appendix.txt (附录)
 *   [2+] → 01.txt, 02.txt, ... (章节)
 */
function textLinesToFiles(textLines: string[][]): { filename: string; content: string }[] {
  const files: { filename: string; content: string }[] = [];
  if (textLines.length > 0) files.push({ filename: "_preface.txt", content: textLines[0].join("\n") });
  if (textLines.length > 1) files.push({ filename: "_appendix.txt", content: textLines[1].join("\n") });
  for (let i = 2; i < textLines.length; i++) {
    const chapterNum = String(i - 1).padStart(2, "0");
    files.push({ filename: `${chapterNum}.txt`, content: textLines[i].join("\n") });
  }
  return files;
}

/**
 * 将后端存储的文件列表还原为 textLines 数组
 * 兼容旧数据（直接用 00.txt 编号的）
 */
function filesToTextLines(files: { filename: string; content: string }[]): string[][] {
  const preface = files.find((f) => f.filename === "_preface.txt");
  const appendix = files.find((f) => f.filename === "_appendix.txt");
  const chapters = files
    .filter((f) => f.filename !== "_preface.txt" && f.filename !== "_appendix.txt")
    .sort((a, b) => a.filename.localeCompare(b.filename));

  const result: string[][] = [];
  // [0] 序
  result.push(preface ? preface.content.split("\n") : []);
  // [1] 附录
  result.push(appendix ? appendix.content.split("\n") : []);
  // [2+] 章节
  for (const ch of chapters) {
    result.push(ch.content.split("\n"));
  }
  return result;
}

/**
 * 关闭数据库连接
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
