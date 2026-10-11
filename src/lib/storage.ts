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

/** 並び順の値。未設定（並べ替え前の曲）は更新日時が新しいほど上 */
function sortKey(song: Song): number {
  return song.order ?? -song.updatedAt;
}

export function listSongs(): Song[] {
  return readAll().sort((a, b) => sortKey(a) - sortKey(b));
}

/** 曲一覧の並び順を保存する（ids は上から順） */
export function reorderSongs(ids: string[]) {
  const rank = new Map(ids.map((id, i) => [id, i]));
  writeAll(readAll().map((s) => (rank.has(s.id) ? { ...s, order: rank.get(s.id) } : s)));
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
    // 新しい曲は一覧の一番上に出す
    order: -Date.now(),
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

const EXPORT_FORMAT = "guitar-chord-app/songs";

/** 全曲を共有用の JSON 文字列にする */
export function exportSongs(): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: Date.now(), songs: listSongs() }, null, 2);
}

function isSong(v: unknown): v is Song {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.lyrics === "string" &&
    Array.isArray(s.chords) &&
    typeof s.updatedAt === "number"
  );
}

/**
 * 書き出したファイルの中身を取り込む。
 * 同じ曲（同じ id）がすでにあるときは、更新日時が新しいほうを残す。
 * 読めないファイルなら null を返す。
 */
export function importSongs(text: string): { added: number; updated: number; skipped: number } | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const list = Array.isArray(data) ? data : (data as { songs?: unknown })?.songs;
  if (!Array.isArray(list)) return null;
  const incoming = list.filter(isSong).map((s) => ({
    ...s,
    duration: typeof s.duration === "number" ? s.duration : 0,
    capo: typeof s.capo === "number" ? s.capo : 0,
  }));
  if (incoming.length === 0 && list.length > 0) return null;

  const songs = readAll();
  const result = { added: 0, updated: 0, skipped: 0 };
  for (const song of incoming) {
    const i = songs.findIndex((s) => s.id === song.id);
    if (i < 0) {
      songs.push(song);
      result.added++;
    } else if (song.updatedAt > songs[i].updatedAt) {
      // 並び順はこの端末のものを残す
      songs[i] = { ...song, order: songs[i].order };
      result.updated++;
    } else {
      result.skipped++;
    }
  }
  writeAll(songs);
  return result;
}
