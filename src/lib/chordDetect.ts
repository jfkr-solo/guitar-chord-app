/**
 * マイク入力からコードを推定するロジック。
 *
 * 1. FFT のスペクトルからピーク（倍音を含む鳴っている音）を拾う
 * 2. ピークを 12 の音名（C, C#, …, B）に振り分けて「クロマ」を作る
 * 3. 各コードの構成音テンプレートとの類似度を比べ、いちばん近いものを選ぶ
 */
import { NOTE_INDEX, parseChord } from "./chords";

export const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

/** 判定に使うコードの種類と、ルートからの半音数 */
export const DETECT_QUALITIES: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  "7sus4": [0, 5, 7, 10],
  add9: [0, 2, 4, 7],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "9": [0, 2, 4, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  "m7-5": [0, 3, 6, 10],
};


const MIN_FREQ = 70; // 6弦開放 E2 ≒ 82Hz より少し下
const MAX_FREQ = 1600;

export type Chroma = number[]; // 長さ 12、最大値 1 に正規化

export type Analysis = {
  chroma: Chroma;
  /** 最も低い目立つ音の音名インデックス */
  bass: number | null;
};

const freqToPitchClass = (freq: number) => {
  const midi = 69 + 12 * Math.log2(freq / 440);
  return ((Math.round(midi) % 12) + 12) % 12;
};

/** 判定の調整値（ギター音源をスマホのマイク相当に加工した音で合わせた値） */
export const TUNING = {
  /** 最大ピークから何 dB 下までを音として数えるか */
  rangeDb: 40,
  /** 振幅の圧縮（1 = そのまま。小さくするほど弱い音も拾う） */
  ampPower: 0.3,
  /** 奇数倍音（3, 5, 6, 7 倍）とみなす許容誤差（セント） */
  harmonicCents: 25,
  /** 倍音とみなした山の重みに掛ける係数 */
  harmonicKeep: 0.25,
  /** 低い山の何倍までの大きさなら、その倍音とみなすか */
  harmonicRatio: 6,
  /** この周波数より上は 1/f で重みを下げる */
  rolloffHz: 400,
  /** 構成音が多いコードほど何にでも似てしまうので、少しだけ不利にする */
  complexityPenalty: 0.01,
  /** 一番低い音（ベース）がルートと一致したときのボーナス */
  bassBonus: 0.04,
};

type Peak = { freq: number; amp: number; pc: number };

/** 3倍・5倍・6倍・7倍は別の音名に聞こえてしまう倍音 */
const MISLEADING_HARMONICS = [3, 5, 6, 7];

/**
 * getFloatFrequencyData の結果（dB）からクロマを作る。
 * 音が小さすぎるときは null を返す。
 */
export function analyzeSpectrum(db: Float32Array, sampleRate: number, fftSize: number): Analysis | null {
  const binHz = sampleRate / fftSize;
  const lo = Math.max(2, Math.floor(MIN_FREQ / binHz));
  const hi = Math.min(db.length - 3, Math.ceil(MAX_FREQ / binHz));

  let maxDb = -Infinity;
  for (let i = lo; i <= hi; i++) if (db[i] > maxDb) maxDb = db[i];
  if (maxDb < -100) return null;

  // 最大ピークから一定の範囲内にある局所的な山を拾う
  const threshold = maxDb - TUNING.rangeDb;
  const peaks: Peak[] = [];
  for (let i = lo; i <= hi; i++) {
    const v = db[i];
    if (v < threshold || v < db[i - 1] || v < db[i + 1] || v < db[i - 2] || v < db[i + 2]) continue;
    // 放物線補間でピーク周波数を少し正確にする
    const a = db[i - 1];
    const c = db[i + 1];
    const denom = a - 2 * v + c;
    const offset = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    const freq = (i + offset) * binHz;
    peaks.push({ freq, amp: Math.pow(10, (v - maxDb) / 20), pc: freqToPitchClass(freq) });
  }
  if (peaks.length === 0) return null;

  const chroma = new Array(12).fill(0);
  let bass: number | null = null;
  for (const p of peaks) {
    // 低い音の奇数倍音（例: A の 3 倍音は E に聞こえる）は数えない
    const isHarmonic = peaks.some(
      (q) =>
        q.freq < p.freq &&
        q.amp * TUNING.harmonicRatio >= p.amp &&
        MISLEADING_HARMONICS.some((h) => Math.abs(1200 * Math.log2(p.freq / (q.freq * h))) < TUNING.harmonicCents),
    );
    let weight = Math.pow(p.amp, TUNING.ampPower);
    if (p.freq > TUNING.rolloffHz) weight *= TUNING.rolloffHz / p.freq;
    if (isHarmonic) weight *= TUNING.harmonicKeep;
    chroma[p.pc] += weight;
    if (bass === null && !isHarmonic && p.amp > 0.2 && p.freq < 330) bass = p.pc;
  }

  const peak = Math.max(...chroma);
  if (peak <= 0) return null;
  return { chroma: chroma.map((x) => x / peak), bass };
}

export type ChordMatch = { root: number; quality: string; name: string; score: number };

const templateScore = (chroma: Chroma, root: number, intervals: number[]) => {
  let dot = 0;
  let norm = 0;
  for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
  for (const iv of intervals) dot += chroma[(root + iv) % 12];
  if (norm === 0) return 0;
  return dot / (Math.sqrt(norm) * Math.sqrt(intervals.length));
};

export function scoreChord(analysis: Analysis, root: number, quality: string): number {
  const intervals = DETECT_QUALITIES[quality];
  if (!intervals) return 0;
  let score = templateScore(analysis.chroma, root, intervals);
  score -= TUNING.complexityPenalty * (intervals.length - 3);
  if (analysis.bass === root) score += TUNING.bassBonus;
  return score;
}

/** 類似度が高い順にコード候補を返す */
export function rankChords(analysis: Analysis, limit = 3): ChordMatch[] {
  const results: ChordMatch[] = [];
  for (let root = 0; root < 12; root++) {
    for (const quality of Object.keys(DETECT_QUALITIES)) {
      results.push({
        root,
        quality,
        name: NOTE_NAMES[root] + quality,
        score: scoreChord(analysis, root, quality),
      });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** コード名 → { root, quality, 構成音 } 。判定できない種類なら null */
export function chordTones(name: string): { root: number; quality: string; tones: number[] } | null {
  const parsed = parseChord(name);
  if (!parsed) return null;
  const root = NOTE_INDEX[parsed.root];
  const intervals = DETECT_QUALITIES[parsed.quality];
  if (root === undefined || !intervals) return null;
  return { root, quality: parsed.quality, tones: intervals.map((iv) => (root + iv) % 12) };
}
