"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createSong, deleteSong, formatDuration, listSongs, reorderSongs, saveSong } from "@/lib/storage";
import type { Song } from "@/lib/types";

/** 長押しでドラッグ開始するまでの時間（ms） */
const LONG_PRESS_MS = 400;
/** 長押し中にこれ以上指が動いたらスクロールとみなす（px） */
const MOVE_TOLERANCE = 8;
/** 行と行のすき間（ul の gap-2 と合わせる） */
const ROW_GAP = 8;

type Drag = {
  from: number;
  to: number;
  dy: number;
};

export default function SongListPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const press = useRef<{
    timer: number | null;
    startX: number;
    startY: number;
    rects: { top: number; height: number }[];
    dragging: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    setSongs(listSongs());
  }, []);

  // ドラッグ中は画面がスクロールしないようにする（iOS Safari は passive: false が必要）
  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const onTouchMove = (e: TouchEvent) => {
      if (press.current?.dragging) e.preventDefault();
    };
    ul.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => ul.removeEventListener("touchmove", onTouchMove);
  }, []);

  const cancelPress = () => {
    if (press.current?.timer != null) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLLIElement>, index: number) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    cancelPress();
    const li = e.currentTarget;
    const pointerId = e.pointerId;
    const timer = window.setTimeout(() => {
      if (!press.current) return;
      press.current.timer = null;
      press.current.dragging = true;
      press.current.rects = rowRefs.current.map((el) => {
        const r = el?.getBoundingClientRect();
        return { top: r?.top ?? 0, height: r?.height ?? 0 };
      });
      try {
        li.setPointerCapture(pointerId);
      } catch {
        // すでに指が離れている場合など
      }
      navigator.vibrate?.(10);
      setDrag({ from: index, to: index, dy: 0 });
    }, LONG_PRESS_MS);
    press.current = { timer, startX: e.clientX, startY: e.clientY, rects: [], dragging: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > MOVE_TOLERANCE) cancelPress();
      return;
    }
    setDrag((d) => {
      if (!d) return d;
      const dy = e.clientY - p.startY;
      const self = p.rects[d.from];
      const center = self.top + self.height / 2 + dy;
      const mid = (i: number) => p.rects[i].top + p.rects[i].height / 2;
      let to = d.from;
      while (to < p.rects.length - 1 && center > mid(to + 1)) to++;
      while (to > 0 && center < mid(to - 1)) to--;
      return { ...d, to, dy };
    });
  };

  const handlePointerEnd = () => {
    const p = press.current;
    cancelPress();
    if (!p?.dragging || !drag || !songs) {
      setDrag(null);
      return;
    }
    // ドラッグ後に指を離したときのタップ（曲を開く）を無視する
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    if (drag.to !== drag.from) {
      const next = [...songs];
      const [moved] = next.splice(drag.from, 1);
      next.splice(drag.to, 0, moved);
      reorderSongs(next.map((s) => s.id));
      setSongs(next);
    }
    setDrag(null);
  };

  /** ドラッグ中の各行のずらし量 */
  const shiftFor = (i: number): number => {
    if (!drag) return 0;
    if (i === drag.from) return drag.dy;
    const h = (press.current?.rects[drag.from]?.height ?? 0) + ROW_GAP;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h;
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return h;
    return 0;
  };

  const handleNew = () => {
    const song = createSong();
    saveSong(song);
    router.push(`/edit/${song.id}`);
  };

  const handleDelete = (song: Song) => {
    if (!window.confirm(`「${song.title || "無題"}」を削除しますか？`)) return;
    deleteSong(song.id);
    setSongs(listSongs());
  };

  return (
    <main className="mx-auto max-w-lg px-4 pb-44 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="mb-4 text-2xl font-bold">曲一覧</h1>

      {songs !== null && songs.length === 0 && (
        <p className="mt-16 text-center text-gray-400">
          まだ曲がありません。
          <br />
          下の「＋ 新しい曲」から追加しましょう。
        </p>
      )}

      {songs !== null && songs.length > 1 && (
        <p className="-mt-2 mb-3 text-xs text-gray-500">長押しして動かすと並べ替えできます</p>
      )}

      <ul ref={listRef} className="flex flex-col gap-2">
        {songs?.map((song, i) => (
          <li
            key={song.id}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            onPointerDown={(e) => handlePointerDown(e, i)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onContextMenu={(e) => e.preventDefault()}
            onClickCapture={(e) => {
              if (suppressClick.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            style={{ transform: `translateY(${shiftFor(i)}px)${drag?.from === i ? " scale(1.03)" : ""}` }}
            className={`relative flex select-none items-stretch overflow-hidden rounded-xl bg-gray-800/70 [-webkit-touch-callout:none] ${
              drag?.from === i
                ? "z-10 bg-gray-700 shadow-2xl ring-2 ring-amber-500"
                : drag
                  ? "transition-transform duration-150"
                  : ""
            }`}
          >
            <Link href={`/play/${song.id}`} draggable={false} className="flex min-h-16 flex-1 flex-col justify-center px-4 py-3 active:bg-white/5">
              <span className="text-lg font-bold">{song.title || "（無題）"}</span>
              <span className="text-xs text-gray-400">
                {song.duration > 0 ? formatDuration(song.duration) : "長さ未設定"}
                {song.capo > 0 && ` ・ Capo ${song.capo}`}
                {` ・ コード ${song.chords.length}`}
              </span>
            </Link>
            <Link href={`/edit/${song.id}`} draggable={false} className="flex w-16 items-center justify-center text-sm text-amber-400 active:bg-white/5">
              編集
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(song)}
              className="w-14 text-sm text-gray-500 active:bg-white/5"
              aria-label="削除"
            >
              削除
            </button>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115] to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={handleNew}
          className="mx-auto block h-14 w-full max-w-lg rounded-2xl bg-amber-500 text-lg font-bold text-gray-900 active:bg-amber-400"
        >
          ＋ 新しい曲
        </button>
        <Link
          href="/detect"
          className="mx-auto mt-2 flex h-12 w-full max-w-lg items-center justify-center rounded-2xl bg-gray-800 text-base font-bold text-amber-400 ring-1 ring-amber-500/40 active:bg-gray-700"
        >
          🎤 コード判定
        </Link>
      </div>
    </main>
  );
}
