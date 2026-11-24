// アドバイスの直し方
/* 直し方 */
function clampPos(pos) {
  const W = S.stage.w, D = S.stage.d, m = 0.3;
  return pos.map(p => [r2(Math.min(W / 2 - m, Math.max(-W / 2 + m, p[0]))), r2(Math.min(D - m, Math.max(m, p[1])))]);
}
function relax(pos0) {
  const W = S.stage.w, D = S.stage.d, m = 0.3, DMIN = 0.95, OCC = 0.58, n = pos0.length;
  const p = clampPos(pos0).map(a => [a[0], a[1]]), anchor = p.map(a => [a[0], a[1]]);
  for (let it = 0; it < 500; it++) {
    const g = p.map(() => [0, 0]);
    for (let i = 0; i < n; i++) {
      g[i][0] += 0.04 * (anchor[i][0] - p[i][0]);
      g[i][1] += 0.04 * (anchor[i][1] - p[i][1]);
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1], d = hyp(dx, dy);
      if (d < DMIN) {
        let ux, uy;
        if (d < 1e-6) {
          ux = (i + j) % 2 ? 1 : -1;
          uy = 0;
        } else {
          ux = dx / d;
          uy = dy / d;
        }
        const f = (DMIN - d) * 0.5;
        g[i][0] -= ux * f;
        g[i][1] -= uy * f;
        g[j][0] += ux * f;
        g[j][1] += uy * f;
      }
      if (Math.abs(dy) > TH.hideDy - 0.05 && Math.abs(dy) < TH.hideFar + 0.1 && Math.abs(dx) < OCC) {
        const sx = Math.abs(dx) < 1e-6 ? ((i + j) % 2 ? 1 : -1) : Math.sign(dx), f = (OCC - Math.abs(dx)) * 0.5;
        g[i][0] -= sx * f;
        g[j][0] += sx * f;
      }
    }
    for (let i = 0; i < n; i++) {
      p[i][0] = Math.min(W / 2 - m, Math.max(-W / 2 + m, p[i][0] + g[i][0] * 0.6));
      p[i][1] = Math.min(D - m, Math.max(m, p[i][1] + g[i][1] * 0.6));
    }
  }
  return p.map(a => [r2(a[0]), r2(a[1])]);
}
function groupRows(pos) {
  const idx = pos.map((_, i) => i).sort((a, b) => pos[a][1] - pos[b][1]), rows = [];
  idx.forEach(i => {
    const r = rows[rows.length - 1];
    if (r && pos[i][1] - pos[r[0]][1] < TH.hideDy) r.push(i);
    else rows.push([i]);
  });
  return rows;
}
function zigzag(pos) { // 1列に入りきらない列を互い違いにする
  const W = S.stage.w, D = S.stage.d, p = pos.map(a => [a[0], a[1]]);
  groupRows(p).forEach(r => {
    if (r.length < 3 || (r.length - 1) * 0.95 <= W - 0.6) return;
    const s = r.slice().sort((a, b) => p[a][0] - p[b][0]), span = W - 0.8;
    const y0 = Math.min(D - 0.75, Math.max(0.75, p[r[0]][1]));
    s.forEach((i, k) => {
      p[i][0] = -span / 2 + span * k / (s.length - 1);
      p[i][1] = y0 + (k % 2 ? 0.45 : -0.45);
    });
  });
  return p;
}
function staggerRows(pos) { // 後ろの列を横にずらして、すぐ前の人と重ならないようにする
  const W = S.stage.w, p = pos.map(a => [a[0], a[1]]), rows = groupRows(p);
  for (let r = 1; r < rows.length; r++) {
    const front = rows.slice(0, r).flat();
    let best = 0, bs = 1e9;
    for (let d = -0.8; d <= 0.801; d += 0.05) {
      let sc = Math.abs(d);
      for (const i of rows[r]) {
        const x = p[i][0] + d;
        if (Math.abs(x) > W / 2 - 0.3) sc += 100;
        for (const j of front) {
          const dy = p[i][1] - p[j][1];
          if (dy > TH.hideDy && dy <= TH.hideFar && Math.abs(x - p[j][0]) < 0.6) sc += 10;
        }
      }
      if (sc < bs) {
        bs = sc;
        best = d;
      }
    }
    rows[r].forEach(i => { p[i][0] += best; });
  }
  return p;
}
const fixFormation = pos => relax(staggerRows(zigzag(pos)));
function spreadOut(pos) {
  const W = S.stage.w, D = S.stage.d, cy = D / 2;
  const cx = pos.reduce((s, p) => s + p[0], 0) / pos.length;
  const mx = Math.max(...pos.map(p => Math.abs(p[0] - cx)), 0.1), my = Math.max(...pos.map(p => Math.abs(p[1] - cy)), 0.1);
  const f = Math.max(1, Math.min(1.5, (W / 2 - 0.5) / mx, (D / 2 - 0.5) / my));
  return clampPos(pos.map(p => [(p[0] - cx) * f, cy + (p[1] - cy) * f]));
}
const centerPos = pos => {
  const cx = pos.reduce((s, p) => s + p[0], 0) / pos.length;
  return clampPos(pos.map(p => [p[0] - cx, p[1]]));
};
function optimalNext(prev, next) {
  const cost = prev.map(a => next.map(b => hyp(a[0] - b[0], a[1] - b[1])));
  const ans = hungarian(cost);
  return prev.map((_, i) => [next[ans[i]][0], next[ans[i]][1]]);
}
function neededMove(prev, next) {
  const maxD = Math.max(...prev.map((p, j) => hyp(p[0] - next[j][0], p[1] - next[j][1])));
  return Math.max(1, Math.ceil(maxD / TH.comfy / beatSec()));
}
