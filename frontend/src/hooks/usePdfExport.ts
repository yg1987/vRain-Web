/**
 * usePdfExport — PDF 导出 Hook
 *
 * 将配置 + IR 数据发送到后端 /api/render/pdf，
 * 接收 PDF blob，提供下载 URL。
 */
import { useState, useCallback, useEffect } from "react";
import type { Page, BookConfig, CanvasConfig } from "../types/layout";

export interface PdfExportState {
  isGenerating: boolean;
  progress: number; // 0-100
  error: string | null;
  pdfUrl: string;   // blob URL for download
}

export interface PdfExportOptions {
  testPages?: number;
  compress?: boolean;
  includeCover?: boolean;
  includePreface?: boolean;
  includeAppendix?: boolean;
  fileFrom?: number;
  fileTo?: number;
}

export function usePdfExport(options: {
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  pages: Page[];
}) {
  const { bookConfig, canvasConfig, pages } = options;

  const [state, setState] = useState<PdfExportState>({
    isGenerating: false,
    progress: 0,
    error: null,
    pdfUrl: "",
  });

  /** 发起 PDF 生成请求 */
  const generate = useCallback(
    async (opts: PdfExportOptions = {}) => {
      setState((s) => ({
        ...s,
        isGenerating: true,
        progress: 0,
        error: null,
        pdfUrl: "",
      }));

      try {
        const response = await fetch("/api/render/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pages,
            bookConfig,
            canvasConfig,
            ...opts,
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(
            errBody.error || `HTTP ${response.status}: ${response.statusText}`,
          );
        }

        const blob = await response.blob();
        // 撤销旧的 URL
        if (state.pdfUrl) {
          URL.revokeObjectURL(state.pdfUrl);
        }
        const url = URL.createObjectURL(blob);

        setState({
          isGenerating: false,
          progress: 100,
          error: null,
          pdfUrl: url,
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          isGenerating: false,
          error: (err as Error).message,
        }));
      }
    },
    [pages, bookConfig, canvasConfig],
  );

  /** 清理 blob URL，防止内存泄漏 */
  const cleanup = useCallback((url: string) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  // 组件卸载时自动清理
  useEffect(() => {
    return () => cleanup(state.pdfUrl);
  }, [cleanup, state.pdfUrl]);

  return { state, generate, cleanup };
}
