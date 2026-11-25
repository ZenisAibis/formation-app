// YouTube の動画の枠（IFrame Player API）。プレーヤーの時刻を正とし、アプリの再生位置が追いかける
/* ===== YouTube の動画 ===== */
const YT_STORE_KEY = LS_KEY + '.youtube'; // 動画 ID（11字）だけ。端末の中だけ。作品の JSON には入れない
const YT_API_SRC = 'https://www.youtube.com/iframe_api';
const YT_EMBED = 'https://www.youtube-nocookie.com/embed/';
const YT_READY_WAIT_MS = 15000; // 枠の準備を待つ上限（自動の再試行はしない）
const YT_POLL_MS = 250;         // 止まっている間、プレーヤーの時刻を読む間隔
const YT_HOLD_MS = 400;         // アプリから位置を動かした直後、プレーヤーの古い時刻を読まない間
const YT_MIN_PX = 200;          // プレーヤーの幅・高さの最小（YouTube の決まり）
const YT_ERRORS = {
  2: '動画の URL が正しくありません',
  5: 'この動画は埋め込みの再生に対応していません',
  100: '動画が見つかりません（削除または非公開）',
  101: '持ち主が、埋め込みでの再生を許可していません',
  150: '持ち主が、埋め込みでの再生を許可していません',
  153: '公開版（https）で開くと使えます（開いた元を YouTube に伝えられませんでした）',
};
const yt = { id: null, player: null, ready: false, state: -1, rate: 1, last: { t: 0, at: 0 }, hold: 0, poll: 0, timer: null, apiP: null, seq: 0 };

const ytActive = () => !!(yt.ready && yt.player);
function ytSay(msg) { $('#ytStatus').textContent = msg; }
// 入れ口の下の知らせ（URL が悪い・使えない開き方など）。画面の下の知らせ（toast）にも出す
function ytNote(msg) {
  $('#ytMsg').textContent = msg;
  toast(msg, 5000);
}
// file:// など、http・https でない開き方では YouTube の枠が使えない（エラー 153）
const ytCanEmbed = () => /^https?$/.test(location.protocol.slice(0, -1));

// IFrame Player API の読み込み（1回だけ。失敗しても落とさず、次に押したとき改めて試す）
function ytLoadApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (yt.apiP) return yt.apiP;
  yt.apiP = new Promise((resolve, reject) => {
    const done = () => (window.YT && window.YT.Player ? resolve() : reject(new Error('YT.Player が無い')));
    window.onYouTubeIframeAPIReady = done;
    const s = document.createElement('script');
    s.src = YT_API_SRC;
    s.async = true;
    s.onerror = () => reject(new Error('読み込めない'));
    document.head.append(s);
    setTimeout(() => reject(new Error('時間切れ')), YT_READY_WAIT_MS);
  });
  yt.apiP.catch(() => { yt.apiP = null; });
  return yt.apiP;
}

// プレーヤーの時刻（秒）。止まっているときは読んだ値のまま。再生中は、読んだ値から経った分を足して滑らかにする
function ytNow() {
  const now = performance.now();
  try {
    const st = yt.player.getPlayerState();
    if (now >= yt.hold) {
      const t = yt.player.getCurrentTime();
      if (typeof t === 'number' && isFinite(t) && t !== yt.last.t) yt.last = { t, at: now };
    }
    if (st === 1) return yt.last.t + Math.min(0.5, (now - yt.last.at) / 1000 * yt.rate);
  } catch (e) { }
  return yt.last.t;
}
// 動画の時刻から、アプリの位置（カウント）を決める。曲の読み込みと同じ軸（BPM と 1カウント目の時刻）
const ytCount = () => (ytNow() - S.offset) / beatSec();

// アプリから位置を動かす（タイムライン・戻る・作品の読み込みなど）
function ytSeekCount(c) {
  const t = Math.max(0, S.offset + c * beatSec());
  try { yt.player.seekTo(t, true); } catch (e) { return; }
  yt.last = { t, at: performance.now() };
  yt.hold = performance.now() + YT_HOLD_MS;
}

// 再生の状態は、プレーヤーの知らせ（onStateChange）に従う
function ytSetPlaying(on) {
  if (on === ui.playing) return;
  ui.playing = on;
  if (on) {
    lastBeat = null;
    yt.last.at = performance.now();
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wakeLock = w; }).catch(() => { });
  } else {
    try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { }
    if (ui.recording) stopRecording();
  }
  requestRender();
}
function ytOnState(e) {
  yt.state = e.data;
  if (e.data === 1) ytSetPlaying(true);
  else if (e.data === 0 || e.data === 2 || e.data === 5) ytSetPlaying(false);
  ytSay(e.data === 1 ? '再生中' : e.data === 3 ? '読み込み中…' : e.data === 0 ? '最後まで再生しました' : '止まっています');
  if (e.data !== 1 && e.data !== 3) yt.poll = 0; // 止まったら、すぐ位置を読み直す
}
// 速さ：API は「頼む」だけで、変わる保証がない。変わったか（onPlaybackRateChange・getPlaybackRate）を見てから画面に反映する
function ytOnRate(e) {
  if (typeof e.data !== 'number') return;
  yt.rate = e.data;
  ui.rate = e.data;
  syncRateUi();
}
function ytSetRate(r) {
  try { yt.player.setPlaybackRate(r); } catch (e) { return; }
  setTimeout(() => {
    if (!ytActive()) return;
    let got = r;
    try { got = yt.player.getPlaybackRate(); } catch (e) { }
    if (got !== r) {
      yt.rate = ui.rate = got;
      syncRateUi();
      toast(`この動画は ${r}倍 にできませんでした。速さは YouTube の側（動画の歯車）で変えてください`, 5000);
    }
  }, 600);
}

// 再生の頼み：動画の枠が見えているときだけ。見えていなければ、見える所へ動かす（自動で再生はしない。押されたときだけ）
function ytBoxFits() {
  const r = $('#ytFrameWrap').getBoundingClientRect();
  return !$('#ytBox').hidden && !document.body.classList.contains('proj') && r.width >= YT_MIN_PX && r.height >= YT_MIN_PX;
}
// 動画の枠が画面から外れているときは、全部見える所へ動かす（設定タブの下の方で URL を入れたときなど）
function ytScrollIntoView() {
  const w = $('#ytFrameWrap'), r = w.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) w.scrollIntoView({ block: 'center' });
}
function ytPlay() {
  if (!ytBoxFits()) {
    toast('動画の枠が見える状態にしてから再生してください');
    return;
  }
  ytScrollIntoView();
  if (ui.count >= S.totalEights * 8 - 0.5) ytSeekCount(0);
  try { yt.player.playVideo(); } catch (e) { toast('動画を再生できませんでした'); }
  // 端末によっては、アプリのボタンからの再生を YouTube が受けないことがある（再生は動画の枠の中のボタンで確かめられる）
  const mine = yt.seq;
  setTimeout(() => {
    if (mine === yt.seq && ytActive() && !ui.playing && yt.state !== 3 && yt.state !== 1) {
      toast('始まらないときは、動画の枠の中の再生ボタンを直接押してください', 5000);
    }
  }, 2000);
}
function ytPause() { try { yt.player.pauseVideo(); } catch (e) { } }

// 手動で合わせ直す：今のプレーヤーの時刻を読み直して、アプリの位置を合わせる
function ytResync() {
  if (!ytActive()) return;
  yt.hold = 0;
  try { yt.last = { t: yt.player.getCurrentTime(), at: performance.now() }; } catch (e) { return; }
  ui.count = ytCount();
  lastBeat = null;
  requestRender();
  toast('動画の今の位置に合わせ直しました');
}
// 止まっている間も、動画側（YouTube の再生バーなど）で位置を動かしたら追いかける（tick から呼ぶ）
function ytFollowIdle() {
  const now = performance.now();
  if (now - yt.poll < YT_POLL_MS) return false;
  yt.poll = now;
  const c = ytCount();
  if (Math.abs(c - ui.count) <= 0.02) return false;
  ui.count = c;
  return true;
}

function ytShow(on) { $('#ytBox').hidden = !on; }
// 動画を出す
async function ytOpen(text) {
  const p = ytParseUrl(text);
  if (!p.ok) {
    ytNote(p.reason === 'empty' ? 'YouTube の URL を入れてください'
      : 'YouTube の動画の URL（youtube.com/watch?v=… ・ youtu.be/… ・ youtube.com/shorts/…）だけ使えます');
    return;
  }
  if (!ytCanEmbed()) {
    ytNote('公開版（https）で使えます。ファイルとして開いている間は、YouTube の動画は出せません');
    return;
  }
  ytClose(true);
  pause();
  if (audioReady) audio.pause();
  const mine = ++yt.seq;
  yt.id = p.id;
  $('#ytMsg').textContent = '';
  ytShow(true);
  ytSay('動画の部品を読み込んでいます…');
  const f = document.createElement('iframe');
  f.id = 'ytFrame';
  f.title = 'YouTube の動画';
  f.src = YT_EMBED + p.id + '?enablejsapi=1&playsinline=1&rel=0&origin=' + encodeURIComponent(location.origin);
  f.setAttribute('allow', 'encrypted-media; picture-in-picture; fullscreen');
  f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  f.setAttribute('allowfullscreen', '');
  $('#ytFrameWrap').append(f);
  try {
    await ytLoadApi();
    if (mine !== yt.seq) return;
    yt.player = new window.YT.Player(f, {
      events: {
        onReady: () => ytOnReady(mine),
        onStateChange: ytOnState,
        onPlaybackRateChange: ytOnRate,
        onError: e => ytFail(YT_ERRORS[e.data] || `動画を出せませんでした（エラー ${e.data}）`),
      },
    });
    yt.timer = setTimeout(() => {
      if (mine === yt.seq && !yt.ready) ytFail('動画の枠の準備ができませんでした（電波と、公開版（https）で開いているかを確かめてください）');
    }, YT_READY_WAIT_MS);
  } catch (e) {
    if (mine === yt.seq) ytFail('YouTube の部品を読み込めませんでした（電波を確かめてください）');
  }
}
function ytOnReady(mine) {
  if (mine !== yt.seq) return;
  clearTimeout(yt.timer);
  yt.ready = true;
  yt.rate = 1;
  try { yt.rate = yt.player.getPlaybackRate() || 1; } catch (e) { }
  ui.rate = yt.rate;
  syncRateUi();
  try { localStorage.setItem(YT_STORE_KEY, yt.id); } catch (e) { }
  yt.last = { t: 0, at: performance.now() };
  yt.hold = 0;
  ytSay('準備ができました。動画を再生すると、アプリの位置が追いかけます');
  ytScrollIntoView();
  ui.count = ytCount();
  requestRender();
}
// 出せなかったとき：画面は落とさず、知らせて、枠を閉じる
function ytFail(msg) {
  ytClose(true);
  ytNote(msg);
}
// 動画を閉じる（keepStore：保存した ID を残す）
function ytClose(keepStore) {
  const was = ytActive();
  yt.seq++;
  clearTimeout(yt.timer);
  if (was) pause();
  try { if (yt.player && yt.player.destroy) yt.player.destroy(); } catch (e) { }
  $('#ytFrameWrap').textContent = '';
  yt.player = null;
  yt.ready = false;
  yt.state = -1;
  ytShow(false);
  if (was && ui.rate !== 1) setRate(1);
  if (!keepStore) {
    try { localStorage.removeItem(YT_STORE_KEY); } catch (e) { }
  }
}
// 「大きく表示」の間は動画の枠が隠れる（隠したまま鳴らさない）ので、先に止める
function ytBeforeProj() {
  if (ytActive()) pause();
}

$('#btnYtOpen').addEventListener('click', () => ytOpen($('#ytUrl').value));
$('#ytUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') ytOpen($('#ytUrl').value);
});
$('#btnYtSync').addEventListener('click', ytResync);
$('#btnYtClose').addEventListener('click', () => {
  ytClose(false);
  $('#ytUrl').value = '';
  $('#ytMsg').textContent = '動画を閉じました';
});
// 前に出した動画があれば、入れ口に入れておく（自動では出さない。押すと出る）
try {
  const sid = localStorage.getItem(YT_STORE_KEY);
  if (sid && YT_ID_RE.test(sid)) $('#ytUrl').value = 'youtu.be/' + sid;
} catch (e) { }
