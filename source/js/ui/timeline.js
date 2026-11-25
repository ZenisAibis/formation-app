// タイムライン（描く・押す・なぞる）
/* ===== タイムライン ===== */
const tl = $('#timeline'), tctx = tl.getContext('2d');
const TL_KEY_Y = 44, TL_CUE_Y = 66; // 高さ80px のうち、隊形（●）の段と、照明・きっかけ（◆）の段
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
    c.fillStyle = e % 2 ? THEME.tlB : THEME.tlA;
    c.fillRect(e * 8 * px, 0, 8 * px, h);
    if (S.energy && S.energy[e] != null) {
      const eh = S.energy[e] * (h - 40);
      c.fillStyle = THEME.energy;
      c.fillRect(e * 8 * px + 1, h - 3 - eh, 8 * px - 2, eh);
    }
    const step = S.totalEights > 48 ? 8 : S.totalEights > 24 ? 4 : 2;
    if (e % step === 0) {
      c.fillStyle = THEME.muted;
      c.font = '11px sans-serif';
      c.textAlign = 'left';
      c.textBaseline = 'top';
      c.fillText(String(e + 1), e * 8 * px + 3, 3);
    }
  }
  S.keys.forEach((k, i) => {
    const x = Math.max(6, k.at * px), y = TL_KEY_Y;
    if (i > 0) {
      const ms = Math.max(S.keys[i - 1].at, k.at - k.move);
      c.strokeStyle = THEME.path;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(Math.max(6, ms * px), y);
      c.lineTo(x, y);
      c.stroke();
    }
    c.fillStyle = i === ui.sel ? THEME.sel : THEME.text;
    c.beginPath();
    c.arc(x, y, i === ui.sel ? 7 : 5, 0, 7);
    c.fill();
    if (i === ui.sel) {
      c.strokeStyle = THEME.bg;
      c.lineWidth = 2;
      c.stroke();
    }
  });
  (S.cues || []).forEach(q => {
    const x = Math.max(7, q.at * px), y = TL_CUE_Y, z = q.id === ui.selCue ? 7 : 6;
    c.fillStyle = q.kind === 'memo' ? '#7fe0ff' : q.kind === 'black' ? '#000' : q.kind === 'color' ? q.color : q.kind === 'spot' ? '#ffffff' : '#ffd93d';
    c.beginPath();
    c.moveTo(x, y - z);
    c.lineTo(x + z, y);
    c.lineTo(x, y + z);
    c.lineTo(x - z, y);
    c.closePath();
    c.fill();
    c.strokeStyle = q.id === ui.selCue ? THEME.sel : 'rgba(255,255,255,.55)';
    c.lineWidth = q.id === ui.selCue ? 2.5 : 1;
    c.stroke();
  });
  const x = Math.max(1, Math.max(0, ui.count) * px);
  glow(c, THEME.now, GLOW.now, () => { // 今（再生位置）の線と頭の三角：要修正の赤とは別の、シアン
    c.strokeStyle = THEME.now;
    c.fillStyle = THEME.now;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
    c.beginPath();
    c.moveTo(x - 5, 0);
    c.lineTo(x + 5, 0);
    c.lineTo(x, 7);
    c.closePath();
    c.fill();
  });
}
function tlSeek(ev) {
  const r = tl.getBoundingClientRect(), total = S.totalEights * 8, c = ((ev.clientX - r.left) / r.width) * total;
  let hit = -1;
  S.keys.forEach((k, i) => {
    if (Math.abs(k.at - c) * r.width / total < 12 && Math.abs(ev.clientY - r.top - TL_KEY_Y) < 18) hit = i;
  });
  if (hit >= 0) {
    selectKey(hit);
    return;
  }
  const cq = (S.cues || []).find(q => Math.abs(q.at - c) * r.width / total < 12 && Math.abs(ev.clientY - r.top - TL_CUE_Y) < 12);
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
