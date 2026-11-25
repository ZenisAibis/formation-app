// タイムライン（描く・押す・なぞる）
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
    c.fillStyle = e % 2 ? THEME.tlB : THEME.tlA;
    c.fillRect(e * 8 * px, 0, 8 * px, h);
    if (S.energy && S.energy[e] != null) {
      const eh = S.energy[e] * (h - 30);
      c.fillStyle = THEME.energy;
      c.fillRect(e * 8 * px + 1, h - 4 - eh, 8 * px - 2, eh);
    }
    const step = S.totalEights > 48 ? 8 : S.totalEights > 24 ? 4 : 2;
    if (e % step === 0) {
      c.fillStyle = THEME.muted;
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
      c.strokeStyle = THEME.path;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(ms * px, y);
      c.lineTo(x, y);
      c.stroke();
    }
    c.fillStyle = i === ui.sel ? THEME.sel : THEME.text;
    c.beginPath();
    c.arc(x, y, i === ui.sel ? 6 : 4.5, 0, 7);
    c.fill();
    if (i === ui.sel) {
      c.strokeStyle = THEME.bg;
      c.lineWidth = 2;
      c.stroke();
    }
  });
  (S.cues || []).forEach(q => {
    const x = q.at * px, y = 50, z = q.id === ui.selCue ? 6 : 4.5;
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
  const x = Math.max(0, ui.count) * px;
  glow(c, THEME.now, GLOW.now, () => { // 今（再生位置）の線：要修正の赤とは別の、シアン
    c.strokeStyle = THEME.now;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  });
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
