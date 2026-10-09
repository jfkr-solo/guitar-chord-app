"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ChordPicker from "@/components/ChordPicker";
import LyricsSheet from "@/components/LyricsSheet";
import { formatDuration, getSong, parseDuration, pruneChords, saveSong } from "@/lib/storage";
import type { Song } from "@/lib/types";

type Tab = "info" | "chords";

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [durationText, setDurationText] = useState("");
  const [showStroke, setShowStroke] = useState(true);
  const [picking, setPicking] = useState<{ line: number; index: number } | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const s = getSong(id);
    if (!s) {
      setNotFound(true);
      return;
    }
    setSong(s);
    setDurationText(s.duration > 0 ? formatDuration(s.duration) : "");
    if (s.lyrics.trim()) setTab("chords");
  }, [id]);

  // 変更のたびに自動保存
  useEffect(() => {
    if (!song) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    saveSong(song);
  }, [song]);

  const usedChords = useMemo(
    () => Array.from(new Set(song?.chords.map((c) => c.chord) ?? [])),
    [song?.chords],
  );
  const usedStrokes = useMemo(
    () => Array.from(new Set(song?.chords.map((c) => c.stroke).filter(Boolean) ?? [])),
    [song?.chords],
  );

  if (notFound) {
    return (
      <main className="p-6 text-center">
        <p className="mb-4 text-gray-400">曲が見つかりません。</p>
        <Link href="/" className="text-amber-400">曲一覧へ戻る</Link>
      </main>
    );
  }
  if (!song) return null;

  const update = (patch: Partial<Song>) => setSong((s) => (s ? { ...s, ...patch } : s));
  const durationValid = durationText.trim() === "" || parseDuration(durationText) !== null;
  const current = picking ? song.chords.find((c) => c.line === picking.line && c.index === picking.index) : undefined;

  const switchTab = (next: Tab) => {
    if (next === "chords") setSong((s) => (s ? pruneChords(s) : s));
    setTab(next);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-2xl pb-16">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0f1115]/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-2">
          <Link href="/" className="flex h-11 items-center rounded-lg px-3 text-amber-400 active:bg-white/10">
            ‹ 一覧
          </Link>
          <p className="flex-1 truncate text-center font-bold">{song.title || "（無題）"}</p>
          <Link
            href={`/play/${song.id}`}
            className="flex h-11 items-center rounded-lg bg-amber-500 px-4 font-bold text-gray-900 active:bg-amber-400"
          >
            ▶ 演奏
          </Link>
        </div>
        <div className="grid grid-cols-2 px-2 pb-2">
          {(
            [
              ["info", "歌詞・情報"],
              ["chords", "コード配置"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={`h-10 rounded-lg text-sm font-bold ${tab === key ? "bg-gray-700 text-white" : "text-gray-400"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "info" ? (
        <div className="flex flex-col gap-5 px-4 pt-4">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">タイトル</span>
            <input
              value={song.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="曲のタイトル"
              className="h-12 w-full rounded-lg bg-gray-800 px-3 text-lg outline-none ring-amber-500 focus:ring-2"
            />
          </label>

          <div className="flex gap-4">
            <label className="block flex-1">
              <span className="mb-1 block text-sm text-gray-400">曲の長さ（分:秒）</span>
              <input
                value={durationText}
                inputMode="decimal"
                onChange={(e) => {
                  setDurationText(e.target.value);
                  const sec = parseDuration(e.target.value);
                  if (sec !== null) update({ duration: sec });
                  else if (e.target.value.trim() === "") update({ duration: 0 });
                }}
                placeholder="3:45"
                className={`h-12 w-full rounded-lg bg-gray-800 px-3 text-lg outline-none focus:ring-2 ${durationValid ? "ring-amber-500" : "ring-2 ring-red-500"}`}
              />
              {!durationValid && <span className="mt-1 block text-xs text-red-400">例: 3:45（3.45 でもOK）</span>}
            </label>

            <div>
              <span className="mb-1 block text-sm text-gray-400">カポ</span>
              <div className="flex h-12 items-center overflow-hidden rounded-lg bg-gray-800">
                <button
                  type="button"
                  onClick={() => update({ capo: Math.max(0, song.capo - 1) })}
                  className="h-12 w-12 text-2xl active:bg-white/10"
                  aria-label="カポを下げる"
                >
                  −
                </button>
                <span className="w-8 text-center text-lg font-bold">{song.capo}</span>
                <button
                  type="button"
                  onClick={() => update({ capo: Math.min(12, song.capo + 1) })}
                  className="h-12 w-12 text-2xl active:bg-white/10"
                  aria-label="カポを上げる"
                >
                  ＋
                </button>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-400">歌詞（改行で行を分けます）</span>
            <textarea
              value={song.lyrics}
              onChange={(e) => update({ lyrics: e.target.value })}
              placeholder={"歌詞を入力\n1行ずつ改行してください"}
              rows={16}
              className="w-full rounded-lg bg-gray-800 p-3 text-base leading-relaxed outline-none ring-amber-500 focus:ring-2"
            />
          </label>

          <button
            type="button"
            onClick={() => switchTab("chords")}
            className="h-12 rounded-xl bg-gray-700 font-bold active:bg-gray-600"
          >
            コード配置へ ›
          </button>
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">歌詞の文字をタップしてコードを置きます</p>
            <button
              type="button"
              onClick={() => setShowStroke((v) => !v)}
              className="h-9 shrink-0 rounded-full bg-gray-800 px-3 text-xs text-sky-300 active:bg-gray-700"
            >
              ストローク{showStroke ? "非表示" : "表示"}
            </button>
          </div>
          {song.lyrics.trim() === "" ? (
            <p className="mt-10 text-center text-gray-400">先に「歌詞・情報」で歌詞を入力してください。</p>
          ) : (
            <LyricsSheet
              lyrics={song.lyrics}
              chords={song.chords}
              showStroke={showStroke}
              fontSize={22}
              selected={picking}
              editable
              onCharTap={(line, index) => setPicking({ line, index })}
              onChordTap={(c) => setPicking({ line: c.line, index: c.index })}
            />
          )}
        </div>
      )}

      {picking && (
        <ChordPicker
          key={`${picking.line}-${picking.index}`}
          title={current ? "コードを変更" : "コードを追加"}
          initialChord={current?.chord ?? ""}
          initialStroke={current?.stroke ?? ""}
          usedChords={usedChords}
          usedStrokes={usedStrokes}
          onClose={() => setPicking(null)}
          onDelete={
            current
              ? () => {
                  update({ chords: song.chords.filter((c) => c !== current) });
                  setPicking(null);
                }
              : undefined
          }
          onSave={(chord, stroke) => {
            const others = song.chords.filter((c) => !(c.line === picking.line && c.index === picking.index));
            update({ chords: [...others, { line: picking.line, index: picking.index, chord, stroke }] });
            setPicking(null);
          }}
        />
      )}
    </main>
  );
}
