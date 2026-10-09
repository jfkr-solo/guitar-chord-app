/**
 * コードの押さえ方データ。
 *
 * frets / fingers は 6弦 → 1弦 の順。
 * frets: -1 = ミュート(×), 0 = 開放(○), 1以上 = フレット番号（絶対位置）
 * fingers: 0 = 指番号なし, 1〜4 = 人差し指〜小指
 */
export type Barre = { fret: number; fromString: number; toString: number };

export type ChordShape = {
  frets: number[];
  fingers: number[];
  barres: Barre[];
};

export const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

/** 選択UIに出す種類（表示名 → 内部キー） */
export const QUALITIES: { label: string; key: string }[] = [
  { label: "M", key: "" },
  { label: "m", key: "m" },
  { label: "7", key: "7" },
  { label: "m7", key: "m7" },
  { label: "maj7", key: "maj7" },
  { label: "sus4", key: "sus4" },
  { label: "7sus4", key: "7sus4" },
  { label: "sus2", key: "sus2" },
  { label: "add9", key: "add9" },
  { label: "6", key: "6" },
  { label: "m6", key: "m6" },
  { label: "9", key: "9" },
  { label: "dim", key: "dim" },
  { label: "dim7", key: "dim7" },
  { label: "aug", key: "aug" },
  { label: "m7-5", key: "m7-5" },
];

export const NOTE_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11, "B#": 0,
};

/** 表記ゆれを内部キーにそろえる */
const QUALITY_ALIASES: Record<string, string> = {
  "": "", M: "", maj: "",
  m: "m", min: "m", "-": "m",
  "7": "7",
  m7: "m7", min7: "m7", "-7": "m7",
  maj7: "maj7", M7: "maj7", "△7": "maj7", "Δ7": "maj7", "△": "maj7",
  sus4: "sus4", sus: "sus4",
  "7sus4": "7sus4", "7sus": "7sus4",
  sus2: "sus2",
  add9: "add9", add2: "add9",
  "6": "6",
  m6: "m6",
  "9": "9",
  dim: "dim", "°": "dim", o: "dim",
  dim7: "dim7", "°7": "dim7", o7: "dim7",
  aug: "aug", "+": "aug", "+5": "aug",
  "m7-5": "m7-5", m7b5: "m7-5", "m7(-5)": "m7-5", "m7(b5)": "m7-5", "ø": "m7-5",
};

type Movable = { offsets: (number | null)[]; fingers: number[] };

/** 6弦ルートの形（Eフォーム）。オフセットはルートのフレットからの距離 */
const E_FORM: Record<string, Movable> = {
  "": { offsets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
  m: { offsets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
  "7": { offsets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
  m7: { offsets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
  maj7: { offsets: [0, 2, 1, 1, 0, 0], fingers: [1, 4, 2, 3, 1, 1] },
  sus4: { offsets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
  "7sus4": { offsets: [0, 2, 0, 2, 0, 0], fingers: [1, 3, 1, 4, 1, 1] },
  add9: { offsets: [0, 2, 4, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
};

/** 5弦ルートの形（Aフォーム） */
const A_FORM: Record<string, Movable> = {
  "": { offsets: [null, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1] },
  m: { offsets: [null, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
  "7": { offsets: [null, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
  m7: { offsets: [null, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
  maj7: { offsets: [null, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1] },
  sus4: { offsets: [null, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1] },
  "7sus4": { offsets: [null, 0, 2, 0, 3, 0], fingers: [0, 1, 3, 1, 4, 1] },
  sus2: { offsets: [null, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1] },
  add9: { offsets: [null, 0, 2, 4, 2, 0], fingers: [0, 1, 2, 4, 3, 1] },
  "6": { offsets: [null, 0, 2, 2, 2, 2], fingers: [0, 1, 3, 3, 3, 3] },
  m6: { offsets: [null, 0, 2, 2, 1, 2], fingers: [0, 1, 3, 3, 2, 4] },
  dim: { offsets: [null, 0, 1, 2, 1, null], fingers: [0, 1, 2, 4, 3, 0] },
  dim7: { offsets: [null, 0, 1, 2, 1, 2], fingers: [0, 0, 0, 0, 0, 0] },
  "m7-5": { offsets: [null, 0, 1, 0, 1, null], fingers: [0, 1, 2, 1, 3, 0] },
  aug: { offsets: [null, 0, 3, 2, 2, 1], fingers: [0, 0, 0, 0, 0, 0] },
};

/** 5弦ルートでルートより下のフレットを使う形（ルートは1フレット以上が必要） */
const A_FORM_LOW: Record<string, Movable> = {
  "9": { offsets: [null, 0, -1, 0, 0, 0], fingers: [0, 2, 1, 3, 3, 3] },
};

/** よく使うオープンコードは定番の押さえ方を優先する */
const OPEN: Record<string, { frets: number[]; fingers: number[]; barres?: Barre[] }> = {
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
  Csus4: { frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
  C6: { frets: [-1, 3, 2, 2, 1, 0], fingers: [0, 4, 2, 3, 1, 0] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], barres: [{ fret: 1, fromString: 2, toString: 1 }] },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  Dsus2: { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  D6: { frets: [-1, -1, 0, 2, 0, 2], fingers: [0, 0, 0, 1, 0, 2] },
  Dadd9: { frets: [-1, 5, 4, 2, 3, 0], fingers: [0, 4, 3, 1, 2, 0] },
  E7: { frets: [0, 2, 0, 1, 3, 0], fingers: [0, 2, 0, 1, 4, 0] },
  Em7: { frets: [0, 2, 0, 0, 3, 0], fingers: [0, 2, 0, 0, 3, 0] },
  Eadd9: { frets: [0, 2, 4, 1, 0, 0], fingers: [0, 2, 4, 1, 0, 0] },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  Fadd9: { frets: [-1, -1, 3, 2, 1, 3], fingers: [0, 0, 3, 2, 1, 4] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  Gmaj7: { frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, 0, 0, 0, 1] },
  G6: { frets: [3, 2, 0, 0, 0, 0], fingers: [2, 1, 0, 0, 0, 0] },
  Gsus4: { frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4] },
  Gadd9: { frets: [3, 0, 0, 2, 0, 3], fingers: [2, 0, 0, 1, 0, 3] },
  A6: { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 0, 1, 1, 1, 1], barres: [{ fret: 2, fromString: 4, toString: 1 }] },
  Aadd9: { frets: [-1, 0, 2, 4, 2, 0], fingers: [0, 0, 1, 3, 2, 0] },
  Aaug: { frets: [-1, 0, 3, 2, 2, 1], fingers: [0, 0, 4, 2, 3, 1] },
  Caug: { frets: [-1, 3, 2, 1, 1, 0], fingers: [0, 4, 3, 1, 2, 0] },
  Eaug: { frets: [0, 3, 2, 1, 1, 0], fingers: [0, 4, 3, 1, 2, 0] },
  Adim7: { frets: [-1, 0, 1, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4] },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
};

export type ParsedChord = { root: string; quality: string; bass?: string };

/** "F#m7/C#" → { root: "F#", quality: "m7", bass: "C#" } */
export function parseChord(name: string): ParsedChord | null {
  const normalized = name.trim().replace(/♯/g, "#").replace(/♭/g, "b");
  const m = normalized.match(/^([A-G])([#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
  if (!m) return null;
  const quality = QUALITY_ALIASES[m[3]];
  if (quality === undefined) return null;
  return { root: m[1] + m[2], quality, bass: m[4] };
}

function fromMovable(shape: Movable, rootFret: number): ChordShape {
  const frets = shape.offsets.map((o) => (o === null ? -1 : rootFret + o));
  let fingers: number[];
  const barres: Barre[] = [];
  if (rootFret === 0) {
    // 開放弦がセーハの代わりになるので、指番号を1つずつ繰り下げる
    fingers = shape.fingers.map((f, i) => (frets[i] <= 0 || f === 0 ? 0 : Math.max(1, f - 1)));
  } else {
    fingers = [...shape.fingers];
    const barreStrings = shape.offsets
      .map((o, i) => (o === 0 && shape.fingers[i] === 1 ? 6 - i : null))
      .filter((s): s is number => s !== null);
    if (barreStrings.length >= 2) {
      barres.push({
        fret: rootFret,
        fromString: Math.max(...barreStrings),
        toString: Math.min(...barreStrings),
      });
    }
  }
  return { frets, fingers, barres };
}

/** コード名から押さえ方を返す。データがなければ null */
export function getChordShape(name: string): ChordShape | null {
  const parsed = parseChord(name);
  if (!parsed) return null;
  const rootIndex = NOTE_INDEX[parsed.root];
  if (rootIndex === undefined) return null;

  // オープンコードの定番形（異名同音もまとめて探す）
  for (const [key, shape] of Object.entries(OPEN)) {
    const p = parseChord(key);
    if (p && NOTE_INDEX[p.root] === rootIndex && p.quality === parsed.quality) {
      return { frets: shape.frets, fingers: shape.fingers, barres: shape.barres ?? [] };
    }
  }

  const candidates: ChordShape[] = [];
  const eFret = (rootIndex - NOTE_INDEX.E + 12) % 12;
  const aFret = (rootIndex - NOTE_INDEX.A + 12) % 12;
  if (E_FORM[parsed.quality]) candidates.push(fromMovable(E_FORM[parsed.quality], eFret));
  if (A_FORM[parsed.quality]) candidates.push(fromMovable(A_FORM[parsed.quality], aFret));
  if (A_FORM_LOW[parsed.quality]) {
    candidates.push(fromMovable(A_FORM_LOW[parsed.quality], aFret === 0 ? 12 : aFret));
  }
  if (candidates.length === 0) return null;

  // できるだけ低いポジションを選ぶ
  const lowest = (s: ChordShape) => Math.max(...s.frets);
  candidates.sort((a, b) => lowest(a) - lowest(b));
  return candidates[0];
}

export function buildChordName(root: string, qualityKey: string) {
  return root + qualityKey;
}
