/**
 * usePreview — 预览状态管理 Hook
 * 连接配置面板和 PreviewViewport，实现配置变更 → 预览即时刷新。
 * 负责:
 *  1. 从配置数据生成 Layout Engine 的 IR (Page[])
 *  2. 管理预览状态 (当前页、缩放、封面)
 *  3. 防抖触发渲染，避免频繁重绘
 */
import { useRef, useCallback, useEffect, useState } from "react";
import type { Page, BookConfig, CanvasConfig, CommentaryEntry } from "../types/layout";
import { computeGridMetrics, generatePositionGrid } from "../lib/grid-calculator";
import { paginate } from "../lib/pagination-controller";
import { preprocessLine, parseTextFile } from "../lib/text-parser";
import { renderPages } from "../lib/preview-renderer";

export interface PreviewState {
  pages: Page[];
  totalPages: number;
  currentPage: number;
  zoom: number;
  showCover: boolean;
  isRendering: boolean;
  isProcessing: boolean;   // 文本正在解析 (简繁转换等异步操作)
  error: string | null;
}

export interface UsePreviewOptions {
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  textLines: string[][];  // 每个文本文件的行数组
}

export function usePreview(options: UsePreviewOptions) {
  const { bookConfig, canvasConfig, textLines } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 预览状态
  const [state, setState] = useState<PreviewState>({
    pages: [],
    totalPages: 0,
    currentPage: 1,
    zoom: 0.8,
    showCover: false,
    isRendering: false,
    isProcessing: false,
    error: null,
  });

  // 生成 IR (将配置 + 文本 → Page[])
  const buildPages = useCallback(async (): Promise<Page[]> => {
    try {
      setState((s) => ({ ...s, isProcessing: true }));

      // 1. 计算网格
      const grid = computeGridMetrics(canvasConfig, bookConfig.rowNum);
      const positions = generatePositionGrid(canvasConfig, grid, bookConfig.rowNum, bookConfig.rowDeltaY);

      // 2. 解析文本文件 → 预处理字符
      const allChars: string[] = [];
      const allCommentary: CommentaryEntry[] = [];
      const titles: string[] = [];

      for (let fi = 0; fi < textLines.length; fi++) {
        const lines = textLines[fi];
        const parsed = await parseTextFile(`${String(fi).padStart(2, "0")}.txt`, lines, bookConfig);

        // 收集标题
        if (parsed.paragraphs.length > 0) {
          const postfix = bookConfig.titlePostfix.replace("X", String(fi + 1));
          titles.push(parsed.paragraphs[0].text + postfix);
        }

        // 拼接字符
        for (const para of parsed.paragraphs) {
          const chars = [...para.text];
          allChars.push(...chars);

          // 批注
          for (const cm of para.commentaries) {
            allCommentary.push({ char: cm, isCommentary: true });
          }
        }
      }

      // 3. 分页
      const paginated = paginate(
        canvasConfig,
        bookConfig,
        grid,
        allChars,
        allCommentary,
        [], // 暂无装饰
      );

      // 4. 构建 Page IR
      const pages: Page[] = paginated.pages.map((pg, idx) => ({
        pageNumber: idx + 1,
        canvas: { ...canvasConfig },
        title: titles[idx] || bookConfig.title,
        characters: pg.characters,
        commentaries: pg.commentaries,
        decorations: pg.decorations,
        marks: pg.marks,
        outlineTitle: titles[idx],
        outlinePage: idx + 2, // 封面 + 内容偏移
      }));

      return pages;
    } catch (err) {
      console.error("[usePreview] 构建 IR 失败:", err);
      setState((s) => ({ ...s, error: String(err), isProcessing: false }));
      return [];
    }
  }, [bookConfig, canvasConfig, textLines]);

  // 渲染到 Canvas (带防抖)
  const renderToCanvas = useCallback(
    (pages: Page[], pageIndex: number, showCover: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas || pages.length === 0) return;

      setState((s) => ({ ...s, isRendering: true }));

      // 防抖: 等待 200ms 无新请求再渲染
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          renderPages(canvas, pages, bookConfig, canvasConfig, {
            scale: state.zoom,
            pageIndex: showCover ? 0 : pageIndex,
            renderCover: showCover,
          });
          setState((s) => ({ ...s, isRendering: false }));
        } catch (err) {
          console.error("[usePreview] 渲染失败:", err);
          setState((s) => ({ ...s, isRendering: false, error: String(err) }));
        }
      }, 200);
    },
    [bookConfig, state.zoom],
  );

  // 配置变更 → 重建 IR → 渲染
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const pages = await buildPages();
      if (cancelled) return;

      setState((s) => ({
        ...s,
        pages,
        totalPages: pages.length,
        error: null,
        isProcessing: false,
      }));

      if (pages.length > 0) {
        renderToCanvas(pages, state.showCover ? 0 : state.currentPage, state.showCover);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [buildPages, state.currentPage, state.showCover, renderToCanvas]);

  // 翻页
  const goToPage = useCallback((page: number) => {
    setState((s) => ({ ...s, currentPage: Math.max(1, Math.min(page, s.totalPages)) }));
  }, []);

  // 切换封面
  const toggleCover = useCallback(() => {
    setState((s) => {
      const next = { ...s, showCover: !s.showCover };
      if (next.showCover) {
        // 切到封面
        renderToCanvas(next.pages, 0, true);
      } else {
        // 切回内容页
        renderToCanvas(next.pages, next.currentPage, false);
      }
      return next;
    });
  }, [renderToCanvas]);

  // 缩放
  const setZoom = useCallback((zoom: number) => {
    setState((s) => {
      const next = { ...s, zoom };
      if (s.pages.length > 0) {
        renderToCanvas(s.pages, s.showCover ? 0 : s.currentPage, s.showCover);
      }
      return next;
    });
  }, [renderToCanvas]);

  return {
    state,
    canvasRef,
    goToPage,
    toggleCover,
    setZoom,
  };
}
