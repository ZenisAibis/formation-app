// ステージの前の縁のバミリ番号（中央0・左右に1m ごと）。画面・書き出しの画像・動画で共有する
// 番号の字の大きさ（px）と、ダンサー目線（前の縁が上）のとき、照明・きっかけの文字を下げる高さ
const rulerFont = L => Math.max(9, Math.min(L.sc * 0.36, 15));
const rulerTopPad = (L, view) => (stageSides(view).frontAtTop ? rulerFont(L) + 8 : 0);
function drawFrontRuler(c, L, view) {
  const every = bamiriEvery(L.sc), top = stageSides(view).frontAtTop, [, fy] = L.map(0, 0);
  c.save();
  c.font = `600 ${rulerFont(L)}px sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = top ? 'top' : 'bottom';
  c.globalAlpha = 0.85;
  bamiriTicks(S.stage.w, every).forEach(t => {
    const [x] = L.map(t.x, 0);
    c.fillStyle = t.n === 0 ? THEME.text : THEME.muted;
    c.fillText(String(t.n), x, top ? fy + 4 : fy - 4); // 縁の内側に書く
  });
  c.restore();
}
// 前の縁の左右の「上手」「下手」（今の向きの画面の左右に合わせる）と、客席（正面）
function drawFrontLabels(c, L, w, view, fs) {
  const sd = stageSides(view), [, fy] = L.map(0, 0), ly = sd.frontAtTop ? fy - L.lab * 0.55 : fy + L.lab * 0.55, pad = L.sc * 0.1;
  c.font = `700 ${fs}px sans-serif`;
  c.fillStyle = THEME.audience;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('客席（正面）', w / 2, ly);
  c.font = `${fs * 0.8}px sans-serif`;
  c.fillStyle = THEME.muted;
  c.textAlign = 'left';
  c.fillText(sd.left, L.ox + pad, ly);
  c.textAlign = 'right';
  c.fillText(sd.right, L.ox + L.sw - pad, ly);
}
