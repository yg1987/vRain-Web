/**
 * useProjectStore — 项目持久化 Hook
 *
 * 使用 localStorage 存储项目数据（BookConfig + CanvasConfig + 文本），
 * 刷新不丢失。后续可替换为后端 API + SQLite 实现。
 *
 * 存储格式：
 *   localStorage key: "vrain_projects"
 *   值: JSON string of ProjectData[]
 */

import { useState, useCallback, useEffect } from "react";
import type { BookConfig, CanvasConfig } from "../types/layout";

// ============================================================================
// 类型定义
// ============================================================================

export interface ProjectData {
  id: string;
  name: string;
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  textLines: string[][];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 默认值
// ============================================================================

export const DEFAULT_BOOK_CONFIG: BookConfig = {
  name: "虞初新志",
  title: "虞初新志",
  author: "清张潮辑",
  canvasId: "24_black_blank",
  rowNum: 30,
  rowDeltaY: 8,
  fonts: [
    { name: "启基Combo", filename: "qiji-combo.ttf", textPointSize: 60, commentPointSize: 45, rotate: 0 },
    { name: "汉明A", filename: "HanaMinA.ttf", textPointSize: 50, commentPointSize: 40, rotate: 0 },
    { name: "汉明B", filename: "HanaMinB.ttf", textPointSize: 50, commentPointSize: 40, rotate: 0 },
  ],
  textFontFamily: "启基Combo",
  commentFontFamily: "启基Combo",
  textFontColor: "black",
  commentFontColor: "black",
  coverTitleFontFamily: "启基Combo",
  coverTitleFontSize: 120,
  coverTitleY: 200,
  coverAuthorFontSize: 60,
  coverAuthorY: 600,
  coverFontColor: "black",
  titleFontSize: 65,
  titleColor: "black",
  titleY: 1250,
  titleYDis: 1.25,
  titlePostfix: "卷X",
  titleDirectory: false,
  pagerFontSize: 30,
  pagerColor: "black",
  pagerY: 540,
  punctuationReplacements: [],
  punctuationDeletions: "",
  noPunctuationMode: false,
  onlyPeriodMode: false,
  noPositionPunctuation: "",
  noPositionPunctuationSize: 1.1,
  noPositionPunctuationOffset: { x: 0.45, y: 0.5 },
  rotatedPunctuation: "",
  rotatedPunctuationSize: 0.8,
  rotatedPunctuationOffset: { x: 0.35, y: 0.65 },
  commentNoPositionPunctuation: "",
  commentRotatedPunctuation: "",
  decorativeMarks: {
    bookLine: { enabled: true, width: 2, color: "#000000" },
    rectFrame: { enabled: true, borderType: 0, borderColor: "#874434", fillColor: "#000000" },
    circleFrame: { enabled: true, borderType: 0, borderColor: "#874434", fillColor: "#ffffff" },
    textZoom: { enabled: true, zoomFactor: 1.1 },
    circleNote: { enabled: true, offset: { x: 0.25, y: 0.3 }, radius: 0.15, width: 6, color: "#874434" },
    pointNote: { enabled: true, offset: { x: -0.25, y: 0 }, size: 1.2, color: "#874434" },
    lineNote: { enabled: true, offset: { x: 0.4, y: -0.25 }, width: 7, color: "#874434" },
  },
  fontMetricAdjust: false,
  fallbackBold: false,
  fallbackBoldStrokeWidth: 1.2,
  simplifiedToTraditional: false,
};

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 2480,
  height: 1860,
  color: "white",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 24,
  leafCenterWidth: 120,
  multiRows: { enabled: false, num: 1, lineWidth: 0, separatorColor: "#f5f5f5" },
  outerBorder: { width: 10, color: "black", hMargin: 5, vMargin: 5 },
  innerBorder: { width: 1, color: "black" },
  fishTail: {
    top: { y: 450, color: "black", rectHeight: 50, triHeight: 30, lineWidth: 15 },
    bottom: { y: 1550, color: "black", rectHeight: 50, triHeight: 30, lineWidth: 15, direction: 1 },
    style: "triangle",
    decorativeLines: { color: "black", width: 1, margin: 5 },
  },
  logoY: 1680,
  logoColor: "white",
  logoFont: "qiji-combo.ttf",
  logoFontSize: 40,
};

export const DEFAULT_TEXT_LINES: string[][] = [
  ["第一章 测试章节", "", "这是一段《测试文本》，用于展示七种装饰标记效果。", "〔圆角框〕标注〈圆圈〉效果，并使用（放大）字体。", "｛圈注｝标记和＜顿点＞标记各有不同效果。", "［行注］用于行间标注。", "", "以上七种标记在预览页可同时查看。"],
];

// ============================================================================
// localStorage CRUD
// ============================================================================

const STORAGE_KEY = "vrain_projects";

function loadAllProjects(): Record<string, ProjectData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ProjectData>;
  } catch {
    return {};
  }
}

function saveAllProjects(projects: Record<string, ProjectData>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("[useProjectStore] 保存失败:", e);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============================================================================
// Hook
// ============================================================================

export function useProjectStore() {
  const [projects, setProjects] = useState<Record<string, ProjectData>>(() => loadAllProjects());
  const [currentId, setCurrentId] = useState<string | null>(null);

  // 同步写回 localStorage
  const persist = useCallback((updated: Record<string, ProjectData>) => {
    setProjects(updated);
    saveAllProjects(updated);
  }, []);

  // 获取项目列表
  const projectList = useCallback((): ProjectData[] => {
    return Object.values(projects).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [projects]);

  // 获取单个项目
  const getProject = useCallback(
    (id: string): ProjectData | null => {
      return projects[id] ?? null;
    },
    [projects],
  );

  // 创建新项目
  const createProject = useCallback(
    (name: string): ProjectData => {
      const now = new Date().toISOString();
      const project: ProjectData = {
        id: generateId(),
        name,
        bookConfig: { ...DEFAULT_BOOK_CONFIG, name, title: name },
        canvasConfig: { ...DEFAULT_CANVAS_CONFIG },
        textLines: DEFAULT_TEXT_LINES.map((arr) => [...arr]),
        createdAt: now,
        updatedAt: now,
      };
      const updated = { ...projects, [project.id]: project };
      persist(updated);
      return project;
    },
    [projects, persist],
  );

  // 保存项目
  const saveProject = useCallback(
    (id: string, data: Partial<Pick<ProjectData, "bookConfig" | "canvasConfig" | "textLines">>) => {
      const existing = projects[id];
      if (!existing) return;
      const updated: ProjectData = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      persist({ ...projects, [id]: updated });
    },
    [projects, persist],
  );

  // 删除项目
  const deleteProject = useCallback(
    (id: string) => {
      const updated = { ...projects };
      delete updated[id];
      persist(updated);
      if (currentId === id) setCurrentId(null);
    },
    [projects, persist, currentId],
  );

  // 设置当前项目 ID
  const selectProject = useCallback((id: string | null) => {
    setCurrentId(id);
  }, []);

  return {
    projects,
    currentId,
    projectList,
    getProject,
    createProject,
    saveProject,
    deleteProject,
    selectProject,
  };
}
