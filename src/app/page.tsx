"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSong, deleteSong, formatDuration, listSongs, saveSong } from "@/lib/storage";
import type { Song } from "@/lib/types";

export default function SongListPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[] | null>(null);

  useEffect(() => {
    setSongs(listSongs());
  }, []);

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
    <main className="mx-auto max-w-lg px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="mb-4 text-2xl font-bold">曲一覧</h1>

      {songs !== null && songs.length === 0 && (
        <p className="mt-16 text-center text-gray-400">
          まだ曲がありません。
          <br />
          下の「＋ 新しい曲」から追加しましょう。
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {songs?.map((song) => (
          <li key={song.id} className="flex items-stretch overflow-hidden rounded-xl bg-gray-800/70">
            <Link href={`/play/${song.id}`} className="flex min-h-16 flex-1 flex-col justify-center px-4 py-3 active:bg-white/5">
              <span className="text-lg font-bold">{song.title || "（無題）"}</span>
              <span className="text-xs text-gray-400">
                {song.duration > 0 ? formatDuration(song.duration) : "長さ未設定"}
                {song.capo > 0 && ` ・ Capo ${song.capo}`}
                {` ・ コード ${song.chords.length}`}
              </span>
            </Link>
            <Link href={`/edit/${song.id}`} className="flex w-16 items-center justify-center text-sm text-amber-400 active:bg-white/5">
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
      </div>
    </main>
  );
}
