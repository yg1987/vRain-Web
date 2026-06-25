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
  /** 各文件的章节标题，与 textLines 一一对应
   *  [0]=序标题, [1]=附录标题, [2+]=各章标题 */
  chapterTitles: string[];
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
    // 批注字号 ≤ 正文一半，确保双列小字不超列宽
    { name: "FangSong", filename: "simfang.ttf", textPointSize: 60, commentPointSize: 24, rotate: 0 },
    { name: "汉明A", filename: "HanaMinA.ttf", textPointSize: 50, commentPointSize: 20, rotate: 0 },
    { name: "汉明B", filename: "HanaMinB.ttf", textPointSize: 50, commentPointSize: 20, rotate: 0 },
  ],
  textFontFamily: "FangSong",
  commentFontFamily: "FangSong",
  textFontColor: "black",
  commentFontColor: "black",
  coverTitleFontFamily: "FangSong",
  coverTitleFontSize: 120,
  coverTitleY: 200,
  coverAuthorFontSize: 60,
  coverAuthorY: 600,
  coverFontColor: "black",
  titleFontSize: 65,
  titleColor: "black",
  titleY: 540,
  titleYDis: 1.25,
  titlePostfix: "卷X",
  titleDirectory: false,
  pagerFontSize: 30,
  pagerColor: "black",
  pagerY: 1250,
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
    commentary: { enabled: true, color: "#000000", backgroundColor: "#ffffff" },
    bookLine: { enabled: true, width: 2, color: "#000000" },
    rectFrame: { enabled: true, borderType: 0, borderColor: "#874434", fillColor: "#000000" },
    circleFrame: { enabled: true, borderType: 0, borderColor: "#874434", fillColor: "#ffffff" },
    textZoom: { enabled: true, zoomFactor: 1.1, color: "#000000" },
    circleNote: { enabled: true, offset: { x: 0.55, y: 0.3 }, radius: 0.15, width: 2, color: "#874434" },
    pointNote: { enabled: true, offset: { x: 1, y: 0 }, size: 0.6, color: "#874434" },
    lineNote: { enabled: true, offset: { x: 0.5, y: 0 }, width: 2, color: "#874434" },
  },
  fontMetricAdjust: false,
  fallbackBold: false,
  fallbackBoldStrokeWidth: 1.2,
  simplifiedToTraditional: true,
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

/**
 * 固定约定:
 *   textLines[0] = 序（可为空数组，空=无序）
 *   textLines[1] = 附录（可为空数组，空=无附录）
 *   textLines[2+] = 01.txt, 02.txt, ...（各章节）
 */
export const DEFAULT_TEXT_LINES: string[][] = [
  // [0] 序 — 凡例，展示全部排版标记用法
  [
    "◎虞初新志凡例",
    "T一、是编专为仿古籍刻本而设。凡文中用〈尖括号〉者，表此处为紧要字句，读者当留意。用〔方括〕者，表补注或考证。用《书名号》者，表所引典籍篇目及书名。【夹批例：双行小字列于正文右侧。】",
    "T一、文中遇（重点字词）者，字形放大以示醒目。凡｛圈注｝所及，逐字加圈。＜顿点处＞逐字加点。［行注所及］逐字加竖线以标识。凡此诸种，皆仿宋元刻本旧式。",
    "T一、底本以《虞初新志》为主，〔清张潮山来氏辑。〕【潮字山来，号心斋，安徽歙县人，官翰林院孔目。】参校别本，凡有异同，择善而从，间出己意，〔以己意定其是非。〕",
    "T一、文中夹批凡涉人物者，〈括其生平出处；涉典章制度者，疏其沿革源流。〉务使读者一目了然。批语多采自前人笺注，间有未安者，则以按语别之。",
    "T一、是编所用标记符号凡七种：〈〉表紧要、〔〕表补注、《》表书名、（）表字大、｛｝表圈注、＜＞表顿点、［］表行注。【】为夹批符号。排版控制符凡五种：百分号为分页符，美金符为半页符，and符为末列跳，尖号为多栏跳。双at符为空格，T行首缩进一字。凡此皆依原版旧例，读者习之自熟。",
    "T一、本书分卷，卷各有序。序文以◎标识，凡例以●别之。书中标题沿用旧称，如〈本传〉、〈列传〉、〈赞曰〉诸目，一依旧本。卷终加◎以识。",
    "凡例终。丁未秋日，识于◎清稿轩。",
    "%以上凡例终，以下正文",
  ],
  // [1] 附录 — 默认为空
  [],
  // [2+] 章节 — 默认一章：姜贞毅先生传
  [
    "姜贞毅先生传",
    "T先生名埈，字正心，号贞毅，江南华亭人。",
    "〔姜氏世为华亭望族。〕祖讳某，父讳某，皆以经术闻。",
    "T先生少颖异，受《尚书》于同里顾先生。【顾先生者，名某，字某，以《尚书》教授乡里。】年十六，补诸生。崇祯六年，举于乡。明年，成进士。授福建泉州府推官。",
    "T泉州故多盗，先生至，〈严保甲，清狱讼，〉民赖以安。尝有兄弟争田者，先生召至庭下，【兄弟相争，非田之罪也。】谕以《棠棣》之义，二人感泣而去。于是泉州之民，皆以「姜青天」呼之。",
    "T旋擢浙江道监察御史。时当明季，【崇祯末年，天下已乱。】朝政日非，先生上书极言时弊，凡十余上，皆切中要害。疏中所言，如〔罢矿税、减赋役、整饬边备〕诸事，皆当时急务。疏入，不报。先生叹曰：【此何等时，犹吝一疏耶？】遂连章极论，终不见用。",
    "T未几，北京陷。先生闻之，痛哭不欲生。【忠义之忱，溢于言表。】唐王即位福州，授先生御史。先生知事不可为，然犹尽瘁图报，日夜筹画。时有言〈当借兵西粤，以图恢复。〉先生力赞其议，〈具疏以闻，〉而事竟不行。【时势如此，虽诸葛复生亦难措手。】",
    "T嗟乎！明之亡也，非亡于流寇，而亡于党争；非亡于甲申，而亡于万历。先生以一介书生，〈当板荡之际，〉竭力支撑，虽终无所救，然其忠贞之节，岂可没哉！",
    "T余尝读先生之遗文，【先生有《贞毅文集》行世。】未尝不掩卷太息。因叙其生平大略，以俟后之君子观览焉。",
    "◎虞初新志卷之一终",
  ],
];

/** 默认章节标题，与 DEFAULT_TEXT_LINES 一一对应 */
export const DEFAULT_CHAPTER_TITLES: string[] = [
  "序",           // [0] 序
  "附录",         // [1] 附录
  "姜贞毅先生传", // [2+] 章节
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
        chapterTitles: [...DEFAULT_CHAPTER_TITLES],
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
    (id: string, data: Partial<Pick<ProjectData, "bookConfig" | "canvasConfig" | "textLines" | "chapterTitles">>) => {
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
