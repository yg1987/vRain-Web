/**
 * ImportExportPanel — 项目导入/导出面板
 *
 * 支持:
 *   1. 导出 JSON Bundle (下载 .json)
 *   2. 导入 JSON Bundle (从 .json 加载)
 *   3. 导入原版 .cfg + .txt 目录结构
 *   4. 导出为原版兼容的 .cfg + .txt
 */
import { useState, useCallback, useRef } from "react";
import type { BookConfig, CanvasConfig } from "../types/layout";
import {
  createBundle,
  downloadBundle,
  parseBundle,
  readBundleFile,
  bundleToCfgDirs,
  cfgToBundle,
  type TextFile,
  type VrainBundle,
} from "../lib/bundle";

interface Props {
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  textLines: string[][];
  onImport: (
    name: string,
    book: BookConfig,
    canvas: CanvasConfig,
    textLines: string[][]
  ) => void;
}

export default function ImportExportPanel({
  bookConfig,
  canvasConfig,
  textLines,
  onImport,
}: Props) {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const bundleInputRef = useRef<HTMLInputElement>(null);
  const cfgBookRef = useRef<HTMLInputElement>(null);
  const cfgCanvasRef = useRef<HTMLInputElement>(null);
  const cfgTextsRef = useRef<HTMLInputElement>(null);

  // =========================================================================
  // 导出 JSON Bundle
  // =========================================================================
  const handleExportBundle = useCallback(() => {
    try {
      const textFiles: TextFile[] = textLines.map((lines, i) => ({
        filename: `${String(i).padStart(2, "0")}.txt`,
        content: lines.join("\n"),
      }));

      const bundle = createBundle(
        bookConfig.title || "未命名",
        bookConfig,
        canvasConfig,
        textFiles
      );
      downloadBundle(bundle);
      setStatus("已导出 JSON Bundle");
      setError("");
    } catch (err) {
      setError(`导出失败: ${(err as Error).message}`);
    }
  }, [bookConfig, canvasConfig, textLines]);

  // =========================================================================
  // 导入 JSON Bundle
  // =========================================================================
  const handleImportBundle = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const bundle = await readBundleFile(file);
        const data = bundleToCfgDirs(bundle);

        // 解析 book.cfg
        const { parseCfg, parseBookConfig, parseCanvasConfig } =
          await import("../lib/config-parser");
        const bookMap = parseCfg(data.bookCfg);
        const book = parseBookConfig(bookMap);

        // 解析 canvas.cfg
        const canvasMap = parseCfg(data.canvasCfg);
        const canvas = parseCanvasConfig(canvasMap);

        // 转换文本文件
        const text: string[][] = [];
        for (const [, content] of Object.entries(data.textFiles)) {
          text.push(content.split(/\r?\n/));
        }

        onImport(bundle.name, book, canvas, text);
        setStatus(`已导入: ${bundle.name}`);
        setError("");
      } catch (err) {
        setError(`导入失败: ${(err as Error).message}`);
        setStatus("");
      } finally {
        // 重置 input 允许重复选择同一文件
        if (bundleInputRef.current) {
          bundleInputRef.current.value = "";
        }
      }
    },
    [onImport]
  );

  // =========================================================================
  // 导入原版 .cfg + .txt
  // =========================================================================
  const handleImportCfg = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      let bookContent = "";
      let canvasContent = "";
      const txtFiles: { filename: string; content: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();

        if (file.name === "book.cfg") {
          bookContent = text;
        } else if (file.name === "canvas.cfg") {
          canvasContent = text;
        } else if (file.name.endsWith(".txt")) {
          txtFiles.push({ filename: file.name, content: text });
        }
      }

      if (!bookContent || !canvasContent) {
        throw new Error("需要同时选择 book.cfg 和 canvas.cfg");
      }

      // 解析
      const { parseCfg, parseBookConfig, parseCanvasConfig } =
        await import("../lib/config-parser");
      const book = parseBookConfig(parseCfg(bookContent));
      const canvas = parseCanvasConfig(parseCfg(canvasContent));

      // 文本
      const text: string[][] = txtFiles.map((tf) => tf.content.split(/\r?\n/));

      onImport(book.title || "导入的项目", book, canvas, text);
      setStatus(`已导入: ${book.title}`);
      setError("");
    } catch (err) {
      setError(`导入失败: ${(err as Error).message}`);
      setStatus("");
    } finally {
      if (cfgBookRef.current) cfgBookRef.current.value = "";
      if (cfgCanvasRef.current) cfgCanvasRef.current.value = "";
      if (cfgTextsRef.current) cfgTextsRef.current.value = "";
    }
  }, [onImport]);

  // =========================================================================
  // 导出为原版兼容的 .cfg + .txt
  // =========================================================================
  const handleExportCfg = useCallback(() => {
    try {
      const textFiles: TextFile[] = textLines.map((lines, i) => ({
        filename: `${String(i).padStart(2, "0")}.txt`,
        content: lines.join("\n"),
      }));

      const bundle = createBundle(
        bookConfig.title || "未命名",
        bookConfig,
        canvasConfig,
        textFiles
      );

      const dirs = bundleToCfgDirs(bundle);

      // 下载 book.cfg
      downloadTextFile(`${bookConfig.title || "project"}-book.cfg`, dirs.bookCfg);
      // 下载 canvas.cfg
      downloadTextFile(`${bookConfig.title || "project"}-canvas.cfg`, dirs.canvasCfg);
      // 下载文本文件
      for (const [filename, content] of Object.entries(dirs.textFiles)) {
        downloadTextFile(filename, content);
      }

      setStatus("已导出为 .cfg + .txt");
      setError("");
    } catch (err) {
      setError(`导出失败: ${(err as Error).message}`);
    }
  }, [bookConfig, canvasConfig, textLines]);

  // 辅助: 下载文本文件
  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="config-panel">
      <h3 className="config-panel-title">📦 导入 / 导出</h3>

      {/* ——— 导出 ——— */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-ink/70 mb-2">导出</h4>

        <div className="space-y-3">
          <button className="btn-primary w-full" onClick={handleExportBundle}>
            导出 JSON Bundle (.json)
          </button>
          <p className="text-xs text-ink/40">
            包含配置 + 文本，可在其他设备恢复项目
          </p>

          <button className="btn-ancient w-full" onClick={handleExportCfg}>
            导出 .cfg + .txt (原版兼容)
          </button>
          <p className="text-xs text-ink/40">
            生成 book.cfg + canvas.cfg + 文本文件，可与原版 vRain 共用
          </p>
        </div>
      </div>

      <div className="border-t border-ink/10 my-4" />

      {/* ——— 导入 ——— */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink/70 mb-2">导入</h4>

        <div className="space-y-3">
          <div>
            <input
              ref={bundleInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBundle}
              className="text-sm w-full"
            />
            <p className="text-xs text-ink/40 mt-1">
              从 JSON Bundle 恢复项目
            </p>
          </div>

          <div>
            <input
              ref={cfgBookRef}
              type="file"
              accept=".cfg"
              onChange={handleImportCfg}
              className="text-sm w-full"
            />
            <p className="text-xs text-ink/40 mt-1">
              选择 book.cfg (需同时选择 canvas.cfg 和 .txt 文件)
            </p>
          </div>
        </div>
      </div>

      {/* 状态 */}
      {status && (
        <div className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
          {status}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
