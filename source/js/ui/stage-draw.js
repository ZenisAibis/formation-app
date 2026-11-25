// ステージの描き方（drawStage）。画面・書き出しの画像・動画で共有する
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
