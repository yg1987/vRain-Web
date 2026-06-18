/**
 * FontSelector — 正文字体 / 批注字体选择器
 *
 * 设计思路：
 *   文本里用 【】 标记批注，所以正文和批注是天然区分的。
 *   用户只需：选一个字体给正文用，选一个字体给批注用。
 *   上传字体按钮可以把 .ttf/.otf 加到可选列表中。
 */
import { useState, useCallback, useRef } from "react";
import type { FontEntry } from "../types/layout";

interface Props {
  /** 已加载的字体列表 */
  fonts: FontEntry[];
  /** 正文字体（取 fonts 的 name） */
  textFontFamily: string;
  /** 批注字体（取 fonts 的 name） */
  commentFontFamily: string;
  /** 正文字号 */
  textFontSize: number;
  /** 批注字号 */
  commentFontSize: number;
  /** 字体变更回调 */
  onChange: (
    textFontFamily: string,
    commentFontFamily: string,
    textFontSize: number,
    commentFontSize: number
  ) => void;
  /** 上传新字体后刷新字体列表 */
  onFontUploaded?: () => void;
}

export default function FontSelector({
  fonts,
  textFontFamily,
  commentFontFamily,
  textFontSize,
  commentFontSize,
  onChange,
  onFontUploaded,
}: Props) {
  const [previewText, setPreviewText] = useState("國");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextFontChange = useCallback(
    (fontName: string) => {
      onChange(fontName, commentFontFamily, textFontSize, commentFontSize);
    },
    [commentFontFamily, textFontSize, onChange]
  );

  const handleCommentFontChange = useCallback(
    (fontName: string) => {
      onChange(textFontFamily, fontName, textFontSize, commentFontSize);
    },
    [textFontFamily, textFontSize, onChange]
  );

  const handleTextSizeChange = useCallback(
    (size: number) => {
      onChange(textFontFamily, commentFontFamily, size, commentFontSize);
    },
    [textFontFamily, commentFontFamily, commentFontSize, onChange]
  );

  const handleCommentSizeChange = useCallback(
    (size: number) => {
      onChange(textFontFamily, commentFontFamily, textFontSize, size);
    },
    [textFontFamily, commentFontSize, textFontSize, onChange]
  );

  // 上传字体
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["ttf", "otf", "woff", "woff2"].includes(ext || "")) {
        alert("仅支持 .ttf / .otf / .woff 字体文件");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) return;
        try {
          const fontName = file.name.replace(/\.[^.]+$/, "");
          const fontFace = new FontFace(fontName, event.target.result as ArrayBuffer);
          fontFace.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            onFontUploaded?.();
          }).catch(() => alert("字体加载失败"));
        } catch {
          alert("字体加载失败");
        }
      };
      reader.readAsArrayBuffer(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onFontUploaded]
  );

  return (
    <div className="config-panel">
      <div className="config-panel-title">🔤 字体选择器</div>

      {/* 正文字体选择 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="config-group">
          <label className="config-group-label">正文字体</label>
          <select
            className="config-select"
            value={textFontFamily}
            onChange={(e) => handleTextFontChange(e.target.value)}
          >
            {fonts.length === 0 && <option value="">（无可用字体）</option>}
            {fonts.map((f) => (
              <option key={f.name} value={f.name}>{f.name || f.filename}</option>
            ))}
          </select>
          <div className="mt-1 text-xs text-ink/30">
            所有正文内容使用此字体
          </div>
        </div>

        {/* 正文字号 */}
        <div className="config-group">
          <label className="config-group-label">正文字号</label>
          <input
            className="config-input"
            type="number"
            min={12}
            max={200}
            value={textFontSize}
            onChange={(e) => handleTextSizeChange(parseInt(e.target.value) || 60)}
          />
        </div>
      </div>

      {/* 批注字体选择 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="config-group">
          <label className="config-group-label">批注字体</label>
          <select
            className="config-select"
            value={commentFontFamily}
            onChange={(e) => handleCommentFontChange(e.target.value)}
          >
            {fonts.length === 0 && <option value="">（无可用字体）</option>}
            {fonts.map((f) => (
              <option key={f.name} value={f.name}>{f.name || f.filename}</option>
            ))}
          </select>
          <div className="mt-1 text-xs text-ink/30">
            【】内的夹批内容使用此字体
          </div>
        </div>

        {/* 批注字号 */}
        <div className="config-group">
          <label className="config-group-label">批注字号</label>
          <input
            className="config-input"
            type="number"
            min={12}
            max={200}
            value={commentFontSize}
            onChange={(e) => handleCommentSizeChange(parseInt(e.target.value) || 45)}
          />
        </div>
      </div>

      {/* 底部：预览 + 上传 */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="config-group-label mb-0">预览</label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value.slice(0, 1))}
            className="config-input w-16 text-center"
            maxLength={1}
          />
        </div>
        <div className="h-4 w-px bg-ink/10" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          type="button"
          className="btn-ancient text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          ＋ 上传字体
        </button>
      </div>
    </div>
  );
}
