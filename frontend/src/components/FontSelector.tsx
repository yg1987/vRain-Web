/**
 * FontSelector — 字体选择器（三行三列）
 *
 * 每行：标签 | 字体下拉 | 字号输入 | 实时预览
 *   正文 — 所有内容
 *   批注 — 【】夹批
 *   封面书名 — 封面书名
 *
 * 封面作者字体沿用正文。
 * 预览文字：共享一个输入框，三行各自显示该字在对应字体下的效果。
 */
import { useState, useCallback, useRef, useMemo } from "react";
import type { FontEntry } from "../types/layout";
import { api } from "../lib/api";

interface Props {
  fonts: FontEntry[];
  textFontFamily: string;
  commentFontFamily: string;
  coverTitleFontFamily: string;
  textFontSize: number;
  commentFontSize: number;
  coverTitleFontSize: number;
  onChange: (
    textFontFamily: string,
    commentFontFamily: string,
    textFontSize: number,
    commentFontSize: number,
    coverTitleFontFamily: string,
    coverTitleFontSize: number,
  ) => void;
  onFontUploaded?: () => void;
  onFontAdd?: (font: FontEntry) => void;
}

export default function FontSelector({
  fonts,
  textFontFamily,
  commentFontFamily,
  coverTitleFontFamily,
  textFontSize,
  commentFontSize,
  coverTitleFontSize,
  onChange,
  onFontUploaded,
  onFontAdd,
}: Props) {
  const [previewText, setPreviewText] = useState("國");
  const [uploadStatus, setUploadStatus] = useState<"" | "success" | "duplicate" | "error">("");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ========== CSS @font-face 注入（比 JS FontFace API 更可靠） ==========
  const fontFaceStyle = useMemo(() => {
    return fonts
      .filter((f) => f.filename)
      .map((f) => `@font-face{font-family:"${f.name}";src:url(/api/fonts/file/${f.filename})}`)
      .join("");
  }, [fonts]);

  // ========== 正文 ==========
  const handleBodyFont = useCallback(
    (v: string) => onChange(v, commentFontFamily, textFontSize, commentFontSize, coverTitleFontFamily, coverTitleFontSize),
    [commentFontFamily, textFontSize, commentFontSize, coverTitleFontFamily, coverTitleFontSize, onChange],
  );
  const handleBodySize = useCallback(
    (v: number) => onChange(textFontFamily, commentFontFamily, v, commentFontSize, coverTitleFontFamily, coverTitleFontSize),
    [textFontFamily, commentFontFamily, commentFontSize, coverTitleFontFamily, coverTitleFontSize, onChange],
  );

  // ========== 批注 ==========
  const handleCommentFont = useCallback(
    (v: string) => onChange(textFontFamily, v, textFontSize, commentFontSize, coverTitleFontFamily, coverTitleFontSize),
    [textFontFamily, textFontSize, commentFontSize, coverTitleFontFamily, coverTitleFontSize, onChange],
  );
  const handleCommentSize = useCallback(
    (v: number) => {
      // 批注字号 ≤ 正文一半，确保双列小字不超列宽
      const clamped = Math.max(12, Math.min(v, Math.floor(textFontSize / 2)));
      onChange(textFontFamily, commentFontFamily, textFontSize, clamped, coverTitleFontFamily, coverTitleFontSize);
    },
    [textFontFamily, commentFontFamily, textFontSize, coverTitleFontFamily, coverTitleFontSize, onChange],
  );

  // ========== 封面书名 ==========
  const handleCoverFont = useCallback(
    (v: string) => onChange(textFontFamily, commentFontFamily, textFontSize, commentFontSize, v, coverTitleFontSize),
    [textFontFamily, commentFontFamily, textFontSize, commentFontSize, coverTitleFontSize, onChange],
  );
  const handleCoverSize = useCallback(
    (v: number) => onChange(textFontFamily, commentFontFamily, textFontSize, commentFontSize, coverTitleFontFamily, v),
    [textFontFamily, commentFontFamily, textFontSize, commentFontSize, coverTitleFontFamily, onChange],
  );

  // ========== 上传字体 ==========
  const clearUploadStatus = useCallback(() => {
    if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
    uploadTimerRef.current = setTimeout(() => {
      setUploadStatus("");
      setUploadMessage("");
    }, 3000);
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["ttf", "otf", "woff", "woff2"].includes(ext || "")) {
        setUploadStatus("error");
        setUploadMessage("仅支持 .ttf / .otf / .woff 字体文件");
        clearUploadStatus();
        return;
      }
      const fontName = file.name.replace(/\.[^.]+$/, "");
      // 检查是否已存在
      if (fonts.some((f) => f.name === fontName)) {
        setUploadStatus("duplicate");
        setUploadMessage(`"${fontName}" 已存在，无需重复上传`);
        clearUploadStatus();
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      try {
        const result = await api.uploadFont(file);
        onFontAdd?.({ name: fontName, filename: result.filename, textPointSize: 60, commentPointSize: 45, rotate: 0 });
        onFontUploaded?.();
        setUploadStatus("success");
        setUploadMessage(`"${fontName}" 上传成功`);
        clearUploadStatus();
      } catch (err) {
        setUploadStatus("error");
        setUploadMessage(err instanceof Error ? err.message : "字体上传失败");
        clearUploadStatus();
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [fonts, onFontAdd, onFontUploaded, clearUploadStatus],
  );

  // ========== 下拉选项 ==========
  const fontOptions = fonts.length === 0
    ? <option value="">（无可用字体）</option>
    : fonts.map((f) => <option key={f.name} value={f.name}>{f.name}</option>);

  // ========== 渲染 ==========
  return (
    <div className="config-panel">
      <div className="config-panel-title">🔤 字体选择器</div>

      {/* CSS @font-face 声明 — 浏览器原生加载，最可靠的方式 */}
      {fontFaceStyle && <style>{fontFaceStyle}</style>}

      {/* 一行：label | 字体下拉 | 字号 | 预览 */}
      {([
        { label: "正文", font: textFontFamily, size: textFontSize, onFont: handleBodyFont, onSize: handleBodySize },
        { label: "批注", font: commentFontFamily, size: commentFontSize, onFont: handleCommentFont, onSize: handleCommentSize },
        { label: "封面书名", font: coverTitleFontFamily, size: coverTitleFontSize, onFont: handleCoverFont, onSize: handleCoverSize },
      ] as const).map((row) => (
        <div key={row.label} className="mb-3 flex items-center gap-3 border-b border-ink/5 pb-3">
          {/* 标签 */}
          <span className="w-16 shrink-0 text-sm font-medium text-ink/90">{row.label}</span>

          {/* 字体下拉 */}
          <select
            className="flex-1 min-w-0 rounded border border-ink/20 bg-white px-2 py-1.5 text-sm focus:border-vermilion focus:outline-none"
            value={row.font}
            onChange={(e) => row.onFont(e.target.value)}
          >
            {fontOptions}
          </select>

          {/* 字号 */}
          <input
            type="number"
            className="w-20 shrink-0 rounded border border-ink/20 bg-white px-2 py-1.5 text-center text-sm focus:border-vermilion focus:outline-none"
            min={12}
            max={200}
            value={row.size}
            onChange={(e) => row.onSize(parseInt(e.target.value) || row.size)}
          />

          {/* 预览 — 直接应用 font-family，CSS @font-face 确保字体可用 */}
          <div
            className="flex-1 min-w-0 overflow-hidden rounded border border-ink/10 bg-white/60 px-3 py-1.5 text-2xl text-ink"
            style={{ fontFamily: `"${row.font}", serif` }}
          >
            {previewText || "字"}
          </div>
        </div>
      ))}

      <p className="mb-3 text-[11px] text-ink/65">
        封面作者字体沿用正文，字号在书籍配置中调整
      </p>

      {/* 底部：共享预览输入 + 上传字体 */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink/65">预览文字</span>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value.slice(0, 3))}
          className="w-16 rounded border border-ink/20 bg-white px-2 py-1 text-center text-sm focus:border-vermilion focus:outline-none"
          maxLength={3}
        />
        <div className="h-4 w-px bg-ink/10" />
        <input ref={fileInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFileUpload} />
        <button type="button" className="btn-ancient text-xs" onClick={() => fileInputRef.current?.click()}>
          ＋ 上传字体
        </button>

        {/* 上传状态提示 */}
        {uploadStatus && (
          <div className={`ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
            uploadStatus === "success" ? "bg-green-50 text-green-700" :
            uploadStatus === "duplicate" ? "bg-amber-50 text-amber-700" :
            "bg-red-50 text-red-700"
          }`}>
            {uploadStatus === "success" && <span>✓</span>}
            {uploadStatus === "duplicate" && <span>ⓘ</span>}
            {uploadStatus === "error" && <span>✕</span>}
            {uploadMessage}
          </div>
        )}
      </div>
    </div>
  );
}
