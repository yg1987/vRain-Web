/**
 * PunctuationPanel — 标点符号规则配置面板
 *
 * 控制：标点替换 / 删除 / 无标点模式 / 统一句号 / 不占位标点 / 旋转标点
 */
import { useCallback } from "react";
import type { BookConfig } from "../types/layout";

interface Props {
  bookConfig: BookConfig;
  onChange: (config: BookConfig) => void;
}

export default function PunctuationPanel({ bookConfig, onChange }: Props) {
  const update = useCallback(
    (patch: Partial<BookConfig>) => {
      onChange({ ...bookConfig, ...patch });
    },
    [bookConfig, onChange],
  );

  // 标点替换规则: 从对象数组转为管道分隔字符串用于编辑
  const replacementStr = bookConfig.punctuationReplacements
    .map((r) => `${r.from}|${r.to}`)
    .join("|");

  const handleReplacementChange = useCallback(
    (input: string) => {
      const parts = input.split("|");
      const rules: { from: string; to: string }[] = [];
      for (let i = 0; i < parts.length - 1; i += 2) {
        if (parts[i] && parts[i + 1] !== undefined) {
          rules.push({ from: parts[i], to: parts[i + 1] });
        }
      }
      update({ punctuationReplacements: rules });
    },
    [update],
  );

  return (
    <div className="config-panel">
      <h3 className="config-panel-title">🔤 标点符号规则</h3>

      {/* 标点替换 */}
      <div className="config-group">
        <label className="config-group-label">
          标点替换
          <span className="ml-1 text-[10px] text-ink/40">(from|to|from|to)</span>
        </label>
        <input
          className="config-input font-mono text-xs"
          placeholder={'例: ,|，|.|。|:|：'}
          value={replacementStr}
          onChange={(e) => handleReplacementChange(e.target.value)}
        />
        <p className="mt-1 text-[10px] text-ink/40">
          管道分隔的成对字符，半角→全角
        </p>
      </div>

      {/* 标点删除 */}
      <div className="config-group">
        <label className="config-group-label">
          标点删除
          <span className="ml-1 text-[10px] text-ink/40">(管道分隔)</span>
        </label>
        <input
          className="config-input font-mono text-xs"
          placeholder={'例: ．|－| '}
          value={bookConfig.punctuationDeletions}
          onChange={(e) => update({ punctuationDeletions: e.target.value })}
        />
      </div>

      {/* 无标点模式 */}
      <div className="config-group">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={bookConfig.noPunctuationMode}
            onChange={(e) => update({ noPunctuationMode: e.target.checked })}
            className="accent-vermilion h-4 w-4 cursor-pointer" />
          <label className="cursor-pointer text-sm font-medium text-ink/80"
            onClick={() => update({ noPunctuationMode: !bookConfig.noPunctuationMode })}>
            无标点模式
          </label>
        </div>
        {bookConfig.noPunctuationMode && (
          <div className="mt-2">
            <input className="config-input font-mono text-xs"
              placeholder="要删除的标点字符"
              value={bookConfig.noPositionPunctuation}
              onChange={(e) => update({ noPositionPunctuation: e.target.value })} />
          </div>
        )}
      </div>

      {/* 统一句号模式 */}
      <div className="config-group">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={bookConfig.onlyPeriodMode}
            onChange={(e) => update({ onlyPeriodMode: e.target.checked })}
            className="accent-vermilion h-4 w-4 cursor-pointer" />
          <label className="cursor-pointer text-sm font-medium text-ink/80"
            onClick={() => update({ onlyPeriodMode: !bookConfig.onlyPeriodMode })}>
            统一句号模式
          </label>
        </div>
        {bookConfig.onlyPeriodMode && (
          <div className="mt-2">
            <input className="config-input font-mono text-xs"
              placeholder="要转为句号的标点"
              value={bookConfig.noPositionPunctuation}
              onChange={(e) => update({ noPositionPunctuation: e.target.value })} />
          </div>
        )}
      </div>

      <div className="my-3 border-t border-ink/10" />

      {/* 正文标点精细控制 */}
      <h4 className="mb-2 text-xs font-semibold text-ink/70">正文标点精细控制</h4>

      {/* 不占位标点 */}
      <div className="config-group">
        <label className="config-group-label">不占位标点 (text_comma_nop)</label>
        <input className="config-input font-mono text-xs" value={bookConfig.noPositionPunctuation}
          onChange={(e) => update({ noPositionPunctuation: e.target.value })} />
        <div className="mt-1 grid grid-cols-3 gap-2">
          <MiniInput label="缩放" value={bookConfig.noPositionPunctuationSize} step={0.05}
            onChange={(v) => update({ noPositionPunctuationSize: v })} />
          <MiniInput label="偏移 X" value={bookConfig.noPositionPunctuationOffset.x} step={0.05}
            onChange={(v) => update({ noPositionPunctuationOffset: { ...bookConfig.noPositionPunctuationOffset, x: v } })} />
          <MiniInput label="偏移 Y" value={bookConfig.noPositionPunctuationOffset.y} step={0.05}
            onChange={(v) => update({ noPositionPunctuationOffset: { ...bookConfig.noPositionPunctuationOffset, y: v } })} />
        </div>
      </div>

      {/* 旋转标点 */}
      <div className="config-group">
        <label className="config-group-label">旋转标点 (text_comma_90)</label>
        <input className="config-input font-mono text-xs" value={bookConfig.rotatedPunctuation}
          onChange={(e) => update({ rotatedPunctuation: e.target.value })} />
        <div className="mt-1 grid grid-cols-3 gap-2">
          <MiniInput label="缩放" value={bookConfig.rotatedPunctuationSize} step={0.05}
            onChange={(v) => update({ rotatedPunctuationSize: v })} />
          <MiniInput label="偏移 X" value={bookConfig.rotatedPunctuationOffset.x} step={0.05}
            onChange={(v) => update({ rotatedPunctuationOffset: { ...bookConfig.rotatedPunctuationOffset, x: v } })} />
          <MiniInput label="偏移 Y" value={bookConfig.rotatedPunctuationOffset.y} step={0.05}
            onChange={(v) => update({ rotatedPunctuationOffset: { ...bookConfig.rotatedPunctuationOffset, y: v } })} />
        </div>
      </div>

      <div className="my-3 border-t border-ink/10" />

      {/* 批注标点 */}
      <h4 className="mb-2 text-xs font-semibold text-ink/70">批注标点独立配置</h4>

      <div className="config-group">
        <label className="config-group-label">不占位标点 (comment_comma_nop)</label>
        <input className="config-input font-mono text-xs" value={bookConfig.commentNoPositionPunctuation}
          onChange={(e) => update({ commentNoPositionPunctuation: e.target.value })} />
      </div>

      <div className="config-group">
        <label className="config-group-label">旋转标点 (comment_comma_90)</label>
        <input className="config-input font-mono text-xs" value={bookConfig.commentRotatedPunctuation}
          onChange={(e) => update({ commentRotatedPunctuation: e.target.value })} />
      </div>
    </div>
  );
}

// ============================================================================
// 辅助
// ============================================================================

function MiniInput({ label, value, step = 1, onChange }: {
  label: string; value: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="block text-[10px] text-ink/40">{label}</span>
      <input type="number" step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded border border-ink/10 px-1.5 py-0.5 text-xs" />
    </div>
  );
}
