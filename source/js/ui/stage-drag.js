// ステージ上の丸のドラッグ
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
    ui.selDancer = best;
    setCard('dancer'); // 選んだ丸のカードを出す
    if (isLockedPos(k, best)) { // ロック中の丸は動かさない（選ぶだけ。カードで外すと動かせる）
      toast('ロック中です。丸のカードの「ロックを外す」で動かせます', 3200);
      requestRender();
      e.preventDefault();
      return;
    }
    // 押しただけでは履歴に積まない（実際に動いた最初の時に1回だけ積む。下の pointermove）
    ui.drag = best;
    ui.dragMoved = false;
    cv.setPointerCapture(e.pointerId);
    requestRender();
    e.preventDefault();
  } else {
    const cr = crossHitAt(x, y); // ステージの × を押すと、意図したクロスの印を付け外し
    if (cr) {
      toggleCrossIntent(cr.a, cr.b);
      e.preventDefault();
      return;
    }
    ui.selDancer = -1;
    if (ui.card === 'dancer') setCard(null);
    requestRender();
  }
});
cv.addEventListener('pointermove', e => {
  if (ui.drag == null) return;
  const [x, y] = ptr(e), k = S.keys[ui.sel];
  if (isLockedPos(k, ui.drag)) return; // ロック中の丸は動かさない
  let [mx, my] = lastLayout.inv(x, y);
  if ($('#snap').checked) {
    mx = Math.round(mx * 4) / 4;
    my = Math.round(my * 4) / 4;
  }
  const W = S.stage.w, D = S.stage.d;
  mx = Math.min(W / 2, Math.max(-W / 2, mx));
  my = Math.min(D, Math.max(0, my));
  const to = [r2(mx), r2(my)], cur = k.pos[ui.drag];
  if (to[0] === cur[0] && to[1] === cur[1]) return; // 位置が変わらない動きは何もしない
  if (!ui.dragMoved) {
    pushUndo(); // 動かす前の作品を、ドラッグ1回につき1回だけ積む
    ui.dragMoved = true;
  }
  k.pos[ui.drag] = to;
  requestRender();
});
const endDrag = () => {
  if (ui.drag == null) return;
  const moved = ui.dragMoved;
  ui.drag = null;
  ui.dragMoved = false;
  if (moved) changed(false);
};
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
