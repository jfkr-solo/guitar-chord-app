"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import DiagramPopup from "@/components/DiagramPopup";
import LyricsSheet from "@/components/LyricsSheet";
import { formatDuration, getSong } from "@/lib/storage";
import type { PlacedChord, Song } from "@/lib/types";
import { useAutoScroll } from "@/lib/useAutoScroll";

const FONT_KEY = "guitar-chord-app:play-font-size";
const FONT_MIN = 18;
const FONT_MAX = 40;

export default function PlayPage() {
  const { id } = useParams<{ id: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showStroke, setShowStroke] = useState(true);
  const [fontSize, setFontSize] = useState(26);
  const [popup, setPopup] = useState<PlacedChord | null>(null);
  const { playing, elapsed, play, pause, reset } = useAutoScroll(song?.duration ?? 0);

  useEffect(() => {
    const s = getSong(id);
    if (s) setSong(s);
    else setNotFound(true);
    try {
      const saved = Number(window.localStorage.getItem(FONT_KEY));
      if (saved >= FONT_MIN && saved <= FONT_MAX) setFontSize(saved);
    } catch {}
    window.scrollTo(0, 0);
  }, [id]);

  const changeFont = (delta: number) => {
    const next = Math.min(FONT_MAX, Math.max(FONT_MIN, fontSize + delta));
    setFontSize(next);
    try {
      window.localStorage.setItem(FONT_KEY, String(next));
    } catch {}
  };

  if (notFound) {
    return (
      <main className="p-6 text-center">
        <p className="mb-4 text-gray-400">曲が見つかりません。</p>
        <Link href="/" className="text-amber-400">曲一覧へ戻る</Link>
      </main>
    );
  }
  if (!song) return null;

  const canPlay = song.duration > 0;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl">
      {/* 上部: タイトルとカポを常に表示 */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0f1115]/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-2">
          <Link
            href="/"
            onClick={pause}
            className="flex h-11 items-center rounded-lg px-3 text-amber-400 active:bg-white/10"
          >
            ‹
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{song.title || "（無題）"}</h1>
          <span className="shrink-0 rounded-md bg-amber-500 px-2.5 py-1 text-sm font-bold text-gray-900">
            Capo {song.capo}
          </span>
          <Link
            href={`/edit/${song.id}`}
            onClick={pause}
            className="flex h-11 items-center rounded-lg px-3 text-sm text-gray-400 active:bg-white/10"
          >
            編集
          </Link>
        </div>
      </header>

      <div className="px-4 pb-32 pt-4">
        {song.lyrics.trim() === "" ? (
          <p className="mt-10 text-center text-gray-400">歌詞がありません。「編集」から入力してください。</p>
        ) : (
          <LyricsSheet
            lyrics={song.lyrics}
            chords={song.chords}
            showStroke={showStroke}
            fontSize={fontSize}
            onChordTap={setPopup}
          />
        )}
      </div>

      {/* 下部: 再生操作（親指で届く位置） */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0f1115]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex h-20 max-w-3xl items-center gap-2 px-3">
          <button
            type="button"
            onClick={reset}
            className="h-14 w-14 shrink-0 rounded-full bg-gray-800 text-xl active:bg-gray-700"
            aria-label="最初に戻る"
          >
            ⏮
          </button>
          <button
            type="button"
            disabled={!canPlay}
            onClick={playing ? pause : play}
            className="h-16 w-16 shrink-0 rounded-full bg-amber-500 text-2xl text-gray-900 active:bg-amber-400 disabled:opacity-40"
            aria-label={playing ? "一時停止" : "再生"}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <div className="min-w-0 flex-1 text-center text-sm tabular-nums text-gray-300">
            {canPlay ? (
              <>
                {formatDuration(elapsed)} / {formatDuration(song.duration)}
              </>
            ) : (
              <span className="text-xs text-gray-500">曲の長さを設定すると再生できます</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowStroke((v) => !v)}
            className={`h-12 shrink-0 rounded-xl px-2 text-xs leading-tight ${showStroke ? "bg-sky-500/20 text-sky-300" : "bg-gray-800 text-gray-400"}`}
          >
            ストローク
            <br />
            {showStroke ? "表示" : "非表示"}
          </button>
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" onClick={() => changeFont(2)} className="h-8 w-10 rounded-md bg-gray-800 text-sm active:bg-gray-700" aria-label="文字を大きく">
              A+
            </button>
            <button type="button" onClick={() => changeFont(-2)} className="h-8 w-10 rounded-md bg-gray-800 text-xs active:bg-gray-700" aria-label="文字を小さく">
              A−
            </button>
          </div>
        </div>
      </div>

      {popup && <DiagramPopup chord={popup} onClose={() => setPopup(null)} />}
    </main>
  );
}
