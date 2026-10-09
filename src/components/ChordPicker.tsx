"use client";

import { useState } from "react";
import { QUALITIES, ROOTS, parseChord } from "@/lib/chords";
import ChordDiagram from "./ChordDiagram";

const STROKE_PRESETS = ["↓↓↑↑↓↑", "↓↑↓↑↓↑↓↑", "↓・↓↑・↑↓↑", "↓↓↓↓", "↓・↓・"];
const STROKE_KEYS = ["↓", "↑", "・", "×"];

type Props = {
  title: string;
  initialChord: string;
  initialStroke: string;
  /** この曲で使っているコード・ストローク（クイック選択用） */
  usedChords: string[];
  usedStrokes: string[];
  onSave: (chord: string, stroke: string) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export default function ChordPicker({
  title,
  initialChord,
  initialStroke,
  usedChords,
  usedStrokes,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState(initialChord);
  const [stroke, setStroke] = useState(initialStroke);
  const parsed = parseChord(name);
  const root = parsed?.root ?? "";
  const quality = parsed?.quality ?? null;

  const strokeOptions = Array.from(new Set([...usedStrokes, ...STROKE_PRESETS])).filter(Boolean);
  const trimmed = name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-gray-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center gap-2 bg-gray-900 px-4 pb-2 pt-4">
          <h2 className="text-base font-bold text-gray-200">{title}</h2>
          <button
            type="button"
            disabled={!trimmed}
            onClick={() => onSave(trimmed, stroke)}
            className="h-10 rounded-xl bg-amber-500 px-6 font-bold text-gray-900 active:bg-amber-400 disabled:opacity-40"
          >
            決定
          </button>
          <button type="button" onClick={onClose} className="ml-auto h-10 w-10 rounded-full text-xl text-gray-400 active:bg-white/10" aria-label="閉じる">
            ✕
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-400">コード名（手入力もできます）</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: Am, G7, Fmaj7, D/F#"
              autoCapitalize="off"
              autoCorrect="off"
              className="h-12 w-full rounded-lg bg-gray-800 px-3 text-2xl font-bold text-amber-400 outline-none ring-amber-500 focus:ring-2"
            />
            {usedChords.length > 0 && (
              <>
                <p className="mb-1 mt-3 text-xs text-gray-400">この曲のコード</p>
                <div className="flex flex-wrap gap-1.5">
                  {usedChords.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setName(c)}
                      className={`h-10 min-w-12 rounded-lg px-2 font-bold ${c === trimmed ? "bg-amber-500 text-gray-900" : "bg-gray-800 text-amber-300 active:bg-gray-700"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="shrink-0 rounded-lg bg-gray-800/60 p-1">
            {trimmed ? <ChordDiagram name={trimmed} size={96} /> : <div className="h-[120px] w-[96px]" />}
          </div>
        </div>

        <p className="mb-1 mt-4 text-xs text-gray-400">ルート</p>
        <div className="grid grid-cols-6 gap-1.5">
          {ROOTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setName(r + (quality ?? ""))}
              className={`h-11 rounded-lg text-lg font-bold ${r === root ? "bg-amber-500 text-gray-900" : "bg-gray-800 text-gray-100 active:bg-gray-700"}`}
            >
              {r}
            </button>
          ))}
        </div>

        <p className="mb-1 mt-3 text-xs text-gray-400">種類</p>
        <div className="grid grid-cols-4 gap-1.5">
          {QUALITIES.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setName((root || "C") + q.key)}
              className={`h-11 rounded-lg font-bold ${parsed && quality === q.key ? "bg-amber-500 text-gray-900" : "bg-gray-800 text-gray-100 active:bg-gray-700"}`}
            >
              {q.label}
            </button>
          ))}
        </div>

        <p className="mb-1 mt-4 text-xs text-gray-400">ストロークパターン</p>
        <div className="flex items-center gap-2">
          <div className="flex h-12 flex-1 items-center overflow-x-auto rounded-lg bg-gray-800 px-3 text-2xl tracking-wider text-sky-300">
            {stroke || <span className="text-base tracking-normal text-gray-500">なし</span>}
          </div>
          <button
            type="button"
            onClick={() => setStroke((s) => Array.from(s).slice(0, -1).join(""))}
            className="h-12 w-12 rounded-lg bg-gray-800 text-xl active:bg-gray-700"
            aria-label="1つ消す"
          >
            ⌫
          </button>
          <button type="button" onClick={() => setStroke("")} className="h-12 rounded-lg bg-gray-800 px-3 text-sm active:bg-gray-700">
            クリア
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {STROKE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStroke((s) => s + k)}
              className="h-12 rounded-lg bg-gray-800 text-2xl text-sky-300 active:bg-gray-700"
            >
              {k}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-gray-500">・= 空ピッキング（休み）　× = ブラッシング</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {strokeOptions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setStroke(p)}
              className={`h-9 rounded-full px-3 text-sm ${p === stroke ? "bg-sky-500 text-gray-900" : "bg-gray-800 text-sky-300 active:bg-gray-700"}`}
            >
              {p}
            </button>
          ))}
        </div>

        {onDelete && (
          <button type="button" onClick={onDelete} className="mt-5 h-12 w-full rounded-xl bg-red-500/15 font-bold text-red-400 active:bg-red-500/30">
            削除
          </button>
        )}
      </div>
    </div>
  );
}
