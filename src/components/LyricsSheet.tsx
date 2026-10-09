"use client";

import type { PlacedChord } from "@/lib/types";

/** コード付きの文字は、次のコードまで最大この文字数をひとかたまりにする */
const MAX_GROUP = 4;

type Props = {
  lyrics: string;
  chords: PlacedChord[];
  showStroke: boolean;
  fontSize: number;
  /** 編集画面: 選択中の文字 */
  selected?: { line: number; index: number } | null;
  onCharTap?: (line: number, index: number) => void;
  onChordTap?: (chord: PlacedChord) => void;
  /** 空行も含めてタップできるようにする（編集画面用） */
  editable?: boolean;
};

type Segment = { start: number; chars: string[]; chord?: PlacedChord };

function buildSegments(chars: string[], chordsInLine: Map<number, PlacedChord>): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  while (i < chars.length) {
    const chord = chordsInLine.get(i);
    if (!chord) {
      segments.push({ start: i, chars: [chars[i]] });
      i += 1;
      continue;
    }
    let end = i + 1;
    while (end < chars.length && end - i < MAX_GROUP && !chordsInLine.has(end)) end += 1;
    segments.push({ start: i, chars: chars.slice(i, end), chord });
    i = end;
  }
  return segments;
}

export default function LyricsSheet({
  lyrics,
  chords,
  showStroke,
  fontSize,
  selected,
  onCharTap,
  onChordTap,
  editable = false,
}: Props) {
  const lines = lyrics.split("\n");

  return (
    <div style={{ fontSize }} className="select-none">
      {lines.map((line, lineIdx) => {
        const chordsInLine = new Map(
          chords.filter((c) => c.line === lineIdx).map((c) => [c.index, c] as const),
        );
        const chars = Array.from(line);
        const isEmpty = chars.length === 0;

        if (isEmpty && !editable && chordsInLine.size === 0) {
          return <div key={lineIdx} style={{ height: "1em" }} />;
        }

        // 空行は1マスだけ用意して、前奏などのコードを置けるようにする
        const segments = buildSegments(isEmpty ? [" "] : chars, chordsInLine);
        // コードのない行は、コード・ストローク用の段を省いて詰める
        const hasChords = chordsInLine.size > 0;

        return (
          <div key={lineIdx} className="flex flex-wrap items-start" style={{ marginBottom: hasChords ? "0.35em" : "0.6em" }}>
            {segments.map((seg) => (
              <span key={seg.start} className="inline-flex flex-col items-start">
                <span className="flex" style={{ lineHeight: 1.35 }}>
                  {seg.chars.map((ch, k) => {
                    const index = seg.start + k;
                    const isSelected = selected?.line === lineIdx && selected.index === index;
                    return (
                      <span
                        key={index}
                        onClick={onCharTap ? () => onCharTap(lineIdx, index) : undefined}
                        className={[
                          "whitespace-pre rounded-sm",
                          onCharTap ? "cursor-pointer active:bg-white/20" : "",
                          isSelected ? "bg-amber-500/40" : "",
                          isEmpty ? "text-gray-600" : "",
                        ].join(" ")}
                      >
                        {isEmpty ? "·" : ch === " " ? " " : ch}
                      </span>
                    );
                  })}
                </span>
                {hasChords && (
                  <span className="flex items-center" style={{ height: "1.3em", fontSize: "0.8em" }}>
                    {seg.chord && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChordTap?.(seg.chord!);
                        }}
                        className="-ml-[0.15em] whitespace-nowrap rounded px-[0.15em] font-bold leading-none text-amber-400 active:bg-amber-400/25"
                        style={{ paddingRight: "0.45em" }}
                      >
                        {seg.chord.chord}
                      </button>
                    )}
                  </span>
                )}
                {hasChords && showStroke && (
                  <span
                    className="whitespace-nowrap leading-none tracking-tight text-sky-300"
                    style={{ height: "1.3em", fontSize: "0.62em", paddingRight: seg.chord ? "0.5em" : 0 }}
                  >
                    {seg.chord?.stroke ?? ""}
                  </span>
                )}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
