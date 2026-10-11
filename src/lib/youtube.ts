/** YouTube の URL から動画 ID と開始秒を取り出す。YouTube の URL でなければ null */
export function parseYouTube(url: string): { id: string; start?: number } | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(shorts|live|embed|v)\/([^/?#]+)/);
      if (m) id = m[2];
    }
  }
  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  const t = u.searchParams.get("t") ?? u.searchParams.get("start");
  const start = t ? parseTime(t) : undefined;
  return { id, start: start || undefined };
}

/** "90" "90s" "1m30s" → 90 */
function parseTime(t: string): number {
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS の Safari は Mac と同じ UA になるのでタッチ対応かどうかで見分ける
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** YouTube アプリで動画を開く。アプリが無ければブラウザで開く */
export function openYouTube(url: string) {
  const parsed = parseYouTube(url);
  if (!parsed) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const query = `v=${parsed.id}${parsed.start ? `&t=${parsed.start}` : ""}`;
  const web = `https://www.youtube.com/watch?${query}`;

  if (isIOS()) {
    // iOS / iPadOS: youtube:// で YouTube アプリを直接開く。
    // アプリが無くて画面が切り替わらなかったときはブラウザで開く
    const timer = window.setTimeout(() => {
      if (!document.hidden) window.location.href = web;
    }, 1500);
    const onHide = () => {
      if (document.hidden) window.clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", onHide, { once: true });
    window.location.href = `youtube://www.youtube.com/watch?${query}`;
    return;
  }
  if (/Android/.test(navigator.userAgent)) {
    window.location.href = `intent://www.youtube.com/watch?${query}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=${encodeURIComponent(web)};end`;
    return;
  }
  window.open(web, "_blank", "noopener");
}
