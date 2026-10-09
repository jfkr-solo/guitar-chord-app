"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ChordDiagram from "@/components/ChordDiagram";
import { QUALITIES, ROOTS } from "@/lib/chords";
import {
  NOTE_NAMES,
  analyzeSpectrum,
  chordTones,
  rankChords,
  scoreChord,
  type Analysis,
  type ChordMatch,
} from "@/lib/chordDetect";

const FFT_SIZE = 16384;
const INTERVAL_MS = 120;
/** これより小さい音は無音とみなす（RMS） */
const SILENCE_RMS = 0.008;
/** クロマの平滑化（大きいほど反応が速い） */
const SMOOTHING = 0.45;
/** 構成音のクロマがこれ未満なら「鳴っていない」 */
const MISSING_LEVEL = 0.08;
/** 構成音以外のクロマがこれ以上なら「余計な音」 */
const EXTRA_LEVEL = 0.55;
/** 1位との差がこの範囲ならお手本のコードとして合格 */
const PASS_MARGIN = 0.03;

type Status = "idle" | "starting" | "listening" | "error";

type Result = {
  analysis: Analysis;
  top: ChordMatch[];
};

export default function DetectPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [root, setRoot] = useState<string | null>(null);
  const [quality, setQuality] = useState("");
  const stopRef = useRef<(() => void) | null>(null);

  const target = root ? root + quality : null;

  useEffect(() => () => stopRef.current?.(), []);

  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("このブラウザではマイクが使えません（https で開いているか確認してください）");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = new AudioContext();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const freq = new Float32Array(analyser.frequencyBinCount);
      const wave = new Float32Array(analyser.fftSize);
      let smoothed: number[] | null = null;
      let bass: number | null = null;

      const timer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(wave);
        let sum = 0;
        for (let i = 0; i < wave.length; i++) sum += wave[i] * wave[i];
        const rms = Math.sqrt(sum / wave.length);
        setLevel(Math.min(1, rms * 12));

        if (rms < SILENCE_RMS) {
          smoothed = null;
          setResult(null);
          return;
        }
        analyser.getFloatFrequencyData(freq);
        const a = analyzeSpectrum(freq, ctx.sampleRate, analyser.fftSize);
        if (!a) return;
        const prev: number[] | null = smoothed;
        const next: number[] = prev ? prev.map((v, i) => v + (a.chroma[i] - v) * SMOOTHING) : a.chroma;
        smoothed = next;
        if (a.bass !== null) bass = a.bass;
        const peak = Math.max(...next);
        const analysis: Analysis = { chroma: next.map((v) => v / peak), bass };
        setResult({ analysis, top: rankChords(analysis, 3) });
      }, INTERVAL_MS);

      stopRef.current = () => {
        window.clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        stopRef.current = null;
      };
      setStatus("listening");
    } catch (e) {
      setStatus("error");
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。"
          : "マイクを開始できませんでした。",
      );
    }
  };

  const stop = () => {
    stopRef.current?.();
    setStatus("idle");
    setResult(null);
    setLevel(0);
  };

  const detected = result?.top[0] ?? null;
  const targetInfo = target ? chordTones(target) : null;
  const check = (() => {
    if (!result || !targetInfo || !detected) return null;
    const { chroma } = result.analysis;
    const missing = targetInfo.tones.filter((t) => chroma[t] < MISSING_LEVEL);
    const extra = chroma
      .map((v, i) => (v >= EXTRA_LEVEL && !targetInfo.tones.includes(i) ? i : -1))
      .filter((i) => i >= 0);
    const targetScore = scoreChord(result.analysis, targetInfo.root, targetInfo.quality);
    const isTop = detected.root === targetInfo.root && detected.quality === targetInfo.quality;
    const ok = missing.length === 0 && (isTop || detected.score - targetScore <= PASS_MARGIN);
    return { ok, missing, extra };
  })();

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-amber-400">
          ← 曲一覧
        </Link>
        <h1 className="text-2xl font-bold">コード判定</h1>
      </div>

      {/* 判定結果 */}
      <section className="mb-4 rounded-2xl bg-gray-800/70 p-4 text-center">
        {status !== "listening" ? (
          <p className="py-8 text-gray-400">
            下のボタンでマイクをオンにして、
            <br />
            ギターを鳴らしてください。
          </p>
        ) : detected ? (
          <>
            <p className="text-sm text-gray-400">聞こえているコード</p>
            <p className="text-6xl font-bold text-amber-400">{detected.name}</p>
            <p className="mt-1 text-sm text-gray-400">
              {result!.top
                .slice(1)
                .map((m) => m.name)
                .join(" ・ ")}
              {" の可能性も"}
            </p>
          </>
        ) : (
          <p className="py-8 text-gray-400">音を待っています…</p>
        )}

        {status === "listening" && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-700">
            <div className="h-full bg-emerald-400 transition-[width] duration-100" style={{ width: `${level * 100}%` }} />
          </div>
        )}
      </section>

      {/* お手本との比較 */}
      {target && (
        <section
          className={`mb-4 rounded-2xl p-4 text-center ring-2 ${
            check === null ? "bg-gray-800/40 ring-gray-700" : check.ok ? "bg-emerald-900/40 ring-emerald-500" : "bg-rose-900/30 ring-rose-500"
          }`}
        >
          <p className="text-lg font-bold">
            {check === null ? `${target} を鳴らしてください` : check.ok ? `◎ ${target} が鳴っています` : `△ ${target} になっていません`}
          </p>
          {check && !check.ok && (
            <p className="mt-1 text-sm text-gray-300">
              {check.missing.length > 0 && `鳴っていない音: ${check.missing.map((i) => NOTE_NAMES[i]).join(", ")}`}
              {check.missing.length > 0 && check.extra.length > 0 && " ／ "}
              {check.extra.length > 0 && `余計な音: ${check.extra.map((i) => NOTE_NAMES[i]).join(", ")}`}
            </p>
          )}
          <div className="mt-2 flex justify-center">
            <ChordDiagram name={target} size={150} />
          </div>
        </section>
      )}

      {/* 12音のバー */}
      {status === "listening" && (
        <section className="mb-4">
          <div className="flex h-24 items-end gap-1">
            {NOTE_NAMES.map((n, i) => {
              const v = result?.analysis.chroma[i] ?? 0;
              const inTarget = targetInfo?.tones.includes(i);
              return (
                <div key={n} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
                  <div
                    className={`w-full rounded-t ${inTarget ? "bg-amber-400" : "bg-sky-500/70"}`}
                    style={{ height: `${Math.max(2, v * 100)}%` }}
                  />
                  <span className={`text-[10px] ${inTarget ? "font-bold text-amber-300" : "text-gray-400"}`}>{n}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-gray-500">各音の聞こえ方（オレンジ＝お手本のコードの構成音）</p>
        </section>
      )}

      {/* お手本コードの選択 */}
      <section className="mb-6">
        <p className="mb-2 text-sm text-gray-400">お手本のコード（選ぶと正しく弾けているかチェックします）</p>
        <div className="mb-2 grid grid-cols-6 gap-1.5">
          {ROOTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoot(root === r ? null : r)}
              className={`h-10 rounded-lg text-sm font-bold ${root === r ? "bg-amber-500 text-gray-900" : "bg-gray-800 text-gray-200"}`}
            >
              {r}
            </button>
          ))}
        </div>
        {root && (
          <div className="grid grid-cols-4 gap-1.5">
            {QUALITIES.map((q) => (
              <button
                key={q.key}
                type="button"
                onClick={() => setQuality(q.key)}
                className={`h-9 rounded-lg text-sm ${quality === q.key ? "bg-sky-500 text-gray-900" : "bg-gray-800 text-gray-200"}`}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <p className="mb-3 text-center text-sm text-rose-400">{error}</p>}

      <button
        type="button"
        onClick={status === "listening" ? stop : start}
        disabled={status === "starting"}
        className={`block h-14 w-full rounded-2xl text-lg font-bold ${
          status === "listening" ? "bg-gray-700 text-white active:bg-gray-600" : "bg-amber-500 text-gray-900 active:bg-amber-400"
        }`}
      >
        {status === "listening" ? "■ 停止" : status === "starting" ? "準備中…" : "🎤 マイクをオンにする"}
      </button>
      <p className="mt-2 text-center text-xs text-gray-500">カポを付けているときは、実際に鳴っている音で判定されます</p>
    </main>
  );
}
