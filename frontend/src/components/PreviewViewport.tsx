/**
 * PreviewViewport — Canvas 2D 实时预览竖排效果
 * 支持页面切换、缩放、封面切换。所有状态通过 props 回传父组件管理。
 */
import { useRef, useEffect, useCallback, useState } from "react";
import type { Page, BookConfig, CanvasConfig } from "../types/layout";
import { renderPages } from "../lib/preview-renderer";

interface Props {
  pages: Page[];
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  currentPage: number;
  zoom: number;
  showCover: boolean;
  /** 翻页回调 */
  onPageChange?: (page: number) => void;
  /** 缩放回调 */
  onZoomChange?: (zoom: number) => void;
  /** 封面切换回调 */
  onToggleCover?: () => void;
}

export default function PreviewViewport({
  pages,
  bookConfig,
  canvasConfig,
  currentPage,
  zoom,
  showCover,
  onPageChange,
  onZoomChange,
  onToggleCover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderedCount, setRenderedCount] = useState(0);

  // 渲染
  const doRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || pages.length === 0) return;

    const result = renderPages(canvas, pages, bookConfig, canvasConfig, {
      pageIndex: showCover ? 0 : currentPage,
      renderCover: showCover,
    });
    setRenderedCount(result.renderedPageCount);
  }, [pages, bookConfig, canvasConfig, currentPage, showCover]);

  useEffect(() => {
    doRender();
  }, [doRender]);

  const totalPages = pages.length;
  const canGoPrev = currentPage > 1 || showCover;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="config-panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="config-panel-title m-0">👁 实时预览</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded border border-ink/20 bg-white/60 px-2 py-1 text-xs text-ink/85 transition hover:bg-vermilion/10 hover:text-vermilion disabled:opacity-30"
            disabled={!canGoPrev}
            onClick={() => {
              if (showCover) {
                // 封面 → 第1页
                onToggleCover?.();
                onPageChange?.(1);
              } else {
                onPageChange?.(currentPage - 1);
              }
            }}
          >
            ← 上一页
          </button>
          <span className="text-xs text-ink/65">
            {showCover ? "封面" : `第 ${currentPage} / ${totalPages} 页`}
          </span>
          <button
            type="button"
            className="rounded border border-ink/20 bg-white/60 px-2 py-1 text-xs text-ink/85 transition hover:bg-vermilion/10 hover:text-vermilion disabled:opacity-30"
            disabled={!canGoNext}
            onClick={() => {
              if (showCover) {
                onToggleCover?.();
                onPageChange?.(1);
              } else {
                onPageChange?.(currentPage + 1);
              }
            }}
          >
            下一页 →
          </button>
          {totalPages > 0 && (
            <button
              type="button"
              className="rounded border border-ink/20 bg-white/60 px-2 py-1 text-xs text-ink/85 transition hover:bg-vermilion/10 hover:text-vermilion"
              onClick={() => onToggleCover?.()}
            >
              {showCover ? "隐藏封面" : "显示封面"}
            </button>
          )}
        </div>
      </div>

      {/* Canvas 容器 — 缩放通过 CSS transform 实现 */}
      <div className="flex flex-1 justify-center overflow-auto">
        <div
          className="preview-viewport-container"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
        >
          <canvas
            ref={canvasRef}
            className="preview-viewport"
            style={{ imageRendering: "auto" }}
          />
        </div>
      </div>

      {/* 缩放控制 */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <label className="text-xs text-ink/75">缩放:</label>
        <input
          type="range"
          min={0.3}
          max={2}
          step={0.1}
          value={zoom}
          onChange={(e) => {
            const newZoom = parseFloat(e.target.value);
            onZoomChange?.(newZoom);
          }}
          className="h-1.5 w-32 accent-vermilion"
        />
        <span className="text-xs text-ink/65">{Math.round(zoom * 100)}%</span>
      </div>

      {totalPages === 0 && (
        <p className="mt-4 text-center text-xs text-ink/55">
          暂无预览 — 请在"文本"标签页添加文本内容
        </p>
      )}

      <p className="mt-2 text-center text-xs text-ink/55">
        💡 调整"配置"标签页的参数，预览将自动更新 · {renderedCount} 页已渲染
      </p>
    </div>
  );
}
