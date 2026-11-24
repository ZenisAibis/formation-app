// 隊形の形（テンプレート）
/* ===== 隊形の形（テンプレート） ===== */
function rowsTpl(counts, W, D, stagger) {
  const maxC = Math.max(...counts);
  const s = Math.min(1.4, (W * 0.84) / Math.max(1, maxC - 1 + (stagger ? 0.5 : 0)));
  const nR = counts.length, ry = nR > 1 ? Math.min(1.3, (D * 0.7) / (nR - 1)) : 0;
  const y0 = D / 2 - ry * (nR - 1) / 2, pts = [];
  counts.forEach((c, r) => {
    const off = stagger ? (r % 2 ? s / 4 : -s / 4) : 0;
    for (let j = 0; j < c; j++) pts.push([(j - (c - 1) / 2) * s + off, y0 + r * ry]);
  });
  return pts;
}
function splitRows(n, k) { // n人をk列に、隣の列と人数が1違いになるように
  const base = Math.floor(n / k), rest = n % k, out = [];
  for (let r = 0; r < k; r++) out.push(base);
  // 余りを交互に配る（千鳥になりやすい）
  for (let i = 0, r = 0; i < rest; i++, r += 2) out[r % k]++;
  return out;
}
const TEMPLATES = {
  '2列（千鳥）': (n, W, D) => {
    const a = Math.ceil(n / 2);
    return rowsTpl([a, n - a], W, D, a === n - a);
  },
  '3列（千鳥）': (n, W, D) => rowsTpl(splitRows(n, 3), W, D, false),
  '4列（千鳥）': (n, W, D) => rowsTpl(splitRows(n, 4), W, D, false),
  'ピラミッド': (n, W, D) => {
    const rows = [];
    let k = 2, left = n;
    while (left > 0) {
      const c = Math.min(k, left);
      rows.push(c);
      left -= c;
      k++;
    }
    return rowsTpl(rows, W, D, false);
  },
  '逆ピラミッド': (n, W, D) => {
    const rows = [];
    let k = 2, left = n;
    while (left > 0) {
      const c = Math.min(k, left);
      rows.push(c);
      left -= c;
      k++;
    }
    return rowsTpl(rows.reverse(), W, D, false);
  },
  'V字': (n, W, D) => vTpl(n, W, D, false),
  '逆V字': (n, W, D) => vTpl(n, W, D, true),
  '円': (n, W, D) => {
    const rx = W * 0.36, ry = D * 0.34, pts = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + i * 2 * Math.PI / n;
      pts.push([rx * Math.cos(a), D / 2 - ry * Math.sin(a)]);
    }
    return pts;
  },
  '斜め': (n, W, D) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : .5;
      pts.push([(-0.42 + 0.84 * t) * W, D * (0.18 + 0.64 * t)]);
    }
    return pts;
  },
  '横一列': (n, W, D) => rowsTpl([n], W, D, false),
};
function vTpl(n, W, D, inv) {
  const pts = [], apexY = inv ? D * 0.82 : D * 0.2, endY = inv ? D * 0.2 : D * 0.82, half = W * 0.42;
  if (n % 2) pts.push([0, apexY]);
  const k = Math.floor(n / 2);
  for (let i = 1; i <= k; i++) {
    const t = i / k, y = apexY + (endY - apexY) * t;
    pts.push([-half * t, y], [half * t, y]);
  }
  return pts;
}
