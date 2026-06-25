/**
 * 项目详情页 — 主工作区
 *
 * 顶部标签页（4个）：
 *   配置 → 书籍配置 + 画布配置 + 字体选择 + 上传字体
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
import { usePreview } from "../hooks/usePreview";
import { api } from "../lib/api";
import { DEFAULT_BOOK_CONFIG, DEFAULT_CANVAS_CONFIG, DEFAULT_TEXT_LINES, DEFAULT_CHAPTER_TITLES } from "../hooks/useProjectStore";

import type { BookConfig, CanvasConfig, FontEntry } from "../types/layout";

export default function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"config" | "text" | "preview" | "export">("config");
  const [bookConfig, setBookConfig] = useState<BookConfig>(DEFAULT_BOOK_CONFIG);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(DEFAULT_CANVAS_CONFIG);
  const [textLines, setTextLines] = useState<string[][]>(DEFAULT_TEXT_LINES.map((arr) => [...arr]));
  const [chapterTitles, setChapterTitles] = useState<string[]>([...DEFAULT_CHAPTER_TITLES]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const loadedRef = useRef(false);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ========== 加载项目数据 ==========
  useEffect(() => {
    if (!projectId || loadedRef.current) return;

    const loadProject = async () => {
      try {
        setLoading(true);
        const project = await api.getProject(projectId);
        const bConfig = project.bookConfig;
        // 先加载字体，再设置状态（避免预览在字体未加载时渲染）
        await loadFontsToBrowser(bConfig.fonts);
        setBookConfig(bConfig);
        setCanvasConfig(project.canvasConfig);
        setTextLines(project.textLines.map((arr) => [...arr]));
        setChapterTitles(project.chapterTitles?.length ? project.chapterTitles : [...DEFAULT_CHAPTER_TITLES]);
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSave = useCallback(() => {
    if (!projectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => doSave(), 500);
  }, [projectId, bookConfig, canvasConfig, textLines, chapterTitles]);

  const doSave = useCallback(async () => {
    if (!projectId) return;
    try {
      setSaveStatus("saving");
      await api.updateProject(projectId, { bookConfig, canvasConfig, textLines, chapterTitles });
      setSaveStatus("saved");
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus(""), 2000);
    } catch (err) {
      console.error("保存项目失败:", err);
      setSaveStatus("error");
    }
  }, [projectId, bookConfig, canvasConfig, textLines, chapterTitles]);

  useEffect(() => {
    if (!loadedRef.current) return; // 首次加载不触发保存
    triggerSave();
  }, [bookConfig, canvasConfig, textLines, chapterTitles, triggerSave]);

  // ========== 加载字体到浏览器（通过 @font-face CSS，供 Canvas 预览渲染） ==========
  const loadFontsToBrowser = useCallback(async (fonts: FontEntry[]) => {
    const fontFiles = fonts.filter((f) => f.filename);
    if (fontFiles.length === 0) return;

    // 注入 @font-face（幂等：相同 id 不重复插入）
    let style = document.getElementById("vrain-font-faces") as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = "vrain-font-faces";
      document.head.appendChild(style);
    }
    const css = fontFiles
      .map((f) => `@font-face{font-family:"${f.name}";src:url(/api/fonts/file/${f.filename})}`)
      .join("");
    style.textContent = css;

    // 用 document.fonts.load() 显式触发下载并等待完成
    // document.fonts.ready 不会等待未被引用的字体，必须逐个 load
    const loadPromises = fontFiles.map((f) =>
      document.fonts.load(`60px "${f.name}"`, "字测试").catch((err) => {
        console.warn(`[FontLoader] 字体 "${f.name}" 加载失败:`, err);
      })
    );
    await Promise.all(loadPromises);
    console.log("[FontLoader] 所有字体加载完成");
  }, []);

  // 预览 Hook — 配置+文本变更自动重建预览
  const preview = usePreview({
    bookConfig,
    canvasConfig,
    textLines,
    chapterTitles,
    refreshKey: previewRefreshKey,
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
    setBookConfig((prev) => {
      // 异步重新加载字体
      loadFontsToBrowser(prev.fonts).catch(console.error);
      return { ...prev };
    });
  }, [loadFontsToBrowser]);

  const onFontAdd = useCallback((font: FontEntry) => {
    setBookConfig((prev) => {
      const newFonts = [...prev.fonts, font];
      // 异步加载新字体（不能在同步 updater 中 await）
      loadFontsToBrowser(newFonts).catch(console.error);
      return { ...prev, fonts: newFonts };
    });
  }, [loadFontsToBrowser]);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-ink/75">加载中...</div>
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
        <nav className="flex items-center border-b border-ink/10 bg-white/30">
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
                  : "text-ink/85 hover:text-ink"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}

          {/* 保存状态提示 */}
          {saveStatus && (
            <div className="mr-4 flex shrink-0 items-center gap-1.5 text-xs">
              {saveStatus === "saving" && (
                <>
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  <span className="text-ink/75">保存中...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-green-600">已保存</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-red-600">保存失败</span>
                </>
              )}
            </div>
          )}
        </nav>

        <div className="flex-1 overflow-auto p-6">
          {/* ========== 配置 ========== */}
          {activeTab === "config" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink/90">📖 书籍 & 画布配置</h3>
                <button
                  onClick={doSave}
                  className="rounded bg-vermilion px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-vermilion/90"
                >
                  💾 保存配置
                </button>
              </div>
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
            </div>
          )}

          {/* ========== 文本 ========== */}
          {activeTab === "text" && (
            <TextEditor
              textLines={textLines}
              setTextLines={setTextLines}
              chapterTitles={chapterTitles}
              setChapterTitles={setChapterTitles}
            />
          )}

          {/* ========== 预览 ========== */}
          {activeTab === "preview" && (
            <div className="space-y-0">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setPreviewRefreshKey((k) => k + 1)}
                  disabled={preview.state.isProcessing}
                  className="rounded border border-ink/15 bg-white/60 px-3 py-1 text-xs text-ink/75 transition-colors hover:bg-vermilion/10 hover:text-vermilion disabled:opacity-50"
                >
                  {preview.state.isProcessing ? "⏳ 刷新中..." : "🔄 刷新预览"}
                </button>
              </div>
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
            </div>
          )}

          {/* ========== 导出 ========== */}
          {activeTab === "export" && (
            <PdfExportPanel
              bookConfig={bookConfig}
              canvasConfig={canvasConfig}
              pages={preview.state.pages}
              totalPages={preview.state.totalPages}
              textLines={textLines}
            />
          )}
        </div>
      </main>
    </div>
  );
}
