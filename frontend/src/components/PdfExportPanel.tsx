/**
 * PDF 导出面板 — 导出选项 + 预览 + 下载
 * 文件范围选择与文本文件数量联动：
 *   - 复选框：是否包含序 / 附录（仅非空时显示）
 *   - 下拉：章节起止范围
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePdfExport } from "../hooks/usePdfExport";
import type { BookConfig, CanvasConfig, Page } from "../types/layout";

const PREFACE_IDX = 0;
const APPENDIX_IDX = 1;
const CHAPTER_START_IDX = 2;

interface Props {
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  pages: Page[];
  totalPages: number;
  textLines: string[][];
}

export default function PdfExportPanel({ bookConfig, canvasConfig, totalPages, pages, textLines }: Props) {
  // 序/附录 是否有内容
  const hasPreface = (textLines[PREFACE_IDX]?.length ?? 0) > 0;
  const hasAppendix = (textLines[APPENDIX_IDX]?.length ?? 0) > 0;
  const chapterCount = Math.max(0, textLines.length - CHAPTER_START_IDX);

  const [includePreface, setIncludePreface] = useState(hasPreface);
  const [includeAppendix, setIncludeAppendix] = useState(hasAppendix);
  const [chapterFrom, setChapterFrom] = useState(1);
  const [chapterTo, setChapterTo] = useState(chapterCount);
  const [testPages, setTestPages] = useState(0);
  const [compress, setCompress] = useState(false);
  const [includeCover, setIncludeCover] = useState(true);

  // 文本文件数量变化时重置范围
  useEffect(() => {
    setChapterFrom(1);
    setChapterTo(chapterCount);
  }, [chapterCount]);

  useEffect(() => {
    setIncludePreface(hasPreface);
  }, [hasPreface]);

  useEffect(() => {
    setIncludeAppendix(hasAppendix);
  }, [hasAppendix]);

  const { state: pdfState, generate, cleanup } = usePdfExport({
    bookConfig,
    canvasConfig,
    pages,
  });

  useEffect(() => {
    return () => cleanup(pdfState.pdfUrl);
  }, [cleanup, pdfState.pdfUrl]);

  const handleGenerate = useCallback(() => {
    // fileFrom/fileTo 是章节编号，直接传给后端
    // 后端 filterPagesByRange 根据 page.fileIndex 精确过滤
    generate({
      testPages: testPages > 0 ? testPages : undefined,
      compress,
      includeCover,
      includePreface: includePreface || undefined,
      includeAppendix: includeAppendix || undefined,
      fileFrom: chapterFrom,
      fileTo: chapterTo,
    });
  }, [chapterFrom, chapterTo, includePreface, includeAppendix, testPages, compress, includeCover, generate]);

  const handleDownload = () => {
    if (!pdfState.pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfState.pdfUrl;
    a.download = `${bookConfig.title}.pdf`;
    a.click();
  };

  const chapterOptions = useMemo(
    () =>
      Array.from({ length: chapterCount }, (_, i) => (
        <option key={i + 1} value={i + 1}>
          第 {i + 1} 章
        </option>
      )),
    [chapterCount],
  );

  return (
    <div className="config-panel">
      <h3 className="config-panel-title">📥 导出 PDF</h3>

      {/* 序 / 附录复选框 */}
      <div className="flex flex-wrap items-center gap-4">
        {hasPreface && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePreface}
              onChange={(e) => setIncludePreface(e.target.checked)}
              className="accent-vermilion"
            />
            <span>★ 包含序</span>
          </label>
        )}
        {hasAppendix && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeAppendix}
              onChange={(e) => setIncludeAppendix(e.target.checked)}
              className="accent-vermilion"
            />
            <span>★ 包含附录</span>
          </label>
        )}
      </div>

      {/* 章节范围选择 */}
      {chapterCount > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-ink/85">导出范围：第</span>
          <select
            className="config-select w-24"
            value={chapterFrom}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 1;
              setChapterFrom(v);
              if (v > chapterTo) setChapterTo(v);
            }}
            disabled={chapterCount === 0}
          >
            {chapterOptions}
          </select>
          <span className="text-sm text-ink/85">章 至 第</span>
          <select
            className="config-select w-24"
            value={chapterTo}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 1;
              setChapterTo(v);
              if (v < chapterFrom) setChapterFrom(v);
            }}
            disabled={chapterCount === 0}
          >
            {chapterOptions}
          </select>
          <span className="text-sm text-ink/85">章（共 {chapterCount} 章）</span>
        </div>
      )}

      {/* 选项 */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={testPages > 0}
            onChange={(e) => setTestPages(e.target.checked ? 3 : 0)}
            className="accent-vermilion"
          />
          <span>测试模式</span>
          {testPages > 0 && (
            <>
              <input
                type="number"
                min={1}
                max={10}
                value={testPages}
                onChange={(e) => setTestPages(parseInt(e.target.value) || 0)}
                className="config-select w-20"
              />
              <span className="text-xs text-ink/65">页</span>
            </>
          )}
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={compress}
            onChange={(e) => setCompress(e.target.checked)}
            className="accent-vermilion"
          />
          <span>压缩 PDF</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeCover}
            onChange={(e) => setIncludeCover(e.target.checked)}
            className="accent-vermilion"
          />
          <span>包含封面</span>
        </label>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex gap-3">
        <button
          className="btn-primary"
          disabled={pdfState.isGenerating || totalPages === 0}
          onClick={handleGenerate}
        >
          {pdfState.isGenerating ? "生成中..." : "生成 PDF"}
        </button>

        {pdfState.pdfUrl && (
          <button className="btn-ancient" onClick={handleDownload}>
            ⬇ 下载 PDF
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {pdfState.error && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          错误: {pdfState.error}
        </div>
      )}

      {/* 说明 */}
      <div className="mt-4 space-y-2 rounded border border-ink/10 bg-ink/[0.02] p-3 text-xs text-ink/75">
        <p>
          📖 输出文件: <code className="rounded bg-ink/[0.06] px-1">{bookConfig.title || "未命名"}.pdf</code>
          — 文件名取自书籍配置中的书名
        </p>
        <p>
          ★ <b>包含序</b> — 勾选后序言内容会出现在 PDF 正文之前（仅在序有内容时显示此选项）
        </p>
        <p>
          ★ <b>包含附录</b> — 勾选后附录内容会出现在 PDF 正文之后（仅在附录有内容时显示此选项）
        </p>
        <p>
          📄 <b>导出范围</b> — 选择从第几章到第几章，仅导出指定章节的内容
        </p>
        <p>
          🧪 <b>测试模式</b> — 仅生成指定页数（1-10 页），大幅缩短生成时间，用于快速验证排版参数和标记效果
        </p>
        <p>
          📦 <b>压缩 PDF</b> — 使用 Ghostscript 压缩输出文件，减小文件体积（需系统安装 gs 命令）
        </p>
        <p>
          🖼 <b>包含封面</b> — 勾选后在 PDF 开头生成封面页，显示书名和作者信息
        </p>
        {totalPages === 0 && (
          <p className="mt-2 text-red-500">
            ⚠ 暂无文本数据 — 请在"文本"标签页添加文本后再导出
          </p>
        )}
      </div>
    </div>
  );
}
