/**
 * PDF 导出面板 — 导出选项 + 预览 + 下载
 * 文件范围选择与文本文件数量联动。
 */
import { useState, useEffect, useCallback } from "react";
import { usePdfExport } from "../hooks/usePdfExport";

import type { BookConfig, CanvasConfig, Page } from "../types/layout";

interface Props {
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  pages: Page[];
  totalPages: number;
}

export default function PdfExportPanel({ bookConfig, canvasConfig, totalPages, pages }: Props) {
  const [fileFrom, setFileFrom] = useState<number>(1);
  const [fileTo, setFileTo] = useState<number>(1);
  const [testPages, setTestPages] = useState<number>(0);
  const [compress, setCompress] = useState<boolean>(false);
  const [includeCover, setIncludeCover] = useState<boolean>(true);

  const { state: pdfState, generate, cleanup } = usePdfExport({
    bookConfig,
    canvasConfig,
    pages,
  });

  // 总页数变化时重置文件范围
  useEffect(() => {
    const max = Math.max(1, totalPages);
    setFileFrom(1);
    setFileTo(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  useEffect(() => {
    return () => cleanup(pdfState.pdfUrl);
  }, [cleanup, pdfState.pdfUrl]);

  const handleFileFromChange = useCallback((val: number) => {
    setFileFrom(val);
    setFileTo(Math.max(val, Math.min(fileTo, totalPages)));
  }, [totalPages, fileTo]);

  const handleGenerate = () => {
    const to = Math.min(Math.max(fileTo, 1), Math.max(totalPages, 1));
    generate({
      testPages: testPages > 0 ? testPages : undefined,
      compress,
      includeCover,
      fileFrom,
      fileTo: to,
    });
  };

  const handleDownload = () => {
    if (!pdfState.pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfState.pdfUrl;
    a.download = `${bookConfig.title}.pdf`;
    a.click();
  };

  return (
    <div className="config-panel">
      <h3 className="config-panel-title">📥 导出 PDF</h3>

      {/* 文件范围选择 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="config-group">
          <label className="config-group-label">起始文件</label>
          <select
            className="config-select"
            value={Math.min(fileFrom, Math.max(totalPages, 1))}
            onChange={(e) => handleFileFromChange(parseInt(e.target.value) || 1)}
            disabled={totalPages === 0}
          >
            {totalPages > 0
              ? Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    第{i + 1}回 (文件{i + 1})
                  </option>
                ))
              : <option value={0}>无文本</option>}
          </select>
        </div>

        <div className="config-group">
          <label className="config-group-label">结束文件</label>
          <select
            className="config-select"
            value={Math.min(fileTo, Math.max(totalPages, 1))}
            onChange={(e) => setFileTo(parseInt(e.target.value) || 1)}
            disabled={totalPages === 0}
          >
            {totalPages > 0
              ? Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    第{i + 1}回 (文件{i + 1})
                  </option>
                ))
              : <option value={0}>无文本</option>}
          </select>
        </div>
      </div>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
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
              <span className="text-xs text-ink/40">页</span>
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
      <div className="mt-4 rounded border border-ink/10 bg-ink/[0.02] p-3 text-xs text-ink/50">
        <p>
          📖 输出文件: <code className="rounded bg-ink/[0.06] px-1">{bookConfig.title}.pdf</code>
        </p>
        <p className="mt-1">
          💡 测试模式仅生成指定页数，用于快速验证排版参数
        </p>
        {totalPages === 0 && (
          <p className="mt-1 text-red-500">
            ⚠ 暂无文本数据 — 请在"文本"标签页添加文本后再导出
          </p>
        )}
      </div>
    </div>
  );
}
