/**
 * 文本编辑器 — 源文本编辑 + 标记语法提示
 *
 * 文件列表固定结构：
 *   [0] ★序        → _preface.txt（可为空，空=无序）
 *   [1] ★附录      → _appendix.txt（可为空，空=无附录）
 *   [2+] 01.txt ~   → 各章节
 */
import { useState, useCallback, useEffect, useRef } from "react";

interface TextEditorProps {
  textLines: string[][];
  setTextLines: (lines: string[][]) => void;
  chapterTitles: string[];
  setChapterTitles: (titles: string[]) => void;
}

/** 固定条目索引 */
const PREFACE_IDX = 0;
const APPENDIX_IDX = 1;
const CHAPTER_START_IDX = 2;

export default function TextEditor({ textLines, setTextLines, chapterTitles, setChapterTitles }: TextEditorProps) {
  const [activeIdx, setActiveIdx] = useState(PREFACE_IDX);
  const [localContent, setLocalContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 同步当前文件的本地内容
  useEffect(() => {
    const currentLines = textLines[activeIdx] || [];
    setLocalContent(currentLines.join("\n"));
  }, [activeIdx, textLines]);

  // 当前章节标题
  const currentTitle = chapterTitles[activeIdx] || "";

  // 保存当前文件内容
  const saveCurrentFile = useCallback(() => {
    const lines = localContent.split("\n");
    const newLines = [...textLines];
    newLines[activeIdx] = lines;
    setTextLines(newLines);
  }, [activeIdx, localContent, textLines, setTextLines]);

  // 保存章节标题
  const saveChapterTitle = useCallback(
    (title: string) => {
      const newTitles = [...chapterTitles];
      newTitles[activeIdx] = title;
      setChapterTitles(newTitles);
    },
    [activeIdx, chapterTitles, setChapterTitles],
  );

  // 切换文件前保存
  const handleSelect = useCallback(
    (idx: number) => {
      saveCurrentFile();
      setActiveIdx(idx);
    },
    [saveCurrentFile],
  );

  // 失焦自动保存
  const handleBlur = useCallback(() => {
    saveCurrentFile();
  }, [saveCurrentFile]);

  // 新增章节
  const handleAddChapter = useCallback(() => {
    saveCurrentFile();
    const newLines = [...textLines, []];
    setTextLines(newLines);
    setActiveIdx(newLines.length - 1);
  }, [saveCurrentFile, textLines, setTextLines]);

  // 删除章节
  const handleDeleteChapter = useCallback(() => {
    const chapterCount = textLines.length - CHAPTER_START_IDX;
    if (chapterCount <= 1) return;
    const newLines = textLines.filter((_, i) => i !== activeIdx);
    setTextLines(newLines);
    setActiveIdx(Math.min(activeIdx, newLines.length - 1));
  }, [activeIdx, textLines, setTextLines]);

  const currentContent = textLines[activeIdx]?.join("\n") || "";
  const isChapter = activeIdx >= CHAPTER_START_IDX;
  const chapterCount = Math.max(0, textLines.length - CHAPTER_START_IDX);
  const chapterNum = isChapter ? activeIdx - CHAPTER_START_IDX + 1 : 0;
  const hasPreface = (textLines[PREFACE_IDX]?.length ?? 0) > 0;
  const hasAppendix = (textLines[APPENDIX_IDX]?.length ?? 0) > 0;

  return (
    <div className="flex h-full gap-4">
      {/* 左侧文件列表 */}
      <div className="w-48 shrink-0 space-y-1">
        <h3 className="mb-2 text-sm font-semibold text-ink/90">📄 文本文件</h3>

        {/* 序 */}
        <button
          onClick={() => handleSelect(PREFACE_IDX)}
          className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
            activeIdx === PREFACE_IDX
              ? "bg-vermilion/10 font-semibold text-vermilion"
              : "text-ink/85 hover:bg-ink/[0.04]"
          }`}
        >
          <span className="mr-1">★</span>
          {hasPreface ? "序" : "序（空）"}
        </button>

        {/* 附录 */}
        <button
          onClick={() => handleSelect(APPENDIX_IDX)}
          className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
            activeIdx === APPENDIX_IDX
              ? "bg-vermilion/10 font-semibold text-vermilion"
              : "text-ink/85 hover:bg-ink/[0.04]"
          }`}
        >
          <span className="mr-1">★</span>
          {hasAppendix ? "附录" : "附录（空）"}
        </button>

        <div className="border-t border-ink/10 my-2" />

        {/* 章节列表 */}
        {Array.from({ length: chapterCount }, (_, i) => {
          const idx = CHAPTER_START_IDX + i;
          const num = i + 1;
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`group w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
                activeIdx === idx
                  ? "bg-vermilion/10 font-semibold text-vermilion"
                  : "text-ink/85 hover:bg-ink/[0.04]"
              }`}
            >
              <span className="mr-1 font-mono text-[10px] opacity-50">
                {String(num).padStart(2, "0")}.txt
              </span>
              第{num}章
            </button>
          );
        })}

        {/* 底部操作 */}
        <div className="flex gap-1 pt-2">
          <button
            onClick={handleAddChapter}
            className="flex-1 rounded border border-dashed border-ink/20 px-2 py-1 text-xs text-ink/65 transition-colors hover:border-green-400 hover:text-green-700"
          >
            ＋ 新增章节
          </button>
          {chapterCount > 1 && isChapter && (
            <button
              onClick={handleDeleteChapter}
              className="rounded border border-dashed border-ink/20 px-2 py-1 text-xs text-ink/65 transition-colors hover:border-red-400 hover:text-red-600"
              title="删除当前章节"
            >
              ✕
            </button>
          )}
        </div>

        <p className="mt-2 text-[10px] text-ink/55">
          共 {chapterCount} 章 · 序和附录为空则不导出
        </p>
      </div>

      {/* 右侧编辑区 */}
      <div className="flex flex-1 flex-col">
        {/* 当前文件标识 */}
        <div className="mb-2 flex items-center gap-2 text-xs text-ink/65">
          {activeIdx === PREFACE_IDX && <span>★ 序（{hasPreface ? "有内容" : "空"}）</span>}
          {activeIdx === APPENDIX_IDX && <span>★ 附录（{hasAppendix ? "有内容" : "空"}）</span>}
          {isChapter && (
            <span>
              {String(chapterNum).padStart(2, "0")}.txt · 第 {chapterNum} 章 · 共 {currentContent.split("\n").length} 行
            </span>
          )}
        </div>

        {/* 章节标题输入 */}
        <div className="mb-2 flex items-center gap-2">
          <label className="text-xs text-ink/75 whitespace-nowrap">
            标题:
          </label>
          <input
            type="text"
            className="flex-1 rounded border border-ink/15 bg-white/60 px-2 py-1 text-xs text-ink/95 transition-colors focus:border-vermilion/40 focus:outline-none"
            placeholder={
              activeIdx === PREFACE_IDX
                ? "如：序"
                : activeIdx === APPENDIX_IDX
                ? "如：附录"
                : "如：第一回 贾宝玉梦游太虚境"
            }
            value={currentTitle}
            onChange={(e) => saveChapterTitle(e.target.value)}
          />
        </div>

        <textarea
          ref={textareaRef}
          className="text-editor flex-1"
          placeholder={
            activeIdx === PREFACE_IDX
              ? "在此输入序言内容…（留空则视为无序）"
              : activeIdx === APPENDIX_IDX
              ? "在此输入附录内容…（留空则视为无附录）"
              : "在此输入文本内容..."
          }
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={handleBlur}
        />

        {/* 标记语法提示 */}
        <div className="mt-4 rounded border border-ink/10 bg-ink/[0.02] p-3">
          <h4 className="mb-2 text-xs font-semibold text-ink/75">标记语法参考</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-ink/85">
            <div><code className="rounded bg-ink/[0.06] px-1">【】</code> 夹批注释</div>
            <div><code className="rounded bg-ink/[0.06] px-1">《》</code> 书名号线</div>
            <div><code className="rounded bg-ink/[0.06] px-1">{`〔〕`}</code> 圆角框</div>
            <div><code className="rounded bg-ink/[0.06] px-1">{`〈〉`}</code> 圆圈</div>
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
    </div>
  );
}
