// YouTube の URL から動画 ID を取り出す（画面に触らない）
/* ===== YouTube の URL ===== */
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
// 受ける形：youtube.com/watch?v=ID・youtu.be/ID・youtube.com/shorts/ID（先頭の http・https の指定はあってもなくても可）。
// それ以外（再生リスト・チャンネル・埋め込み用の URL・別のサイト・ID だけ）は断る。
// 戻り値：{ ok: true, id } か { ok: false, reason }。reason は 'empty'（空）・'form'（URL の形でない）・'host'（YouTube でない）・'id'（動画 ID が無い・形が違う）
function ytParseUrl(text) {
  const s = String(text == null ? '' : text).trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (s.length > 300 || /\s/.test(s)) return { ok: false, reason: 'form' };
  const full = s.indexOf('://') >= 0 ? s : 'https://' + s;
  let u;
  try { u = new URL(full); } catch (e) { return { ok: false, reason: 'form' }; }
  const scheme = u.protocol.slice(0, -1);
  if (scheme !== 'http' && scheme !== 'https') return { ok: false, reason: 'form' };
  if (u.username || u.password || u.port) return { ok: false, reason: 'form' };
  const host = u.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') {
    const m = u.pathname.match(/^\/([^/]+)\/?$/);
    id = m && m[1];
  } else if (YT_HOSTS.indexOf(host) >= 0) {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/shorts\/([^/]+)\/?$/);
      id = m && m[1];
    }
  } else return { ok: false, reason: 'host' };
  if (!id || !YT_ID_RE.test(id)) return { ok: false, reason: 'id' };
  return { ok: true, id };
}
