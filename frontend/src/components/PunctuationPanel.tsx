/**
 * PunctuationPanel — 标点符号规则配置面板
 *
 * 控制：标点替换 / 删除 / 无标点模式 / 统一句号 / 不占位标点 / 旋转标点
 */
import { useCallback, useState, useEffect, useRef } from "react";
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

  // 标点替换规则: 用本地状态暂存原始输入，失焦时解析保存
  // 避免每次按键都解析导致未成对的输入被清空
  const rulesToStr = (rules: { from: string; to: string }[]) =>
    rules.map((r) => `${r.from}|${r.to}`).join("|");

  const [localReplacement, setLocalReplacement] = useState(() =>
    rulesToStr(bookConfig.punctuationReplacements),
  );
  const dirtyRef = useRef(false);

  // 外部 props 变更时同步（仅在用户未编辑时）
  useEffect(() => {
    if (!dirtyRef.current) {
      setLocalReplacement(rulesToStr(bookConfig.punctuationReplacements));
    }
  }, [bookConfig.punctuationReplacements]);

  const handleReplacementBlur = useCallback(() => {
    dirtyRef.current = false;
    const input = localReplacement;
    const parts = input.split("|");
    const rules: { from: string; to: string }[] = [];
    for (let i = 0; i < parts.length - 1; i += 2) {
      if (parts[i] && parts[i + 1] !== undefined) {
        rules.push({ from: parts[i], to: parts[i + 1] });
      }
    }
    update({ punctuationReplacements: rules });
  }, [localReplacement, update]);

  return (
    <div className="config-panel">
      <h3 className="config-panel-title">🔤 标点符号规则</h3>

      {/* 标点替换 */}
      <div className="config-group">
        <label className="config-group-label">
          标点替换
          <span className="ml-1 text-[10px] text-ink/65">(from|to|from|to)</span>
        </label>
        <input
          className="config-input font-mono text-xs"
          placeholder={'例: ,|，|.|。|:|：'}
          value={localReplacement}
          onChange={(e) => { dirtyRef.current = true; setLocalReplacement(e.target.value); }}
          onBlur={handleReplacementBlur}
        />
        <p className="mt-1 text-[10px] text-ink/65">
          管道分隔的成对字符，半角→全角
        </p>
      </div>

      {/* 标点删除 */}
      <div className="config-group">
        <label className="config-group-label">
          标点删除
          <span className="ml-1 text-[10px] text-ink/65">(管道分隔)</span>
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
          <label className="cursor-pointer text-sm font-medium text-ink/95"
            onClick={() => update({ noPunctuationMode: !bookConfig.noPunctuationMode })}>
            无标点模式
          </label>
        </div>
        {bookConfig.noPunctuationMode && (
          <div className="mt-2">
            <input className="config-input font-mono text-xs"
              placeholder="例: ，|。|；|：（管道分隔要删除的标点）"
              value={bookConfig.noPunctuationList}
              onChange={(e) => update({ noPunctuationList: e.target.value })} />
          </div>
        )}
      </div>

      {/* 统一句号模式 */}
      <div className="config-group">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={bookConfig.onlyPeriodMode}
            onChange={(e) => update({ onlyPeriodMode: e.target.checked })}
            className="accent-vermilion h-4 w-4 cursor-pointer" />
          <label className="cursor-pointer text-sm font-medium text-ink/95"
            onClick={() => update({ onlyPeriodMode: !bookConfig.onlyPeriodMode })}>
            统一句号模式
          </label>
        </div>
        {bookConfig.onlyPeriodMode && (
          <div className="mt-2">
            <input className="config-input font-mono text-xs"
              placeholder="例: ，|。|；|：（管道分隔要转为句号的标点）"
              value={bookConfig.onlyPeriodList}
              onChange={(e) => update({ onlyPeriodList: e.target.value })} />
          </div>
        )}
      </div>

      <div className="my-3 border-t border-ink/10" />

      {/* 正文标点精细控制 */}
      <h4 className="mb-2 text-xs font-semibold text-ink/90">正文标点精细控制</h4>

      {/* 不占位标点 */}
      <div className="config-group">
        <label className="config-group-label">不占位标点 (text_comma_nop)</label>
        <input className="config-input font-mono text-xs"
          placeholder="例: ·|～|…|—"
          value={bookConfig.noPositionPunctuation}
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
        <input className="config-input font-mono text-xs"
          placeholder="例: 「|」|『|』"
          value={bookConfig.rotatedPunctuation}
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
      <h4 className="mb-2 text-xs font-semibold text-ink/90">批注标点独立配置</h4>

      <div className="config-group">
        <label className="config-group-label">不占位标点 (comment_comma_nop)</label>
        <input className="config-input font-mono text-xs"
          placeholder="例: ·|～"
          value={bookConfig.commentNoPositionPunctuation}
          onChange={(e) => update({ commentNoPositionPunctuation: e.target.value })} />
      </div>

      <div className="config-group">
        <label className="config-group-label">旋转标点 (comment_comma_90)</label>
        <input className="config-input font-mono text-xs"
          placeholder="例: 「|」"
          value={bookConfig.commentRotatedPunctuation}
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
      <span className="block text-[10px] text-ink/65">{label}</span>
      <input type="number" step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded border border-ink/10 px-1.5 py-0.5 text-xs" />
    </div>
  );
}
