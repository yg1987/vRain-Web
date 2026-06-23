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
import { DEFAULT_BOOK_CONFIG, DEFAULT_CANVAS_CONFIG, DEFAULT_TEXT_LINES } from "../hooks/useProjectStore";

import type { BookConfig, CanvasConfig, FontEntry } from "../types/layout";

export default function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"config" | "text" | "preview" | "export">("config");
  const [bookConfig, setBookConfig] = useState<BookConfig>(DEFAULT_BOOK_CONFIG);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(DEFAULT_CANVAS_CONFIG);
  const [textLines, setTextLines] = useState<string[][]>(DEFAULT_TEXT_LINES.map((arr) => [...arr]));
  const [chapterTitles, setChapterTitles] = useState<string[]>(["序", "附录", "第一回"]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");

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
        setBookConfig(bConfig);
        setCanvasConfig(project.canvasConfig);
        setTextLines(project.textLines.map((arr) => [...arr]));
        setChapterTitles(project.chapterTitles || ["序", "附录", "第一回"]);
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
  // 配置/文本变化后防抖保存到后端 SQLite，更新保存状态提示
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSave = useCallback(() => {
    if (!projectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => {
      api
        .updateProject(projectId, { bookConfig, canvasConfig, textLines, chapterTitles })
        .then(() => {
          setSaveStatus("saved");
          // 2 秒后自动清除
          if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
          saveStatusTimerRef.current = setTimeout(() => setSaveStatus(""), 2000);
        })
        .catch((err) => {
          console.error("保存项目失败:", err);
          setSaveStatus("error");
        });
    }, 500);
  }, [projectId, bookConfig, canvasConfig, textLines, chapterTitles]);

  useEffect(() => {
    if (!loadedRef.current) return; // 首次加载不触发保存
    triggerSave();
  }, [bookConfig, canvasConfig, textLines, chapterTitles, triggerSave]);

  // ========== 加载字体到浏览器（通过 @font-face CSS，供 Canvas 预览渲染） ==========
  const loadFontsToBrowser = useCallback(async (fonts: FontEntry[]) => {
    const existing = document.getElementById("vrain-font-faces");
    if (existing) return; // 已有注入，跳过
    const css = fonts
      .filter((f) => f.filename)
      .map((f) => `@font-face{font-family:"${f.name}";src:url(/api/fonts/file/${f.filename})}`)
      .join("");
    if (!css) return;
    const style = document.createElement("style");
    style.id = "vrain-font-faces";
    style.textContent = css;
    document.head.appendChild(style);
    // 等待字体加载完成，供 Canvas 渲染使用
    await document.fonts.ready;
  }, []);

  // 预览 Hook — 配置+文本变更自动重建预览
  const preview = usePreview({
    bookConfig,
    canvasConfig,
    textLines,
    chapterTitles,
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
              textLines={textLines}
            />
          )}
        </div>
      </main>
    </div>
  );
}
