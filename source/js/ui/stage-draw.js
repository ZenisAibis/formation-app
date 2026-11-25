// ステージの描き方（drawStage）。画面・書き出しの画像・動画で共有する
function drawStage(c, w, h, count, o) {
  const L = stageLayout(w, h, o.view), W = S.stage.w, D = S.stage.d, { map, sc } = L;
  c.fillStyle = THEME.bg;
  c.fillRect(0, 0, w, h);
  c.fillStyle = THEME.floor;
  c.fillRect(L.ox, L.oy, L.sw, L.sd);
  { // 床の中央にごく薄いスポット（シアン 5%）
    const gx = L.ox + L.sw / 2, gy = L.oy + L.sd / 2, gr = Math.max(L.sw, L.sd) * 0.65, g = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, withAlpha(THEME.sel, GLOW.spotA));
    g.addColorStop(1, withAlpha(THEME.sel, 0));
    c.fillStyle = g;
    c.fillRect(L.ox, L.oy, L.sw, L.sd);
  }
  c.lineWidth = 1;
  for (let x = Math.ceil(-W / 2); x <= W / 2; x++) {
    const [a, b] = map(x, 0), [, d] = map(x, D);
    c.strokeStyle = x === 0 ? THEME.gridC : THEME.grid;
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(a, d);
    c.stroke();
  }
  for (let y = 1; y < D; y++) {
    const [a, b] = map(-W / 2, y), [e] = map(W / 2, y);
    c.strokeStyle = THEME.grid;
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(e, b);
    c.stroke();
  }
  c.strokeStyle = THEME.edge;
  c.strokeRect(L.ox, L.oy, L.sw, L.sd);
  // 客席側の線と文字
  const [fx1, fy] = map(-W / 2, 0), [fx2] = map(W / 2, 0);
  c.strokeStyle = THEME.audience;
  c.lineWidth = Math.max(2, sc * 0.05);
  c.beginPath();
  c.moveTo(fx1, fy);
  c.lineTo(fx2, fy);
  c.stroke();
  if (o.bamiri !== false) drawFrontRuler(c, L, o.view); // 前の縁のバミリ番号
  drawFrontLabels(c, L, w, o.view, Math.max(11, Math.min(L.lab * 0.55, 22))); // 客席（正面）と、画面の左右の上手・下手
  const pos = positionsAt(S.keys, count), R = Math.max(8, sc * (pos.length > 20 ? 0.31 : 0.35)), n = pos.length;
  const focus = o.selDancer >= 0 ? o.selDancer : o.me; // 光と動線を集める人：選んだ丸（なければ「自分」）
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
  // 編集中：前の隊形から。ふだんは紫の細い線、選んだ人（focus）の線だけシアンで太く光らせ、ほかは薄くする
  if (o.ghostPrev) {
    const prev = S.keys[o.ghostPrev - 1];
    c.lineWidth = 1.5;
    prev.pos.forEach((p, i) => {
      const [x, y] = map(p[0], p[1]), [x2, y2] = map(pos[i][0], pos[i][1]);
      c.globalAlpha = GLOW.ghostA;
      c.fillStyle = S.dancers[i].color;
      c.beginPath();
      c.arc(x, y, R * 0.6, 0, 7);
      c.fill();
      if (i === focus) return;
      c.globalAlpha = focus >= 0 ? GLOW.pathDim : GLOW.pathA;
      c.strokeStyle = THEME.path;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x2, y2);
      c.stroke();
    });
    c.globalAlpha = 1;
    if (focus >= 0 && prev.pos[focus] && pos[focus]) {
      const [x, y] = map(prev.pos[focus][0], prev.pos[focus][1]), [x2, y2] = map(pos[focus][0], pos[focus][1]);
      const len = hyp(x2 - x, y2 - y);
      glow(c, THEME.pathFocus, GLOW.path, () => {
        c.strokeStyle = THEME.pathFocus;
        c.fillStyle = THEME.pathFocus;
        c.lineWidth = 2.6;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x2, y2);
        c.stroke();
        if (len > R * 2.2) { // 矢印は丸の手前に置く
          const ux = (x2 - x) / len, uy = (y2 - y) / len, bx = x2 - ux * (R + 3), by = y2 - uy * (R + 3), hs = 7;
          c.beginPath();
          c.moveTo(bx, by);
          c.lineTo(bx - ux * hs - uy * hs * 0.6, by - uy * hs + ux * hs * 0.6);
          c.lineTo(bx - ux * hs + uy * hs * 0.6, by - uy * hs - ux * hs * 0.6);
          c.closePath();
          c.fill();
        }
      });
    }
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
    const ac = isMe ? THEME.sel : THEME.path;
    c.save();
    if (isMe) {
      c.shadowColor = THEME.sel;
      c.shadowBlur = GLOW.path;
    }
    c.strokeStyle = ac;
    c.globalAlpha = isMe ? 0.95 : GLOW.pathA;
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
    c.fillStyle = ac;
    c.fill();
    if (isMe) {
      c.globalAlpha = 0.5;
      c.beginPath();
      c.arc(x2, y2, R * 1.05, 0, 7);
      c.setLineDash([3, 3]);
      c.stroke();
      c.setLineDash([]);
    }
    c.restore();
    c.globalAlpha = 1;
  });
  // クロスの場所
  const xi = o.ghostPrev ? o.ghostPrev : (nextK && count >= Math.max(S.keys[ki].at, nextK.at - nextK.move) - 8 ? ki + 1 : 0);
  if (xi) crossesInto(xi).forEach(cr => {
    const mine = o.me >= 0 && (cr.a === o.me || cr.b === o.me);
    if (o.me >= 0 && !mine && !o.ghostPrev) return;
    const [x, y] = map(cr.pt[0], cr.pt[1]), z = mine ? 9 : 6;
    c.strokeStyle = THEME.warn;
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
  // ダンサー（選んだ丸を最後＝いちばん上に描く）
  const order = [...Array(n).keys()].sort((a, b) => ((a === o.me) - (b === o.me)) || ((a === o.selDancer) - (b === o.selDancer)));
  order.forEach(i => {
    const [x, y] = map(pos[i][0], pos[i][1]), d = S.dancers[i], isMe = i === o.me, isSel = i === o.selDancer, rr = isMe ? R * 1.35 : R;
    c.globalAlpha = focus >= 0 && !isMe && !isSel ? GLOW.dim : 1;
    if (isSel) { // 選んだ丸：光る輪
      glow(c, THEME.sel, GLOW.sel, () => {
        c.strokeStyle = THEME.sel;
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(x, y, rr + 4, 0, 7);
        c.stroke();
      });
    }
    c.fillStyle = d.color;
    c.beginPath();
    c.arc(x, y, rr, 0, 7);
    c.fill();
    c.lineWidth = isMe ? 3 : 1;
    c.strokeStyle = isMe ? THEME.text : '#0008';
    c.stroke();
    // 名前：丸が小さい（人数が多い）画面では、自分以外は丸の中に書かない（選んだ丸は下の吹き出しで）
    if (o.names && (!o.screen || R >= 11 || isMe)) {
      c.fillStyle = THEME.onToken;
      c.font = `700 ${Math.max(9, rr * 0.78)}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(d.name.slice(0, 2), x, y + 0.5);
    }
    c.globalAlpha = 1;
  });
  if (o.screen && R < 11 && o.selDancer >= 0 && pos[o.selDancer]) { // 小さい丸を選んだとき、名前の吹き出し
    const [x, y] = map(pos[o.selDancer][0], pos[o.selDancer][1]), nm = S.dancers[o.selDancer].name;
    c.font = '700 12px sans-serif';
    const bw = c.measureText(nm).width + 18, by = Math.max(12, y - R - 18);
    c.fillStyle = THEME.panel2;
    c.strokeStyle = THEME.sel;
    c.lineWidth = 1;
    c.beginPath();
    if (c.roundRect) c.roundRect(x - bw / 2, by - 10, bw, 20, 10);
    else c.rect(x - bw / 2, by - 10, bw, 20); // 古いブラウザでは角丸にしない
    c.fill();
    c.stroke();
    c.fillStyle = THEME.text;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(nm, x, by + 0.5);
  }
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
    const rulerTop = o.bamiri !== false ? rulerTopPad(L, o.view) : 0; // ダンサー目線では前の縁（番号）が上なので、その下から書く
    c.font = `700 ${fs2}px sans-serif`;
    c.textBaseline = 'top';
    c.textAlign = 'left';
    if (Lt.name) {
      c.fillStyle = THEME.text;
      c.fillText('💡 ' + Lt.name, L.ox + 6, L.oy + 6 + rulerTop);
    }
    const nq = nextCue(count, 8);
    if (nq && count >= 0) {
      const left = Math.ceil(nq.at - count - 1e-6);
      c.textAlign = 'center';
      c.fillStyle = nq.kind === 'memo' ? '#7fe0ff' : THEME.text;
      c.font = `800 ${fs2 * 1.15}px sans-serif`;
      c.fillText(`あと${left}：${nq.name}`, L.ox + L.sw / 2, L.oy + 6 + rulerTop);
    }
  }
  return L;
}
