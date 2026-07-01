/**
 * 文本编辑器 — 源文本编辑 + 标记语法提示
 *
 * 文件列表固定结构：
 *   [0] ★序        → _preface.txt（可为空，空=无序）
 *   [1] ★附录      → _appendix.txt（可为空，空=无附录）
 *   [2+] 01.txt ~   → 各章节
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { num2zh } from "../lib/num2zh";

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
  const [localTitle, setLocalTitle] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 同步当前文件的本地内容和标题
  // 仅在 activeIdx 变化或内容实际变化时同步，避免重渲染时覆盖用户编辑
  const lastSyncedRef = useRef<{ idx: number; contentSig: string; titleSig: string }>({
    idx: -1, contentSig: "", titleSig: "",
  });

  useEffect(() => {
    const contentSig = (textLines[activeIdx] || []).join("\n");
    const titleSig = chapterTitles[activeIdx] || "";
    const last = lastSyncedRef.current;
    if (last.idx === activeIdx && last.contentSig === contentSig && last.titleSig === titleSig) return;
    lastSyncedRef.current = { idx: activeIdx, contentSig, titleSig };
    setLocalContent(contentSig);
    setLocalTitle(titleSig);
  }, [activeIdx, textLines, chapterTitles]);

  // 内容是否已修改
  const isDirty = localContent !== (textLines[activeIdx]?.join("\n") || "")
    || localTitle !== (chapterTitles[activeIdx] || "");

  // 保存内容和标题
  const saveAll = useCallback(() => {
    // 保存内容
    const lines = localContent.split("\n");
    const newLines = [...textLines];
    newLines[activeIdx] = lines;
    setTextLines(newLines);
    // 保存标题
    const newTitles = [...chapterTitles];
    newTitles[activeIdx] = localTitle;
    setChapterTitles(newTitles);
  }, [activeIdx, localContent, localTitle, textLines, chapterTitles, setTextLines, setChapterTitles]);

  // 切换文件前保存
  const handleSelect = useCallback(
    (idx: number) => {
      saveAll();
      setActiveIdx(idx);
    },
    [saveAll],
  );

  // 失焦自动保存
  const handleBlur = useCallback(() => {
    saveAll();
  }, [saveAll]);

  // 插入标记 — 有选中时包裹，无选中时插入标记对或单字符
  const insertMark = useCallback((before: string, after: string | null) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    let newText: string;
    let cursor: number;

    if (after !== null) {
      if (selected.length > 0) {
        newText = ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
        cursor = start + before.length + selected.length + after.length;
      } else {
        newText = ta.value.slice(0, start) + before + after + ta.value.slice(end);
        cursor = start + before.length;
      }
    } else {
      newText = ta.value.slice(0, start) + before + ta.value.slice(end);
      cursor = start + before.length;
    }

    setLocalContent(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }, []);

  // 新增章节
  const handleAddChapter = useCallback(() => {
    saveAll();
    const newLines = [...textLines, []];
    setTextLines(newLines);
    // 同时添加默认章节标题
    const newNum = newLines.length - CHAPTER_START_IDX;
    const newTitles = [...chapterTitles];
    newTitles[newLines.length - 1] = `第${num2zh(newNum)}章`;
    setChapterTitles(newTitles);
    setActiveIdx(newLines.length - 1);
  }, [saveAll, textLines, setTextLines, chapterTitles, setChapterTitles]);

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

  return (
    <div className="flex h-full gap-4">
      {/* 左侧文件列表 */}
      <div className="w-48 shrink-0 space-y-1">
        <h3 className="mb-2 text-sm font-semibold text-ink">📄 文本文件</h3>

        {/* 序 */}
        <button
          onClick={() => handleSelect(PREFACE_IDX)}
          className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
            activeIdx === PREFACE_IDX
              ? "bg-vermilion/10 font-semibold text-vermilion"
              : "text-ink hover:bg-ink/[0.04]"
          }`}
        >
          <span className="mr-1">★</span>
          序
        </button>

        {/* 附录 */}
        <button
          onClick={() => handleSelect(APPENDIX_IDX)}
          className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
            activeIdx === APPENDIX_IDX
              ? "bg-vermilion/10 font-semibold text-vermilion"
              : "text-ink hover:bg-ink/[0.04]"
          }`}
        >
          <span className="mr-1">★</span>
          附录
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
                  : "text-ink hover:bg-ink/[0.04]"
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
            className="flex-1 rounded border border-dashed border-ink/20 px-2 py-1 text-xs text-ink/80 transition-colors hover:border-green-400 hover:text-green-700"
          >
            ＋ 新增章节
          </button>
          {chapterCount > 1 && isChapter && (
            <button
              onClick={handleDeleteChapter}
              className="rounded border border-dashed border-ink/20 px-2 py-1 text-xs text-ink/80 transition-colors hover:border-red-400 hover:text-red-600"
              title="删除当前章节"
            >
              ✕
            </button>
          )}
        </div>

        <p className="mt-2 text-[10px] text-ink/70">
          共 {chapterCount} 章 · 序和附录为空则不导出
        </p>
      </div>

      {/* 右侧编辑区 */}
      <div className="flex flex-1 flex-col">
        {/* 顶栏：文件标识 + 保存按钮 */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink/80">
            {activeIdx === PREFACE_IDX && <span>★ 序</span>}
            {activeIdx === APPENDIX_IDX && <span>★ 附录</span>}
            {isChapter && (
              <span>
                {String(chapterNum).padStart(2, "0")}.txt · 第 {chapterNum} 章 · 共 {currentContent.split("\n").length} 行
              </span>
            )}
          </div>
          <button
            onClick={saveAll}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              isDirty
                ? "bg-vermilion text-white hover:bg-vermilion/90"
                : "border border-ink/15 text-ink/70"
            }`}
          >
            💾 保存
          </button>
        </div>

        {/* 章节标题输入 */}
        <div className="mb-2 flex items-center gap-2">
          <label className="text-xs text-ink whitespace-nowrap">
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
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
          />
        </div>

        {/* 标记工具栏 */}
        <div className="mb-2 space-y-1">
          <div className="text-[10px] text-ink/60">标记工具 · 选中文字后点击包裹，或直接点击插入</div>
          <div className="flex flex-wrap gap-1">
            <ToolBtn label="【夹批】" title="双列小字注释" onClick={() => insertMark("【", "】")} />
            <ToolBtn label="《书名》" title="右侧波浪线装饰" onClick={() => insertMark("《", "》")} />
            <ToolBtn label="〔框〕" title="圆角矩形包围" onClick={() => insertMark("〔", "〕")} />
            <ToolBtn label="〈圈〉" title="圆形包围" onClick={() => insertMark("〈", "〉")} />
            <ToolBtn label="（大）" title="字体放大" onClick={() => insertMark("（", "）")} />
            <ToolBtn label="｛注｝" title="右侧小圆圈注" onClick={() => insertMark("｛", "｝")} />
            <ToolBtn label="＜点＞" title="右侧顿号点注" onClick={() => insertMark("＜", "＞")} />
            <ToolBtn label="［行］" title="右侧竖线行注" onClick={() => insertMark("［", "］")} />
            <span className="mx-1 border-l border-ink/15" />
            <ToolBtn label="% 换页" title="从此处另起一页" onClick={() => insertMark("%", null)} />
            <ToolBtn label="$ 半页" title="跳到下半页继续" onClick={() => insertMark("$", null)} />
            <ToolBtn label="& 末列" title="跳到当页最后一列" onClick={() => insertMark("&", null)} />
            <ToolBtn label="@ 空格" title="插入一个空格位" onClick={() => insertMark("@", null)} />
            <ToolBtn label="T 缩进" title="段落首行缩进一字" onClick={() => insertMark("T", null)} />
            <ToolBtn label="^ 多栏" title="跳到下一栏块" onClick={() => insertMark("^", null)} />
          </div>
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

        <p className="mt-2 text-[11px] text-ink/60">标记符号 详细说明请查看配置页</p>
      </div>
    </div>
  );
}

/** 标记工具栏按钮 */
function ToolBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded border border-ink/20 bg-ink/[0.03] px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-sm transition-all hover:border-vermilion/40 hover:bg-vermilion/10 hover:text-vermilion hover:shadow active:scale-95"
    >
      {label}
    </button>
  );
}
