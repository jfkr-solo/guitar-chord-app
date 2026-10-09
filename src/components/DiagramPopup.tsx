"use client";

import ChordDiagram from "./ChordDiagram";
import type { PlacedChord } from "@/lib/types";

type Props = { chord: PlacedChord; onClose: () => void };

/**
 * コードの押さえ方ポップアップ。
 * 画面のどこを触っても閉じる（自動スクロールはそのまま続く）。
 */
export default function DiagramPopup({ chord, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div className="flex flex-col items-center rounded-2xl bg-gray-900/95 px-6 pb-4 pt-3 shadow-2xl ring-1 ring-white/10">
        <p className="text-3xl font-bold text-amber-400">{chord.chord}</p>
        <ChordDiagram name={chord.chord} size={200} />
        {chord.stroke && <p className="mt-1 text-xl tracking-wider text-sky-300">{chord.stroke}</p>}
      </div>
    </div>
  );
}
