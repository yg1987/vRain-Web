/**
 * 文本编辑器 — 源文本编辑 + 标记语法提示
 * 与父组件 textLines 联动：切换文件 → 显示对应文件内容 → 保存 → 回传父组件
 */
import { useState, useCallback, useEffect, useRef } from "react";

interface TextEditorProps {
  textLines: string[][];
  setTextLines: (lines: string[][]) => void;
  selectedFile?: string | null;
}

interface TxtFileInfo {
  filename: string;
  label: string;
}

const TXT_FILES: TxtFileInfo[] = [
  { filename: "00.txt", label: "00.txt (序)" },
  { filename: "01.txt", label: "01.txt (第一章)" },
  { filename: "02.txt", label: "02.txt (第二章)" },
];

export default function TextEditor({
  textLines,
  setTextLines,
  selectedFile,
}: TextEditorProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [localContent, setLocalContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 父组件 textLines 变化时，同步当前文件的本地内容
  useEffect(() => {
    const currentLines = textLines[activeFileIndex] || [];
    setLocalContent(currentLines.join("\n"));
  }, [activeFileIndex, textLines]);

  // 外部 selectedFile 变化时切换
  useEffect(() => {
    if (selectedFile) {
      const idx = TXT_FILES.findIndex((f) => f.filename === selectedFile);
      if (idx >= 0) setActiveFileIndex(idx);
    }
  }, [selectedFile]);

  // 切换文件
  const handleFileChange = useCallback(
    (index: number) => {
      // 先保存当前文件内容
      saveCurrentFile();
      setActiveFileIndex(index);
    },
    [textLines]
  );

  // 保存当前文件内容
  const saveCurrentFile = useCallback(() => {
    const lines = localContent.split("\n");
    const newLines = [...textLines];
    newLines[activeFileIndex] = lines;
    setTextLines(newLines);
  }, [activeFileIndex, localContent, textLines, setTextLines]);

  // 失焦自动保存
  const handleBlur = useCallback(() => {
    saveCurrentFile();
  }, [saveCurrentFile]);

  const currentFile = TXT_FILES[activeFileIndex];
  const currentContent = textLines[activeFileIndex]?.join("\n") || "";

  return (
    <div className="config-panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="config-panel-title m-0">📄 文本文件</h3>
        <div className="flex gap-2 items-center">
          <select
            className="config-select w-48"
            value={activeFileIndex}
            onChange={(e) => handleFileChange(parseInt(e.target.value))}
          >
            {TXT_FILES.map((f, i) => (
              <option key={f.filename} value={i}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-ink/40">
            {currentFile.filename} · {currentContent.split("\n").length} 行
          </span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        className="text-editor"
        placeholder="在此输入文本内容..."
        value={currentContent}
        onChange={(e) => setLocalContent(e.target.value)}
        onBlur={handleBlur}
      />

      {/* 标记语法提示 */}
      <div className="mt-4 rounded border border-ink/10 bg-ink/[0.02] p-3">
        <h4 className="mb-2 text-xs font-semibold text-ink/50">
          标记语法参考
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-ink/60">
          <div><code className="rounded bg-ink/[0.06] px-1">【】</code> 夹批注释</div>
          <div><code className="rounded bg-ink/[0.06] px-1">《》</code> 书名号线</div>
          <div><code className="rounded bg-ink/[0.06] px-1">{`〔〕`}</code> 圆角框</div>
          <div><code className="rounded bg-ink/[0.06] px-1">{`〈》`}</code> 圆圈</div>
          <div><code className="rounded bg-ink/[0.06] px-1">{`（）`}</code> 字体放大</div>
          <div><code className="rounded bg-ink/[0.06] px-1">{`｛｝`}</code> 圈注</div>
          <div><code className="rounded bg-ink/[0.06] px-1">{`＜＞`}</code> 顿点注</div>
          <div><code className="rounded bg-ink/[0.06] px-1">{`［］`}</code> 行注</div>
          <div><code className="rounded bg-ink/[0.06] px-1">%</code> 强制换页</div>
          <div><code className="rounded bg-ink/[0.06] px-1">$</code> 半页跳</div>
          <div><code className="rounded bg-ink/[0.06] px-1">&amp;</code> 末列跳</div>
          <div><code className="rounded bg-ink/[0.06] px-1">@</code> 空格</div>
          <div><code className="rounded bg-ink/[0.06] px-1">T</code> 段落缩进</div>
          <div><code className="rounded bg-ink/[0.06] px-1">^</code> 多栏跳</div>
        </div>
      </div>
    </div>
  );
}
