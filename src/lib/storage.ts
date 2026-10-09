import type { Song } from "./types";

const KEY = "guitar-chord-app:songs";

function readAll(): Song[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Song[]) : [];
  } catch {
    return [];
  }
}

function writeAll(songs: Song[]) {
  window.localStorage.setItem(KEY, JSON.stringify(songs));
}

export function listSongs(): Song[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSong(id: string): Song | undefined {
  return readAll().find((s) => s.id === id);
}

export function saveSong(song: Song) {
  const songs = readAll();
  const next = { ...song, updatedAt: Date.now() };
  const i = songs.findIndex((s) => s.id === song.id);
  if (i >= 0) songs[i] = next;
  else songs.push(next);
  writeAll(songs);
}

export function deleteSong(id: string) {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function createSong(): Song {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    title: "",
    lyrics: "",
    duration: 0,
    capo: 0,
    chords: [],
    updatedAt: Date.now(),
  };
}

/** "3:45"（"3.45" "3 45" も可）→ 225。不正な値は null */
export function parseDuration(text: string): number | null {
  const m = text.trim().match(/^(\d{1,3})\s*[:：.\s]\s*([0-5]?\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 歌詞を編集したあと、範囲外になったコードを取り除く */
export function pruneChords(song: Song): Song {
  const lines = song.lyrics.split("\n");
  return {
    ...song,
    chords: song.chords.filter((c) => {
      const line = lines[c.line];
      return line !== undefined && c.index < Math.max(1, Array.from(line).length);
    }),
  };
}
