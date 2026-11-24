// 画面の土台・ステージの描画・タイムライン・再生・ドラッグ
let audioReady = false, analysis = null, wakeLock = null;
const audio = $('#audio');

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), ms);
}
function el(tag, props = {}, kids = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) e.append(c);
  return e;
}

/* ===== 描画 ===== */
const cv = $('#stage'), ctx = cv.getContext('2d');
let needRender = true;
const requestRender = () => { needRender = true; };
function stageLayout(w, h, view) {
  const W = S.stage.w, D = S.stage.d, padX = Math.max(10, w * 0.03), padT = Math.max(8, h * 0.025), lab = Math.max(20, h * 0.07);
  const sc = Math.min((w - 2 * padX) / W, (h - 2 * padT - lab) / D), sw = W * sc, sd = D * sc;
  const ox = (w - sw) / 2, oy = view === 'audience' ? padT + (h - 2 * padT - lab - sd) / 2 : padT + lab + (h - 2 * padT - lab - sd) / 2;
  const map = view === 'audience' ? (x, y) => [ox + (x + W / 2) * sc, oy + (D - y) * sc] : (x, y) => [ox + (W / 2 - x) * sc, oy + y * sc];
  const inv = view === 'audience' ? (sx, sy) => [(sx - ox) / sc - W / 2, D - (sy - oy) / sc] : (sx, sy) => [W / 2 - (sx - ox) / sc, (sy - oy) / sc];
  return { sc, ox, oy, sw, sd, map, inv, lab };
}
function drawStage(c, w, h, count, o) {
  const L = stageLayout(w, h, o.view), W = S.stage.w, D = S.stage.d, { map, sc } = L;
  c.fillStyle = '#0b0e14';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#18202d';
  c.fillRect(L.ox, L.oy, L.sw, L.sd);
  c.lineWidth = 1;
  for (let x = Math.ceil(-W / 2); x <= W / 2; x++) {
    const [a, b] = map(x, 0), [, d] = map(x, D);
    c.strokeStyle = x === 0 ? '#3a4a63' : '#232d3d';
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(a, d);
    c.stroke();
  }
  for (let y = 1; y < D; y++) {
    const [a, b] = map(-W / 2, y), [e] = map(W / 2, y);
    c.strokeStyle = '#232d3d';
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(e, b);
    c.stroke();
  }
  // 客席側の線と文字
  const [fx1, fy] = map(-W / 2, 0), [fx2] = map(W / 2, 0);
  c.strokeStyle = '#ffd93d';
  c.lineWidth = Math.max(2, sc * 0.05);
  c.beginPath();
  c.moveTo(fx1, fy);
  c.lineTo(fx2, fy);
  c.stroke();
  const fs = Math.max(11, Math.min(L.lab * 0.55, 22));
  c.font = `700 ${fs}px sans-serif`;
  c.fillStyle = '#ffd93d';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('客席（正面）', w / 2, o.view === 'audience' ? fy + L.lab * 0.55 : fy - L.lab * 0.55);
  c.font = `${fs * 0.8}px sans-serif`;
  c.fillStyle = '#7d8aa0';
  const [kx] = map(W / 2 - 0.1, 0), [sx] = map(-W / 2 + 0.1, 0);
  const ly = o.view === 'audience' ? fy + L.lab * 0.55 : fy - L.lab * 0.55;
  c.textAlign = kx > sx ? 'right' : 'left';
  c.fillText('上手', kx, ly);
  c.textAlign = kx > sx ? 'left' : 'right';
  c.fillText('下手', sx, ly);
  const pos = positionsAt(S.keys, count), R = Math.max(8, 0.27 * sc), n = pos.length;
  // ベースの比較
  if (o.compare && S.baseKeys) {
    const bp = positionsAt(S.baseKeys, count);
    c.setLineDash([4, 4]);
    c.lineWidth = 1.5;
    bp.forEach((p, i) => {
      const [x, y] = map(p[0], p[1]);
      c.strokeStyle = S.dancers[i].color;
      c.beginPath();
      c.arc(x, y, R * 0.9, 0, 7);
      c.stroke();
    });
    c.setLineDash([]);
  }
  // 編集中：前の隊形から
  if (o.ghostPrev) {
    const prev = S.keys[o.ghostPrev - 1];
    c.lineWidth = 1.5;
    prev.pos.forEach((p, i) => {
      const [x, y] = map(p[0], p[1]), [x2, y2] = map(pos[i][0], pos[i][1]);
      c.globalAlpha = 0.3;
      c.fillStyle = S.dancers[i].color;
      c.beginPath();
      c.arc(x, y, R * 0.6, 0, 7);
      c.fill();
      c.globalAlpha = 0.45;
      c.strokeStyle = S.dancers[i].color;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x2, y2);
      c.stroke();
    });
    c.globalAlpha = 1;
  }
  // 次の位置への矢印
  const ki = keyIndexAt(count), nextK = S.keys[ki + 1];
  const arrowsFor = [];
  if (nextK && o.showPaths) for (let i = 0; i < n; i++) arrowsFor.push(i);
  if (nextK && o.me >= 0 && !arrowsFor.includes(o.me)) arrowsFor.push(o.me);
  arrowsFor.forEach(i => {
    const [x, y] = map(pos[i][0], pos[i][1]), [x2, y2] = map(nextK.pos[i][0], nextK.pos[i][1]);
    if (hyp(x2 - x, y2 - y) < R * 0.8) return;
    const isMe = i === o.me;
    c.strokeStyle = S.dancers[i].color;
    c.globalAlpha = isMe ? 0.95 : 0.4;
    c.lineWidth = isMe ? 3 : 1.5;
    c.setLineDash(isMe ? [] : [5, 4]);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x2, y2);
    c.stroke();
    c.setLineDash([]);
    const a = Math.atan2(y2 - y, x2 - x), hs = isMe ? 12 : 7;
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - hs * Math.cos(a - 0.45), y2 - hs * Math.sin(a - 0.45));
    c.lineTo(x2 - hs * Math.cos(a + 0.45), y2 - hs * Math.sin(a + 0.45));
    c.closePath();
    c.fillStyle = S.dancers[i].color;
    c.fill();
    if (isMe) {
      c.globalAlpha = 0.5;
      c.beginPath();
      c.arc(x2, y2, R * 1.05, 0, 7);
      c.setLineDash([3, 3]);
      c.stroke();
      c.setLineDash([]);
    }
    c.globalAlpha = 1;
  });
  // クロスの場所
  const xi = o.ghostPrev ? o.ghostPrev : (nextK && count >= Math.max(S.keys[ki].at, nextK.at - nextK.move) - 8 ? ki + 1 : 0);
  if (xi) crossesInto(xi).forEach(cr => {
    const mine = o.me >= 0 && (cr.a === o.me || cr.b === o.me);
    if (o.me >= 0 && !mine && !o.ghostPrev) return;
    const [x, y] = map(cr.pt[0], cr.pt[1]), z = mine ? 9 : 6;
    c.strokeStyle = '#ffd93d';
    c.lineWidth = mine ? 3 : 2;
    c.globalAlpha = mine ? 1 : 0.8;
    c.beginPath();
    c.moveTo(x - z, y - z);
    c.lineTo(x + z, y + z);
    c.moveTo(x + z, y - z);
    c.lineTo(x - z, y + z);
    c.stroke();
    c.globalAlpha = 1;
  });
  // ダンサー
  const order = [...Array(n).keys()].sort((a, b) => (a === o.me) - (b === o.me));
  order.forEach(i => {
    const [x, y] = map(pos[i][0], pos[i][1]), d = S.dancers[i], isMe = i === o.me, rr = isMe ? R * 1.35 : R;
    c.globalAlpha = o.me >= 0 && !isMe ? 0.55 : 1;
    c.fillStyle = d.color;
    c.beginPath();
    c.arc(x, y, rr, 0, 7);
    c.fill();
    c.lineWidth = isMe || i === o.selDancer ? 3 : 1;
    c.strokeStyle = isMe || i === o.selDancer ? '#fff' : '#0008';
    c.stroke();
    if (o.names) {
      c.fillStyle = '#111';
      c.font = `700 ${Math.max(9, rr * 0.78)}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(d.name.slice(0, 2), x, y + 0.5);
    }
    c.globalAlpha = 1;
  });
  // 照明
  if (o.lights !== false) {
    const Lt = lightAt(count);
    if (Lt.tint && Lt.tintA > 0.01) {
      c.globalAlpha = Lt.tintA;
      c.fillStyle = Lt.tint;
      c.fillRect(L.ox, L.oy, L.sw, L.sd);
      c.globalAlpha = 1;
    }
    if (Lt.dark > 0.01) {
      c.fillStyle = `rgba(0,0,0,${Lt.dark})`;
      c.beginPath();
      c.rect(L.ox, L.oy, L.sw, L.sd);
      if (Lt.spot >= 0 && pos[Lt.spot]) {
        const [x, y] = map(pos[Lt.spot][0], pos[Lt.spot][1]), sr = R * 2.6;
        c.moveTo(x + sr, y);
        c.arc(x, y, sr, 0, Math.PI * 2, true);
      }
      c.fill('evenodd');
      if (Lt.dark > 0.5) pos.forEach((p, i) => { // 暗転中も立ち位置は線で見せる
        if (i === Lt.spot) return;
        const [x, y] = map(p[0], p[1]);
        c.globalAlpha = i === o.me ? 0.95 : 0.5;
        c.strokeStyle = S.dancers[i].color;
        c.lineWidth = i === o.me ? 3 : 1.5;
        c.beginPath();
        c.arc(x, y, i === o.me ? R * 1.35 : R, 0, 7);
        c.stroke();
      });
      c.globalAlpha = 1;
    }
    const fs2 = Math.max(11, Math.min(sc * 0.32, 26));
    c.font = `700 ${fs2}px sans-serif`;
    c.textBaseline = 'top';
    c.textAlign = 'left';
    if (Lt.name) {
      c.fillStyle = '#ffd93d';
      c.fillText('💡 ' + Lt.name, L.ox + 6, L.oy + 6);
    }
    const nq = nextCue(count, 8);
    if (nq && count >= 0) {
      const left = Math.ceil(nq.at - count - 1e-6);
      c.textAlign = 'center';
      c.fillStyle = nq.kind === 'memo' ? '#7fe0ff' : '#ffb547';
      c.font = `800 ${fs2 * 1.15}px sans-serif`;
      c.fillText(`あと${left}：${nq.name}`, L.ox + L.sw / 2, L.oy + 6);
    }
  }
  return L;
}
function fitCanvas() {
  const wrap = $('#stageWrap'), dpr = window.devicePixelRatio || 1;
  let w, h;
  if (document.body.classList.contains('proj')) {
    w = window.innerWidth;
    h = window.innerHeight;
  }
  else {
    w = wrap.clientWidth;
    const aspect = (S.stage.d + 1.3) / (S.stage.w + 0.6);
    h = Math.round(Math.min(w * aspect, window.innerHeight * 0.58));
  }
  cv.style.height = h + 'px';
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  requestRender();
}
let lastLayout = null;
function render() {
  const dpr = window.devicePixelRatio || 1, w = cv.width / dpr, h = cv.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const editing = isEditable(), k = S.keys[ui.sel];
  lastLayout = drawStage(ctx, w, h, ui.count, {
    view: ui.view, me: ui.me, compare: ui.compare, names: ui.showNames, showPaths: ui.showPaths && !editing,
    ghostPrev: editing && ui.sel > 0 ? ui.sel : 0, selDancer: editing ? ui.selDancer : -1,
  });
  $('#countDisp').textContent = cLabel(ui.count);
  $('#countBig').textContent = document.body.classList.contains('proj') ? cLabel(ui.count) : '';
  const t = S.offset + ui.count * beatSec();
  $('#timeDisp').textContent = t >= 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '';
  renderMeInfo();
  renderTimeline();
  $('#btnPlay').textContent = ui.playing ? '⏸ 停止' : '▶ 再生';
  $('#projPlay').textContent = ui.playing ? '⏸' : '▶';
}
function renderMeInfo() {
  const box = $('#meInfo');
  if (ui.me < 0) {
    box.style.display = 'none';
    return;
  }
  const i = keyIndexAt(ui.count), nk = S.keys[i + 1], pos = positionsAt(S.keys, ui.count)[ui.me];
  box.style.display = 'block';
  box.textContent = '';
  const nameEl = el('b', { text: S.dancers[ui.me].name, style: `color:${S.dancers[ui.me].color}` });
  if (!nk) {
    box.append(nameEl, ` ／ 最後の隊形（${S.keys[i].name}）です`);
    return;
  }
  const dx = nk.pos[ui.me][0] - pos[0], dy = nk.pos[ui.me][1] - pos[1], d = hyp(dx, dy);
  const parts = [];
  if (Math.abs(dx) >= 0.1) parts.push(`${dx > 0 ? '上手' : '下手'}へ${Math.abs(dx).toFixed(1)}m`);
  if (Math.abs(dy) >= 0.1) parts.push(`${dy > 0 ? '後ろ' : '前'}へ${Math.abs(dy).toFixed(1)}m`);
  const ms = Math.max(S.keys[i].at, nk.at - nk.move), moving = ui.count >= ms;
  const when = moving ? '移動中' : `あと${Math.ceil(ms - ui.count)}カウントで移動`;
  box.append(nameEl, ` ／ 次「${nk.name}」（${cLabel(nk.at)}）：${d < 0.1 ? 'その場のまま' : parts.join('・')} ／ ${when}`);
  const extra = [];
  for (let j = i + 1; j <= Math.min(i + 2, S.keys.length - 1) && extra.length < 2; j++) {
    const cr = crossesInto(j).find(x => (x.a === ui.me || x.b === ui.me) && x.count >= ui.count - 0.5);
    if (cr) {
      const other = cr.a === ui.me ? cr.b : cr.a;
      extra.push(`✕ ${cLabel(cr.count)}ごろ ${S.dancers[other].name} とクロス（${cr.front === ui.me ? 'あなたが前' : 'あなたが後ろ'}を通る）`);
    }
  }
  const nq = nextCue(ui.count);
  if (nq) extra.push(`💡 次のきっかけ ${cLabel(nq.at)}「${nq.name}」（あと${Math.ceil(nq.at - ui.count - 1e-6)}カウント）`);
  extra.forEach(t => box.append(el('div', { text: t, style: 'font-size:13px;color:var(--muted)' })));
}
function isEditable() {
  const k = S.keys[ui.sel];
  return !ui.playing && currentTab === 'edit' && k && Math.abs(ui.count - k.at) < 0.01;
}

/* ===== タイムライン ===== */
const tl = $('#timeline'), tctx = tl.getContext('2d');
function renderTimeline() {
  const dpr = window.devicePixelRatio || 1, w = tl.clientWidth, h = tl.clientHeight;
  if (tl.width !== Math.round(w * dpr) || tl.height !== Math.round(h * dpr)) {
    tl.width = Math.round(w * dpr);
    tl.height = Math.round(h * dpr);
  }
  const c = tctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const total = S.totalEights * 8, px = w / total;
  for (let e = 0; e < S.totalEights; e++) {
    c.fillStyle = e % 2 ? '#1d2532' : '#202937';
    c.fillRect(e * 8 * px, 0, 8 * px, h);
    if (S.energy && S.energy[e] != null) {
      const eh = S.energy[e] * (h - 30);
      c.fillStyle = '#3b4f6d';
      c.fillRect(e * 8 * px + 1, h - 4 - eh, 8 * px - 2, eh);
    }
    const step = S.totalEights > 48 ? 8 : S.totalEights > 24 ? 4 : 2;
    if (e % step === 0) {
      c.fillStyle = '#8a96aa';
      c.font = '10px sans-serif';
      c.textAlign = 'left';
      c.textBaseline = 'top';
      c.fillText(String(e + 1), e * 8 * px + 2, 2);
    }
  }
  S.keys.forEach((k, i) => {
    const x = k.at * px, y = 30;
    if (i > 0) {
      const ms = Math.max(S.keys[i - 1].at, k.at - k.move);
      c.strokeStyle = '#ffb547';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(ms * px, y);
      c.lineTo(x, y);
      c.stroke();
    }
    c.fillStyle = i === ui.sel ? '#4fb3ff' : '#e8ecf3';
    c.beginPath();
    c.arc(x, y, i === ui.sel ? 6 : 4.5, 0, 7);
    c.fill();
  });
  (S.cues || []).forEach(q => {
    const x = q.at * px, y = 50, z = q.id === ui.selCue ? 6 : 4.5;
    c.fillStyle = q.kind === 'memo' ? '#7fe0ff' : q.kind === 'black' ? '#000' : q.kind === 'color' ? q.color : '#ffd93d';
    c.beginPath();
    c.moveTo(x, y - z);
    c.lineTo(x + z, y);
    c.lineTo(x, y + z);
    c.lineTo(x - z, y);
    c.closePath();
    c.fill();
    c.strokeStyle = q.id === ui.selCue ? '#4fb3ff' : '#fff8';
    c.lineWidth = 1;
    c.stroke();
  });
  const x = Math.max(0, ui.count) * px;
  c.strokeStyle = '#ff6b6b';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x, 0);
  c.lineTo(x, h);
  c.stroke();
}
function tlSeek(ev) {
  const r = tl.getBoundingClientRect(), total = S.totalEights * 8, c = ((ev.clientX - r.left) / r.width) * total;
  let hit = -1;
  S.keys.forEach((k, i) => {
    if (Math.abs(k.at - c) * r.width / total < 12 && Math.abs(ev.clientY - r.top - 30) < 18) hit = i;
  });
  if (hit >= 0) {
    selectKey(hit);
    return;
  }
  const cq = (S.cues || []).find(q => Math.abs(q.at - c) * r.width / total < 12 && Math.abs(ev.clientY - r.top - 50) < 12);
  if (cq) {
    selectCue(cq.id);
    return;
  }
  setCount(Math.max(0, Math.min(total, Math.round(c))));
  if (!ui.playing) {
    ui.sel = keyIndexAt(ui.count);
    renderKeyChips();
    fillKeyForm();
  }
}
let tlDown = false;
tl.addEventListener('pointerdown', e => {
  tlDown = true;
  tl.setPointerCapture(e.pointerId);
  tlSeek(e);
});
tl.addEventListener('pointermove', e => {
  if (tlDown) {
    const r = tl.getBoundingClientRect();
    setCount(Math.max(0, Math.round(((e.clientX - r.left) / r.width) * S.totalEights * 8)));
  }
});
tl.addEventListener('pointerup', () => { tlDown = false; });

/* ===== 再生 ===== */
function setCount(c) {
  ui.count = c;
  if (audioReady) {
    const t = S.offset + c * beatSec();
    audio.currentTime = Math.max(0, t);
  }
  if (ui.playing) {
    ui.clockT0 = performance.now();
    ui.clockC0 = c;
  }
  requestRender();
}
async function play() {
  if (ui.playing) return;
  if (ui.count >= S.totalEights * 8 - 0.5) setCount(0);
  ui.playing = true;
  ui.clockT0 = performance.now();
  ui.clockC0 = ui.count;
  lastBeat = null;
  if (audioReady) {
    audio.playbackRate = ui.rate;
    const t = S.offset + ui.count * beatSec();
    if (t < 0) { audio.currentTime = 0; } else audio.currentTime = t;
    try { await audio.play(); } catch (e) {
      toast('曲を再生できませんでした。もう一度押してください');
      ui.playing = false;
    }
  }
  try {
    if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { }
  requestRender();
}
function pause() {
  if (!ui.playing) return;
  ui.playing = false;
  if (audioReady) audio.pause();
  try { if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  } } catch (e) { }
  if (ui.recording) stopRecording();
  requestRender();
}
const toggle = () => ui.playing ? pause() : play();
function tick() {
  if (ui.playing) {
    if (audioReady) ui.count = (audio.currentTime - S.offset) / beatSec();
    else ui.count = ui.clockC0 + (performance.now() - ui.clockT0) / 1000 / beatSec() * ui.rate;
    const bi = Math.floor(ui.count);
    if ($('#clickOn').checked && bi >= 0 && lastBeat !== null && bi !== lastBeat) clickSound(bi % 8 === 0);
    lastBeat = bi;
    if (ui.count >= S.totalEights * 8 || (audioReady && audio.ended)) {
      ui.count = Math.min(ui.count, S.totalEights * 8);
      pause();
    }
    if (!isEditable() && currentTab === 'edit') {
      const k = keyIndexAt(ui.count);
      if (k !== ui.sel) {
        ui.sel = k;
        renderKeyChips();
        fillKeyForm();
      }
    }
    needRender = true;
  }
  if (needRender) {
    needRender = false;
    render();
    if (ui.recording) drawRecFrame();
  }
  requestAnimationFrame(tick);
}

/* ===== ステージ上のドラッグ ===== */
function ptr(e) {
  const r = cv.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
cv.addEventListener('pointerdown', e => {
  if (!isEditable()) {
    if (currentTab === 'edit' && !ui.playing) { toast('上の一覧で隊形を選ぶと動かせます'); }
    return;
  }
  const [x, y] = ptr(e), k = S.keys[ui.sel], R = Math.max(8, 0.27 * lastLayout.sc) * 1.6;
  let best = -1, bd = 1e9;
  k.pos.forEach((p, i) => {
    const [sx, sy] = lastLayout.map(p[0], p[1]);
    const d = hyp(sx - x, sy - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  if (best >= 0 && bd < Math.max(R, 22)) {
    pushUndo();
    ui.drag = best;
    ui.selDancer = best;
    cv.setPointerCapture(e.pointerId);
    requestRender();
    e.preventDefault();
  }
  else {
    ui.selDancer = -1;
    requestRender();
  }
});
cv.addEventListener('pointermove', e => {
  if (ui.drag == null) return;
  const [x, y] = ptr(e), k = S.keys[ui.sel];
  let [mx, my] = lastLayout.inv(x, y);
  if ($('#snap').checked) {
    mx = Math.round(mx * 4) / 4;
    my = Math.round(my * 4) / 4;
  }
  const W = S.stage.w, D = S.stage.d;
  mx = Math.min(W / 2, Math.max(-W / 2, mx));
  my = Math.min(D, Math.max(0, my));
  k.pos[ui.drag] = [r2(mx), r2(my)];
  requestRender();
});
const endDrag = () => { if (ui.drag != null) {
  ui.drag = null;
  changed(false);
} };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
