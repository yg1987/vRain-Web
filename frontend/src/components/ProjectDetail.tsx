/**
 * 项目详情页 — 主工作区
 *
 * 顶部标签页（4个）：
 *   配置 → 书籍配置 + 画布配置 + 字体选择 + 上传字体 + 导入/导出
 *   文本 → 源文本编辑
 *   预览 → Canvas 实时预览
 *   导出 → PDF 导出
 *
 * 左侧：纯项目信息展示（项目名、文件数、字体列表）
 *
 * 数据流：
 *   ProjectDetail (state) ← 配置编辑 → 实时预览 → PDF导出
 *                       ← 文本编辑 → (联动)
 */
import { useState, useCallback } from "react";
import ProjectSidebar from "./ProjectSidebar";
import ConfigEditor from "./ConfigEditor";
import TextEditor from "./TextEditor";
import PreviewViewport from "./PreviewViewport";
import PdfExportPanel from "./PdfExportPanel";
import FontSelector from "./FontSelector";
import ImportExportPanel from "./ImportExportPanel";
import { usePreview } from "../hooks/usePreview";

import type { BookConfig, CanvasConfig } from "../types/layout";

const DEFAULT_BOOK_CONFIG: BookConfig = {
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
    bookLine: { enabled: false, width: 2, color: "black" },
    rectFrame: { enabled: false, borderType: 0, borderColor: "black", fillColor: "black" },
    circleFrame: { enabled: false, borderType: 0, borderColor: "black", fillColor: "white" },
    textZoom: { enabled: false, zoomFactor: 1.1 },
    circleNote: { enabled: false, offset: { x: 0.25, y: 0.3 }, radius: 0.15, width: 6, color: "#874434" },
    pointNote: { enabled: false, offset: { x: -0.25, y: 0 }, size: 1.2, color: "#874434" },
    lineNote: { enabled: false, offset: { x: 0.4, y: -0.25 }, width: 7, color: "#874434" },
  },
  fontMetricAdjust: false,
  fallbackBold: false,
  fallbackBoldStrokeWidth: 1.2,
  simplifiedToTraditional: false,
};

const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
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

export default function ProjectDetail() {
  const [activeTab, setActiveTab] = useState<"config" | "text" | "preview" | "export">("config");
  const [bookConfig, setBookConfig] = useState<BookConfig>(DEFAULT_BOOK_CONFIG);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(DEFAULT_CANVAS_CONFIG);
  const [textLines, setTextLines] = useState<string[][]>([
    ["第一章 测试章节", "", "这是一段测试文本，用于预览竖排效果。"],
  ]);
  const [selectedTextFile, setSelectedTextFile] = useState<string | null>(null);

  // 预览 Hook — 配置+文本变更自动重建预览
  const preview = usePreview({
    bookConfig,
    canvasConfig,
    textLines,
  });

  // ========== 配置变更回调 ==========
  const onConfigChange = useCallback(
    (book: BookConfig, canvas: CanvasConfig) => {
      setBookConfig(book);
      setCanvasConfig(canvas);
    },
    [],
  );

  // ========== 字体选择变更回调 ==========
  const onFontChange = useCallback(
    (textFontFamily: string, commentFontFamily: string, textFontSize: number, commentFontSize: number) => {
      setBookConfig((prev) => ({
        ...prev,
        textFontFamily,
        commentFontFamily,
        fonts: prev.fonts.map((f) => ({
          ...f,
          textPointSize: textFontSize,
          commentPointSize: commentFontSize,
        })),
      }));
    },
    [],
  );

  // ========== 字体上传回调 ==========
  const onFontUploaded = useCallback(() => {
    setBookConfig((prev) => ({ ...prev }));
  }, []);

  // ========== 预览交互回调 ==========
  // 翻页
  const onPageChange = useCallback((page: number) => {
    preview.goToPage(page);
  }, [preview]);

  // 缩放
  const onZoomChange = useCallback((zoom: number) => {
    preview.setZoom(zoom);
  }, [preview]);

  // 封面切换
  const onToggleCover = useCallback(() => {
    preview.toggleCover();
  }, [preview]);

  // ========== 导入回调 ==========
  const handleImportComplete = useCallback(
    (_name: string, book: BookConfig, canvas: CanvasConfig, text: string[][]) => {
      setBookConfig(book);
      setCanvasConfig(canvas);
      setTextLines(text);
      setActiveTab("preview");
    },
    [],
  );

  return (
    <div className="flex h-screen">
      {/* 左侧：纯项目信息展示 */}
      <aside className="sidebar">
        <ProjectSidebar
          projectName={bookConfig.title || "未命名"}
          author={bookConfig.author}
          fonts={bookConfig.fonts}
          textFileCount={textLines.length}
          rowNum={bookConfig.rowNum}
          canvasId={bookConfig.canvasId}
        />
      </aside>

      {/* 主内容区 — 顶部4个标签页 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <nav className="flex border-b border-ink/10 bg-white/30">
          {[
            { key: "config" as const, label: "配置" },
            { key: "text" as const, label: "文本" },
            { key: "preview" as const, label: "预览" },
            { key: "export" as const, label: "导出" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-vermilion font-semibold text-vermilion"
                  : "text-ink/60 hover:text-ink"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-auto p-6">
          {/* ========== 配置 ========== */}
          {activeTab === "config" && (
            <div className="space-y-6">
              <ConfigEditor
                bookConfig={bookConfig}
                canvasConfig={canvasConfig}
                onChange={onConfigChange}
              />
              <FontSelector
                fonts={bookConfig.fonts}
                textFontFamily={bookConfig.textFontFamily}
                commentFontFamily={bookConfig.commentFontFamily}
                textFontSize={bookConfig.fonts[0]?.textPointSize || 60}
                commentFontSize={bookConfig.fonts[0]?.commentPointSize || 45}
                onChange={onFontChange}
                onFontUploaded={onFontUploaded}
              />
              <ImportExportPanel
                bookConfig={bookConfig}
                canvasConfig={canvasConfig}
                textLines={textLines}
                onImport={handleImportComplete}
              />
            </div>
          )}

          {/* ========== 文本 ========== */}
          {activeTab === "text" && (
            <TextEditor
              textLines={textLines}
              setTextLines={setTextLines}
              selectedFile={selectedTextFile}
            />
          )}

          {/* ========== 预览 ========== */}
          {activeTab === "preview" && (
            <PreviewViewport
              pages={preview.state.pages}
              bookConfig={bookConfig}
              canvasConfig={canvasConfig}
              currentPage={preview.state.currentPage}
              zoom={preview.state.zoom}
              showCover={preview.state.showCover}
              onPageChange={onPageChange}
              onZoomChange={onZoomChange}
              onToggleCover={onToggleCover}
            />
          )}

          {/* ========== 导出 ========== */}
          {activeTab === "export" && (
            <PdfExportPanel
              bookConfig={bookConfig}
              canvasConfig={canvasConfig}
              pages={preview.state.pages}
              totalPages={preview.state.totalPages}
            />
          )}
        </div>
      </main>
    </div>
  );
}
