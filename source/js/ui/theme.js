// 描画（canvas）の色と光。CSS の変数（styles/tokens.css）から読み、1か所の表 THEME にまとめる
const THEME = {};
// 光の強さ（canvas の shadowBlur ＝ ぼかしの大きさ px）と、薄さ（0〜1）。案Cの値
const GLOW = { sel: 6, path: 2.4, now: 3, ghostA: 0.26, pathA: 0.55, pathDim: 0.28, dim: 0.72, spotA: 0.05 };
function loadTheme() {
  const cs = getComputedStyle(document.documentElement);
  const names = {
    bg: '--bg', panel: '--panel', panel2: '--panel2', floor: '--stage-floor', grid: '--grid', gridC: '--grid-c', edge: '--edge',
    tlA: '--tl-a', tlB: '--tl-b', energy: '--energy', text: '--text', muted: '--muted', onToken: '--on-token',
    sel: '--sel', pathFocus: '--path-focus', now: '--now', path: '--path', audience: '--audience', warn: '--warn' };
  Object.keys(names).forEach(k => { THEME[k] = cs.getPropertyValue(names[k]).trim(); });
}
loadTheme();
// '#rrggbb' に透明度を付けた rgba 文字列（色が '#rrggbb' でないときはそのまま返す）
function withAlpha(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
// 光らせて描く（fn の中の描画に shadowBlur をかける）。光は選んだ物と今の位置だけに使う
function glow(c, color, blur, fn) {
  c.save();
  c.shadowColor = color;
  c.shadowBlur = blur;
  fn();
  c.restore();
}
