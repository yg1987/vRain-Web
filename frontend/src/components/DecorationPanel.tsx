/**
 * DecorationPanel — 装饰标记配置面板
 *
 * 控制 7 种装饰标记的开关和参数：
 *   书名号线 / 圆角框 / 圆圈 / 字体放大 / 圈注 / 顿点注 / 行注
 */
import { useCallback } from "react";
import type { BookConfig } from "../types/layout";

interface Props {
  bookConfig: BookConfig;
  onChange: (config: BookConfig) => void;
}

export default function DecorationPanel({ bookConfig, onChange }: Props) {
  const update = useCallback(
    (patch: Partial<BookConfig["decorativeMarks"]>) => {
      onChange({
        ...bookConfig,
        decorativeMarks: { ...bookConfig.decorativeMarks, ...patch },
      });
    },
    [bookConfig, onChange],
  );

  const marks = bookConfig.decorativeMarks;

  return (
    <div className="config-panel">
      <h3 className="config-panel-title">🎭 装饰标记</h3>
      <p className="mb-3 text-xs text-ink/50">
        控制文本中《》〔〕〈〉（）｛｝＜＞［］标记的渲染效果
      </p>

      {/* 书名号线 */}
      <div className="config-group">
        <ToggleRow
          label="书名号线 《》"
          checked={marks.bookLine.enabled}
          onChange={(v) => update({ bookLine: { ...marks.bookLine, enabled: v } })}
        />
        {marks.bookLine.enabled && (
          <div className="mt-2 ml-6 space-y-2">
            <NumberSlider label="线宽" value={marks.bookLine.width} min={1} max={10}
              onChange={(v) => update({ bookLine: { ...marks.bookLine, width: v } })} />
            <ColorInput label="颜色" value={marks.bookLine.color}
              onChange={(v) => update({ bookLine: { ...marks.bookLine, color: v } })} />
          </div>
        )}
      </div>

      {/* 圆角框 */}
      <div className="config-group">
        <ToggleRow
          label="圆角框 〔〕"
          checked={marks.rectFrame.enabled}
          onChange={(v) => update({ rectFrame: { ...marks.rectFrame, enabled: v } })}
        />
        {marks.rectFrame.enabled && (
          <div className="mt-2 ml-6 space-y-2">
            <SelectRow label="边框类型" value={String(marks.rectFrame.borderType)}
              options={[["0", "双层"], ["1", "单层"]]}
              onChange={(v) => update({ rectFrame: { ...marks.rectFrame, borderType: Number(v) as 0 | 1 } })} />
            <ColorInput label="边框色" value={marks.rectFrame.borderColor}
              onChange={(v) => update({ rectFrame: { ...marks.rectFrame, borderColor: v } })} />
          </div>
        )}
      </div>

      {/* 圆圈 */}
      <div className="config-group">
        <ToggleRow
          label="圆圈 〈〉"
          checked={marks.circleFrame.enabled}
          onChange={(v) => update({ circleFrame: { ...marks.circleFrame, enabled: v } })}
        />
        {marks.circleFrame.enabled && (
          <div className="mt-2 ml-6 space-y-2">
            <SelectRow label="边框类型" value={String(marks.circleFrame.borderType)}
              options={[["0", "双层"], ["1", "单层"]]}
              onChange={(v) => update({ circleFrame: { ...marks.circleFrame, borderType: Number(v) as 0 | 1 } })} />
            <ColorInput label="边框色" value={marks.circleFrame.borderColor}
              onChange={(v) => update({ circleFrame: { ...marks.circleFrame, borderColor: v } })} />
          </div>
        )}
      </div>

      {/* 字体放大 */}
      <div className="config-group">
        <ToggleRow
          label="字体放大 （）"
          checked={marks.textZoom.enabled}
          onChange={(v) => update({ textZoom: { ...marks.textZoom, enabled: v } })}
        />
        {marks.textZoom.enabled && (
          <div className="mt-2 ml-6">
            <NumberSlider label="放大倍数" value={marks.textZoom.zoomFactor}
              min={1.0} max={2.0} step={0.05}
              onChange={(v) => update({ textZoom: { ...marks.textZoom, zoomFactor: v } })} />
          </div>
        )}
      </div>

      {/* 圈注 */}
      <div className="config-group">
        <ToggleRow
          label="圈注 ｛｝"
          checked={marks.circleNote.enabled}
          onChange={(v) => update({ circleNote: { ...marks.circleNote, enabled: v } })}
        />
        {marks.circleNote.enabled && (
          <div className="mt-2 ml-6 space-y-2">
            <NumberSlider label="线宽" value={marks.circleNote.width} min={1} max={15}
              onChange={(v) => update({ circleNote: { ...marks.circleNote, width: v } })} />
            <ColorInput label="颜色" value={marks.circleNote.color}
              onChange={(v) => update({ circleNote: { ...marks.circleNote, color: v } })} />
          </div>
        )}
      </div>

      {/* 顿点注 */}
      <div className="config-group">
        <ToggleRow
          label="顿点注 ＜＞"
          checked={marks.pointNote.enabled}
          onChange={(v) => update({ pointNote: { ...marks.pointNote, enabled: v } })}
        />
        {marks.pointNote.enabled && (
          <div className="mt-2 ml-6 space-y-2">
            <NumberSlider label="大小" value={marks.pointNote.size} min={0.5} max={2.0} step={0.1}
              onChange={(v) => update({ pointNote: { ...marks.pointNote, size: v } })} />
            <ColorInput label="颜色" value={marks.pointNote.color}
              onChange={(v) => update({ pointNote: { ...marks.pointNote, color: v } })} />
          </div>
        )}
      </div>

      {/* 行注 */}
      <div className="config-group">
        <ToggleRow
          label="行注 ［］"
          checked={marks.lineNote.enabled}
          onChange={(v) => update({ lineNote: { ...marks.lineNote, enabled: v } })}
        />
        {marks.lineNote.enabled && (
          <div className="mt-2 ml-6 space-y-2">
            <NumberSlider label="线宽" value={marks.lineNote.width} min={1} max={15}
              onChange={(v) => update({ lineNote: { ...marks.lineNote, width: v } })} />
            <ColorInput label="颜色" value={marks.lineNote.color}
              onChange={(v) => update({ lineNote: { ...marks.lineNote, color: v } })} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 辅助小组件
// ============================================================================

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="accent-vermilion h-4 w-4 cursor-pointer" />
      <span className="font-medium text-ink/80">{label}</span>
    </label>
  );
}

function NumberSlider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-ink/60">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-vermilion h-1.5 cursor-pointer" />
      <span className="w-8 text-right text-xs text-ink/50">{value}</span>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-ink/60">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-6 w-10 cursor-pointer rounded border border-ink/20" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-ink/10 px-2 py-0.5 text-xs" />
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-ink/60">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-ink/10 px-2 py-0.5 text-xs">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
