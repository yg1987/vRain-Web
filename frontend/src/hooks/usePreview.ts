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
import { extractDecorationRanges, resolveDecorationRanges, assignDecorationsToPages } from "../lib/markup-parser";
import type { DecorationRange } from "../lib/markup-parser";

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
  chapterTitles: string[]; // 每个文件的章节标题
}

export function usePreview(options: UsePreviewOptions) {
  const { bookConfig, canvasConfig, textLines, chapterTitles } = options;

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
      const allDecorationRanges: DecorationRange[] = [];
      const titles: string[] = [];
      /** 每个文件在 allChars 中的起始字符索引 */
      const fileCharStart: number[] = [];

      for (let fi = 0; fi < textLines.length; fi++) {
        const lines = textLines[fi];
        fileCharStart.push(allChars.length); // 记录当前文件起始位置
        const parsed = await parseTextFile(`${String(fi).padStart(2, "0")}.txt`, lines, bookConfig);

        // 收集标题 — 使用用户设置的章节标题 + 后缀
        const chapterTitle = chapterTitles[fi] || "";
        const postfix = bookConfig.titlePostfix.replace("X", String(fi + 1));
        // 序(0) → 后缀变"序"，附录(1) → 后缀变"附"，章节(2+) → 用回目数字
        let titlePostfix = postfix;
        if (fi === 0 && chapterTitle) {
          titlePostfix = "序";
        } else if (fi === 1 && chapterTitle) {
          titlePostfix = "附";
        }
        titles.push(chapterTitle || titlePostfix);

        // 拼接字符（同时剥离装饰标记符，记录装饰范围）
        for (const para of parsed.paragraphs) {
          // 提取装饰范围并得到净化后的文本
          const { cleanText, ranges: newRanges } = extractDecorationRanges(
            para.text,
            bookConfig,
            allChars.length, // 当前全局偏移
          );
          allDecorationRanges.push(...newRanges);

          const chars = [...cleanText];
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
        [], // 装饰由 resolveDecorationRanges 后处理
        positions.textPositions,
        positions.commentPositions,
      );

      // 4. 构建 Page IR（同时为每页标记所属文件索引）
      /** 累计字符数，用于判断每页属于哪个文件 */
      let cumChars = 0;
      let pages: Page[] = paginated.pages.map((pg, idx) => {
        const pageFileIndex = findFileIndex(cumChars, cumChars + pg.characters.length, fileCharStart);
        cumChars += pg.characters.length;
        return {
          pageNumber: idx + 1,
          canvas: { ...canvasConfig },
          title: titles[idx] || bookConfig.title,
          characters: pg.characters,
          commentaries: pg.commentaries,
          decorations: pg.decorations,
          marks: pg.marks,
          outlineTitle: titles[idx],
          outlinePage: idx + 2, // 封面 + 内容偏移
          fileIndex: pageFileIndex,
        };
      });

      // 5. 装饰标记 → 像素坐标 → 分配到各页
      if (allDecorationRanges.length > 0) {
        const resolved = resolveDecorationRanges(pages, allDecorationRanges, bookConfig);
        pages = assignDecorationsToPages(pages, resolved, allDecorationRanges);
      }

      return pages;
    } catch (err) {
      console.error("[usePreview] 构建 IR 失败:", err);
      setState((s) => ({ ...s, error: String(err), isProcessing: false }));
      return [];
    }
  }, [bookConfig, canvasConfig, textLines, chapterTitles]);

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

/**
 * 根据字符索引范围定位所属文件
 * @param charStart 该页第一个字符在 allChars 中的索引
 * @param charEnd   该页最后一个字符之后
 * @param boundaries 各文件在 allChars 中的起始索引
 */
function findFileIndex(charStart: number, _charEnd: number, boundaries: number[]): number {
  // boundaries[i] = 文件 i 的起始字符索引，boundaries[i+1] = 文件 i+1 的起始字符索引
  // 找到最大的 i 使得 boundaries[i] <= charStart
  for (let i = boundaries.length - 1; i >= 0; i--) {
    if (boundaries[i] <= charStart) return i;
  }
  return 0;
}
