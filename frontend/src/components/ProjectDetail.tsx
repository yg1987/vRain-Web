/**
 * 项目详情页 — 主工作区
 *
 * 顶部标签页（4个）：
 *   配置 → 书籍配置 + 画布配置 + 字体选择 + 上传字体 + 导入/导出
 *   文本 → 源文本编辑
 *   预览 → Canvas 实时预览
 *   导出 → PDF 导出
 *
 * 数据流：
 *   ProjectDetail (state) ← 配置编辑 → 实时预览 → PDF导出
 *   state 变化自动持久化到后端 SQLite
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ProjectSidebar from "./ProjectSidebar";
import ConfigEditor from "./ConfigEditor";
import DecorationPanel from "./DecorationPanel";
import PunctuationPanel from "./PunctuationPanel";
import TextEditor from "./TextEditor";
import PreviewViewport from "./PreviewViewport";
import PdfExportPanel from "./PdfExportPanel";
import FontSelector from "./FontSelector";
import ImportExportPanel from "./ImportExportPanel";
import { usePreview } from "../hooks/usePreview";
import { api } from "../lib/api";
import { DEFAULT_BOOK_CONFIG, DEFAULT_CANVAS_CONFIG, DEFAULT_TEXT_LINES } from "../hooks/useProjectStore";

import type { BookConfig, CanvasConfig, FontEntry } from "../types/layout";

export default function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"config" | "text" | "preview" | "export">("config");
  const [bookConfig, setBookConfig] = useState<BookConfig>(DEFAULT_BOOK_CONFIG);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(DEFAULT_CANVAS_CONFIG);
  const [textLines, setTextLines] = useState<string[][]>(DEFAULT_TEXT_LINES.map((arr) => [...arr]));
  const [selectedTextFile, setSelectedTextFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadedRef = useRef(false);

  // ========== 加载项目数据 ==========
  useEffect(() => {
    if (!projectId || loadedRef.current) return;

    const loadProject = async () => {
      try {
        setLoading(true);
        const project = await api.getProject(projectId);
        const bConfig = project.bookConfig as BookConfig;
        setBookConfig(bConfig);
        setCanvasConfig(project.canvasConfig as CanvasConfig);
        setTextLines(project.textLines.map((arr) => [...arr]));
        // 加载字体到浏览器供 canvas 渲染
        loadFontsToBrowser(bConfig.fonts);
      } catch (err) {
        console.error("加载项目失败:", err);
        // 项目不存在时使用默认值
      } finally {
        setLoading(false);
        loadedRef.current = true;
      }
    };

    loadProject();
  }, [projectId]);

  // ========== 自动持久化 ==========
  // 配置/文本变化后防抖保存到后端 SQLite
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSave = useCallback(() => {
    if (!projectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.updateProject(projectId, { bookConfig, canvasConfig, textLines }).catch((err) => {
        console.error("保存项目失败:", err);
      });
    }, 500);
  }, [projectId, bookConfig, canvasConfig, textLines]);

  useEffect(() => {
    if (!loadedRef.current) return; // 首次加载不触发保存
    triggerSave();
  }, [bookConfig, canvasConfig, textLines, triggerSave]);

  // ========== 加载字体到浏览器 ==========
  const loadFontsToBrowser = useCallback(async (fonts: FontEntry[]) => {
    for (const font of fonts) {
      // 跳过已加载的字体
      if (document.fonts.check(`12px "${font.name}"`)) continue;
      try {
        const fontUrl = `/api/fonts/file/${font.filename}`;
        const fontFace = new FontFace(font.name, `url(${fontUrl})`);
        const loaded = await fontFace.load();
        document.fonts.add(loaded);
      } catch {
        // 字体文件可能不存在，忽略
      }
    }
  }, []);

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
    (textFontFamily: string, commentFontFamily: string, textFontSize: number, commentFontSize: number, coverTitleFontFamily: string, coverTitleFontSize: number) => {
      setBookConfig((prev) => ({
        ...prev,
        textFontFamily,
        commentFontFamily,
        coverTitleFontFamily,
        coverTitleFontSize,
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

  const onFontAdd = useCallback((font: FontEntry) => {
    setBookConfig((prev) => ({
      ...prev,
      fonts: [...prev.fonts, font],
    }));
  }, []);

  // ========== 预览交互回调 ==========
  const onPageChange = useCallback((page: number) => {
    preview.goToPage(page);
  }, [preview]);

  const onZoomChange = useCallback((zoom: number) => {
    preview.setZoom(zoom);
  }, [preview]);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-ink/50">加载中...</div>
      </div>
    );
  }

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
              <DecorationPanel
                bookConfig={bookConfig}
                onChange={(book) => setBookConfig(book)}
              />
              <PunctuationPanel
                bookConfig={bookConfig}
                onChange={(book) => setBookConfig(book)}
              />
              <FontSelector
                fonts={bookConfig.fonts}
                textFontFamily={bookConfig.textFontFamily}
                commentFontFamily={bookConfig.commentFontFamily}
                coverTitleFontFamily={bookConfig.coverTitleFontFamily}
                textFontSize={bookConfig.fonts[0]?.textPointSize || 60}
                commentFontSize={bookConfig.fonts[0]?.commentPointSize || 45}
                coverTitleFontSize={bookConfig.coverTitleFontSize}
                onChange={onFontChange}
                onFontUploaded={onFontUploaded}
                onFontAdd={onFontAdd}
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
