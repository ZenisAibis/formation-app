// 時間と位置・クロス・割り当て（計算だけ）
/* ===== クロス（移動の道が交わる所） ===== */
function segX(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const s = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t <= 0.02 || t >= 0.98 || s <= 0.02 || s >= 0.98) return null;
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}
function crossesInto(i) { // 隊形 i-1 → i の移動で起きるクロス
  if (i <= 0 || i >= S.keys.length) return [];
  const a = S.keys[i - 1], k = S.keys[i], ms = Math.max(a.at, k.at - k.move), dur = k.at - ms, out = [];
  for (let x = 0; x < k.pos.length; x++) for (let y = x + 1; y < k.pos.length; y++) {
    const pt = segX(a.pos[x], k.pos[x], a.pos[y], k.pos[y]);
    if (!pt) continue;
    let bt = 0, bd = 1e9, front = x;
    for (let s = 0; s <= 32; s++) {
      const t = s / 32, u = ease(t);
      const px = [a.pos[x][0] + (k.pos[x][0] - a.pos[x][0]) * u, a.pos[x][1] + (k.pos[x][1] - a.pos[x][1]) * u];
      const py = [a.pos[y][0] + (k.pos[y][0] - a.pos[y][0]) * u, a.pos[y][1] + (k.pos[y][1] - a.pos[y][1]) * u];
      const d = hyp(px[0] - py[0], px[1] - py[1]);
      if (d < bd) {
        bd = d;
        bt = t;
        front = px[1] <= py[1] ? x : y;
      }
    }
    out.push({ a: x, b: y, pt, count: ms + bt * dur, front, gap: bd });
  }
  return out.sort((p, q) => p.count - q.count);
}

/* ===== 割り当て（ハンガリー法） ===== */
function hungarian(cost) {
  const n = cost.length, INF = 1e18;
  const u = Array(n + 1).fill(0), v = Array(n + 1).fill(0), p = Array(n + 1).fill(0), way = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(INF), used = Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const ans = Array(n);
  for (let j = 1; j <= n; j++) ans[p[j] - 1] = j - 1;
  return ans;
}
function assignSpots(from, spots) {
  const cost = from.map(a => spots.map(b => hyp(a[0] - b[0], a[1] - b[1])));
  const ans = hungarian(cost);
  return from.map((_, i) => [spots[ans[i]][0], spots[ans[i]][1]]);
}

const totalDist = (a, b) => a.reduce((s, p, i) => s + hyp(p[0] - b[i][0], p[1] - b[i][1]), 0);

/* ===== 時間と位置 ===== */
function sortKeys() {
  const id = S.keys[ui.sel] && S.keys[ui.sel].id;
  S.keys.sort((a, b) => a.at - b.at);
  const i = S.keys.findIndex(k => k.id === id);
  ui.sel = i < 0 ? 0 : i;
}
const ease = u => u * u * (3 - 2 * u);
function positionsAt(keys, c) {
  if (!keys.length) return [];
  if (c <= keys[0].at) return keys[0].pos;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (c < b.at) {
      const ms = Math.max(a.at, b.at - b.move);
      if (c < ms) return a.pos;
      const u = ease(Math.min(1, (c - ms) / Math.max(1e-6, b.at - ms)));
      return a.pos.map((p, j) => [p[0] + (b.pos[j][0] - p[0]) * u, p[1] + (b.pos[j][1] - p[1]) * u]);
    }
  }
  return keys[keys.length - 1].pos;
}
const keyIndexAt = c => {
  let k = 0;
  S.keys.forEach((x, i) => { if (x.at <= c + 1e-6) k = i; });
  return k;
};
