"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> };

function maxScroll() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

/**
 * 曲の長さに合わせて一定速度でページをスクロールする。
 * 位置 = 経過時間 / 曲の長さ × (全体の高さ − 画面の高さ)
 * なので、曲の終わりでちょうど最後の行が画面の下端に来る。
 * 再生中に手でスクロールした場合は、その位置から続ける。
 */
export function useAutoScroll(duration: number) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const lastSetYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const shownRef = useRef(-1);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const syncFromScroll = useCallback(() => {
    const max = maxScroll();
    if (max > 0 && duration > 0) {
      elapsedRef.current = Math.min(duration, Math.max(0, (window.scrollY / max) * duration));
      setElapsed(elapsedRef.current);
    }
  }, [duration]);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  }, []);

  const tick = useCallback(
    (ts: number) => {
      const max = maxScroll();
      if (lastTsRef.current !== null) {
        // 再生中に手でスクロールされたら、その位置に合わせる
        if (Math.abs(window.scrollY - lastSetYRef.current) > 4) syncFromScroll();
        const dt = Math.min(0.25, (ts - lastTsRef.current) / 1000);
        elapsedRef.current = Math.min(duration, elapsedRef.current + dt);
      }
      lastTsRef.current = ts;

      const y = (elapsedRef.current / duration) * max;
      window.scrollTo(0, y);
      lastSetYRef.current = y;

      // 表示の更新は 0.25 秒ごとに間引く
      const shown = Math.floor(elapsedRef.current * 4);
      if (shown !== shownRef.current) {
        shownRef.current = shown;
        setElapsed(elapsedRef.current);
      }

      if (elapsedRef.current >= duration) {
        setElapsed(duration);
        setPlaying(false);
        stopLoop();
        releaseWakeLock();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [duration, syncFromScroll, stopLoop, releaseWakeLock],
  );

  const play = useCallback(() => {
    if (duration <= 0) return;
    if (elapsedRef.current >= duration) {
      elapsedRef.current = 0;
      window.scrollTo(0, 0);
    }
    lastSetYRef.current = window.scrollY;
    setPlaying(true);
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
    // 演奏中は画面が消えないようにする（対応ブラウザのみ）
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
    nav.wakeLock
      ?.request("screen")
      .then((lock) => (wakeLockRef.current = lock))
      .catch(() => {});
  }, [duration, tick, stopLoop]);

  const pause = useCallback(() => {
    stopLoop();
    setPlaying(false);
    releaseWakeLock();
  }, [stopLoop, releaseWakeLock]);

  const reset = useCallback(() => {
    pause();
    elapsedRef.current = 0;
    setElapsed(0);
    window.scrollTo(0, 0);
  }, [pause]);

  // 停止中に手でスクロールしたら、その位置から再生できるようにする
  useEffect(() => {
    if (playing) return;
    const onScroll = () => syncFromScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [playing, syncFromScroll]);

  useEffect(() => () => {
    stopLoop();
    releaseWakeLock();
  }, [stopLoop, releaseWakeLock]);

  return { playing, elapsed, play, pause, reset };
}
