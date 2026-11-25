// ステージの前の縁の文字（客席・上手・下手）。画面・書き出しの画像・動画で共有する
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
