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
import { num2zh } from "../lib/num2zh";
import type { DecorationRange, TextZoomRange } from "../lib/markup-parser";

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
  textLines: string[][];
  chapterTitles: string[];
  /** 外部刷新触发 — 变化时强制重建预览 */
  refreshKey?: number;
}

export function usePreview(options: UsePreviewOptions) {
  const { bookConfig, canvasConfig, textLines, chapterTitles, refreshKey } = options;

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

      // 1. 计算网格 (根据字号自动调优行数，留足上下边界)
      const textFontSize = bookConfig.fonts[0]?.textPointSize ?? 60;
      let effectiveRowNum = bookConfig.rowNum;
      // 有效内容高度 = 画布高 - 边距 - 一个字号 (上下各半字避让边框)
      const effectiveHeight = canvasConfig.height - canvasConfig.margins.top - canvasConfig.margins.bottom - textFontSize;
      const naturalRowHeight = effectiveHeight / effectiveRowNum;
      const minRowHeight = textFontSize * 1.25;
      if (naturalRowHeight < minRowHeight) {
        effectiveRowNum = Math.floor(effectiveHeight / minRowHeight);
        if (effectiveRowNum < 1) effectiveRowNum = 1;
      }
      const grid = computeGridMetrics(canvasConfig, effectiveRowNum);
      const positions = generatePositionGrid(canvasConfig, grid, effectiveRowNum, bookConfig.rowDeltaY);

      // 2. 解析文本文件 → 预处理字符
      const allChars: string[] = [];
      const allCommentary: (CommentaryEntry | null)[] = [];
      const allDecorationRanges: DecorationRange[] = [];
      const allZoomRanges: TextZoomRange[] = [];
      const titles: string[] = [];
      /** 每个文件在 allChars 中的起始字符索引 */
      const fileCharStart: number[] = [];

      for (let fi = 0; fi < textLines.length; fi++) {
        const lines = textLines[fi];
        fileCharStart.push(allChars.length); // 记录当前文件起始位置
        const parsed = await parseTextFile(`${String(fi).padStart(2, "0")}.txt`, lines, bookConfig);

        // 收集标题 — 使用用户设置的章节标题 + 后缀
        const chapterTitle = chapterTitles[fi] || "";
        // fallback: 章节缺标题时用"第N章"，序/附录用"序"/"附录"
        const chapterNum = fi >= 2 ? fi - 1 : fi + 1;
        const postfix = fi >= 2 ? `第${num2zh(chapterNum)}章` : bookConfig.titlePostfix.replace("X", String(chapterNum));
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
          const { cleanText, ranges: newRanges, zoomRanges: newZoomRanges } = extractDecorationRanges(
            para.text,
            bookConfig,
            allChars.length, // 当前全局偏移
          );
          allDecorationRanges.push(...newRanges);
          allZoomRanges.push(...newZoomRanges);

          const chars = [...cleanText];
          const paraStartGlobal = allChars.length; // 本段落在 allChars 中的起始位置

          // 填充空条目使 allCommentary 与 allChars 长度一致
          for (let i = 0; i < chars.length; i++) {
            allCommentary.push(null);
          }
          allChars.push(...chars);

          // 批注: 按原文位置插入到 allCommentary 稀疏数组中
          // cm.position 是批注在 para.text（装饰剥离前）中的位置，
          // 需减去在其之前被 extractDecorationRanges 剥离的装饰括号符数量
          for (const cm of para.commentaries) {
            const adjustedPos = adjustCommentaryPosition(para.text, cm.position);
            const localPos = Math.min(adjustedPos, chars.length - 1);
            const globalPos = paraStartGlobal + localPos;
            if (globalPos >= 0 && globalPos < allCommentary.length) {
              allCommentary[globalPos] = { char: cm.content, isCommentary: true };
            }
          }
        }

        // 每个文件结束后插入分页符，确保下一章节从新页开始
        // 只在有内容的文件后面插入，避免空文件产生空页
        const hasContent = allChars.length > fileCharStart[fi];
        if (hasContent && fi < textLines.length - 1) {
          allChars.push("%");
        }
      }

      // 3. 构建字缩放映射 (allChars 索引 → { zoomFactor, color? })
      const zoomByIndex: Record<number, { zoomFactor: number; color?: string }> = {};
      for (const zr of allZoomRanges) {
        for (let i = zr.startCharIndex; i < zr.endCharIndex; i++) {
          zoomByIndex[i] = { zoomFactor: zr.zoomFactor, color: zr.color };
        }
      }

      // 4. 分页
      const paginated = paginate(
        canvasConfig,
        bookConfig,
        grid,
        allChars,
        allCommentary,
        [], // 装饰由 resolveDecorationRanges 后处理
        positions.textPositions,
        positions.commentPositions,
        zoomByIndex,
      );

      // 5. 构建 Page IR（同时为每页标记所属文件索引）
      // 将 fileCharStart 从 allChars 坐标转换为平面页面坐标（跳过 % 等控制标记）
      const fileFlatStart: number[] = fileCharStart.map((start) => {
        let i = start;
        while (i < paginated.charIndexMap.length && paginated.charIndexMap[i] < 0) i++;
        return i < paginated.charIndexMap.length ? paginated.charIndexMap[i] : Infinity;
      });
      /** 累计字符数，用于判断每页属于哪个文件 */
      let cumChars = 0;
      let pages: Page[] = paginated.pages.map((pg, idx) => {
        const pageFileIndex = findFileIndex(cumChars, cumChars + pg.characters.length, fileFlatStart);
        cumChars += pg.characters.length;
        // 用文件索引（而非页码）查找标题，确保多页文件的每一页都显示正确的标题
        const pageTitle = titles[pageFileIndex] || bookConfig.title;
        return {
          pageNumber: idx + 1,
          canvas: { ...canvasConfig },
          title: pageTitle,
          characters: pg.characters,
          commentaries: pg.commentaries,
          decorations: pg.decorations,
          marks: pg.marks,
          outlineTitle: pageTitle,
          outlinePage: idx + 2, // 封面 + 内容偏移
          fileIndex: pageFileIndex,
        };
      });

      // 6. 装饰标记 → 像素坐标 → 分配到各页
      if (allDecorationRanges.length > 0) {
        // 统计 allChars 中每位置之前被跳过的控制标记数 (T, % 等)
        const skippedBefore: number[] = new Array(allChars.length + 1).fill(0);
        let skippedCount = 0;
        for (let i = 0; i < allChars.length; i++) {
          skippedBefore[i] = skippedCount;
          if (paginated.charIndexMap[i] === -1) skippedCount++;
        }
        skippedBefore[allChars.length] = skippedCount;

        // 统计每位置之前插入的批注字符数
        const cmBefore: number[] = new Array(allChars.length + 1).fill(0);
        let cmCount = 0;
        for (let i = 0; i < allChars.length; i++) {
          cmBefore[i] = cmCount;
          cmCount += paginated.commentaryFlatCount[i] || 0;
        }
        cmBefore[allChars.length] = cmCount;

        // 修正 DecorationRange 索引：
        // flat = allCharsIdx - skippedBefore + cmBefore + cmAtPos
        // 批注字符插入到页面前增加了 flat 索引，需加回
        const correctedRanges: DecorationRange[] = [];
        for (const r of allDecorationRanges) {
          const cmAtStart = paginated.commentaryFlatCount[r.startCharIndex] || 0;
          const start = r.startCharIndex - skippedBefore[r.startCharIndex] + cmBefore[r.startCharIndex] + cmAtStart;
          const end = r.endCharIndex - skippedBefore[r.endCharIndex] + cmBefore[r.endCharIndex];
          if (start >= 0 && end > start) {
            correctedRanges.push({ ...r, startCharIndex: start, endCharIndex: end });
          }
        }
        const resolved = resolveDecorationRanges(pages, correctedRanges, bookConfig);
        pages = assignDecorationsToPages(pages, resolved, correctedRanges);
      }

      return pages;
    } catch (err) {
      console.error("[usePreview] 构建 IR 失败:", err);
      setState((s) => ({ ...s, error: String(err), isProcessing: false }));
      return [];
    }
  }, [bookConfig, canvasConfig, textLines, chapterTitles, refreshKey]);

  // 渲染到 Canvas (带防抖)
  const renderToCanvas = useCallback(
    (pages: Page[], pageIndex: number, showCover: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas || pages.length === 0) return;

      setState((s) => ({ ...s, isRendering: true }));

      // 防抖: 等待 200ms 无新请求再渲染
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          // 等待字体加载完成，避免 Canvas 渲染 tofu 方块
          const fontFamily = bookConfig.textFontFamily || "serif";
          const fontSize = bookConfig.fonts[0]?.textPointSize ?? 60;
          // 如果字体未加载，等待最多 5 秒
          for (let i = 0; i < 50; i++) {
            if (document.fonts.check(`${fontSize}px "${fontFamily}"`)) break;
            await new Promise((r) => setTimeout(r, 100));
          }
          renderPages(canvas, pages, bookConfig, canvasConfig, {
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
    [bookConfig, canvasConfig],
  );

  // totalPages 变化时 clamp currentPage，避免切画布后页码指示器不更新
  useEffect(() => {
    setState((s) => {
      if (s.totalPages > 0 && s.currentPage > s.totalPages) {
        return { ...s, currentPage: s.totalPages };
      }
      return s;
    });
  }, [state.totalPages]);

  // 配置/文本变更 → 重建 IR
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setState((s) => ({ ...s, isProcessing: true }));
      const pages = await buildPages();
      if (cancelled) return;

      setState((s) => ({
        ...s,
        pages,
        totalPages: pages.length,
        error: null,
        isProcessing: false,
      }));
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildPages, refreshKey]);

  // 翻页/切封面 → 仅重绘 Canvas（不重建 IR）
  useEffect(() => {
    if (state.pages.length === 0) return;
    renderToCanvas(state.pages, state.showCover ? 0 : state.currentPage, state.showCover);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPage, state.showCover, state.pages]);

  // 翻页
  const goToPage = useCallback((page: number) => {
    setState((s) => ({ ...s, currentPage: Math.max(1, Math.min(page, s.totalPages)) }));
  }, []);

  // 刷新时重置到第 1 页
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      setState((s) => ({ ...s, currentPage: 1, showCover: false, isProcessing: true, error: null }));
    }
  }, [refreshKey]);

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
 * 调整批注位置: 减去装饰剥离前在指定位置之前被移除的括号符数量
 *
 * extractDecorationRanges 剥离装饰标记对（如〈〉〔〕《》）时只移除括号符，
 * 内容保留。本函数扫描 para.text，统计在 position 之前有多少个成对括号被剥离，
 * 返回调整后的位置。
 */
function adjustCommentaryPosition(text: string, position: number): number {
  const OPEN_BRACKETS = '《〔〈｛＜［（';
  const CLOSE_MAP: Record<string, string> = {
    '《': '》', '〔': '〕', '〈': '〉',
    '｛': '｝', '＜': '＞', '［': '］', '（': '）',
  };

  let stripped = 0;
  let i = 0;
  while (i < position && i < text.length) {
    const ch = text[i];
    if (OPEN_BRACKETS.includes(ch)) {
      const close = CLOSE_MAP[ch];
      if (close) {
        const closeIdx = text.indexOf(close, i + 1);
        if (closeIdx !== -1 && closeIdx < position) {
          stripped += 2; // 开括号 + 闭括号
          i = closeIdx + 1;
          continue;
        }
      }
    }
    i++;
  }
  return position - stripped;
}

/**
 * 根据字符索引范围定位所属文件（使用多数内容原则）
 * @param charStart 该页第一个字符在 allChars 中的索引
 * @param charEnd   该页最后一个字符之后
 * @param boundaries 各文件在 allChars 中的起始索引
 */
function findFileIndex(charStart: number, charEnd: number, boundaries: number[]): number {
  // boundaries[i] = 文件 i 的起始字符索引
  // 一页可能跨越多个文件（如序的末尾 + 章节的开头），用多数内容原则判断归属
  let bestIndex = 0;
  let bestCount = 0;
  for (let i = 0; i < boundaries.length; i++) {
    const fileStart = boundaries[i];
    const fileEnd = i < boundaries.length - 1 ? boundaries[i + 1] : charEnd;
    // 该文件在本页中的字符数 = 交集长度
    const overlapStart = Math.max(charStart, fileStart);
    const overlapEnd = Math.min(charEnd, fileEnd);
    const count = Math.max(0, overlapEnd - overlapStart);
    if (count > bestCount) {
      bestCount = count;
      bestIndex = i;
    }
  }
  return bestIndex;
}
