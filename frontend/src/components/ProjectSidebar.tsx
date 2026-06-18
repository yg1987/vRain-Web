/**
 * 左侧项目信息 — 纯展示，不做导航
 * 配置变更后通过 props 实时更新显示
 */
import type { FontEntry } from "../types/layout";

interface ProjectSidebarProps {
  projectName?: string;
  author?: string;
  fonts: FontEntry[];
  textFileCount?: number;
  rowNum?: number;
  canvasId?: string;
}

export default function ProjectSidebar({
  projectName = "虞初新志",
  author = "",
  fonts = [],
  textFileCount = 0,
  rowNum = 0,
  canvasId = "",
}: ProjectSidebarProps) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-ink/70">项目</h3>

      {/* 项目信息 */}
      <div className="mb-4 rounded-lg border border-ink/10 bg-white/40 p-3 space-y-2">
        {/* 书名 + 作者 */}
        <div>
          <div className="text-sm font-semibold text-ink">{projectName}</div>
          {author && (
            <div className="mt-0.5 text-xs text-ink/40">作者: {author}</div>
          )}
        </div>

        <div className="border-t border-ink/10" />

        {/* 基本设置 */}
        <div className="space-y-1 text-xs text-ink/50">
          <div>画布: {canvasId || "未设置"}</div>
          <div>每列字数: {rowNum || "-"}</div>
          <div>文本文件: {textFileCount > 0 ? textFileCount : "未设置"}</div>
        </div>

        <div className="border-t border-ink/10" />

        {/* 字体列表 */}
        <div>
          <div className="text-xs font-semibold text-ink/60 mb-1">字体 ({fonts.length})</div>
          {fonts.length > 0 ? (
            <div className="space-y-1">
              {fonts.map((font, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-ink/50">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[9px] font-bold text-ink/50">
                    {i + 1}
                  </span>
                  <span className="truncate">{font.name || font.filename}</span>
                  <span className="shrink-0 text-ink/30">· {font.textPointSize}pt</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-ink/25">未加载字体</div>
          )}
        </div>
      </div>
    </div>
  );
}
