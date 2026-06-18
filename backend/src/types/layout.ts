/**
 * 类型定义 — 从前端 re-export，保持单一数据源
 *
 * 后端编译时会解析到 frontend/src/types/layout.ts 的实际定义，
 * 确保两端类型始终一致。
 */
export type {
  Page,
  Character,
  Commentary,
  Decoration,
  ControlMark,
  ControlMarkWithIndex,
  CommentaryEntry,
  Position,
  CanvasConfig,
  BookConfig,
  FontEntry,
} from "../../../frontend/src/types/layout";
