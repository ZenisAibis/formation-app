// 丸の形の描き方（グループの形）。丸・四角・三角・ひし形の道すじを1か所で作る。画面・書き出し・凡例が同じ物を使う
/* ===== 丸の形 ===== */
// c に形の道すじを足す（beginPath は呼ぶ側）。circle は今までと同じ円。r は丸の半径。四角・三角・ひし形は同じくらいの面積に見える大きさ
function tokenPath(c, shape, x, y, r) {
  if (shape === 'square') {
    const h = r * 0.92;
    if (c.roundRect) c.roundRect(x - h, y - h, 2 * h, 2 * h, r * 0.32);
    else c.rect(x - h, y - h, 2 * h, 2 * h); // 古いブラウザでは角丸にしない
  } else if (shape === 'triangle') {
    const R = r * 1.45;
    c.moveTo(x, y - R);
    c.lineTo(x + R * 0.866, y + R * 0.5);
    c.lineTo(x - R * 0.866, y + R * 0.5);
    c.closePath();
  } else if (shape === 'diamond') {
    const R = r * 1.25;
    c.moveTo(x, y - R);
    c.lineTo(x + R, y);
    c.lineTo(x, y + R);
    c.lineTo(x - R, y);
    c.closePath();
  } else {
    c.arc(x, y, r, 0, 7);
  }
}
// 位置を固定した丸の右上に付ける、小さな鍵（色に頼らず形で分かる。丸の色が何色でも読めるよう、白い鍵に黒い縁）
function drawLockMark(c, x, y, r) {
  const s = Math.max(6, r * 0.62), bx = x + r * 0.62, by = y - r * 0.62;
  c.save();
  c.lineWidth = Math.max(2, s * 0.26);
  c.strokeStyle = '#0b0d12';
  c.beginPath();
  c.arc(bx, by - s * 0.15, s * 0.32, Math.PI, 0);
  c.stroke(); // つる（黒い縁）
  c.lineWidth = Math.max(1, s * 0.13);
  c.strokeStyle = THEME.text;
  c.beginPath();
  c.arc(bx, by - s * 0.15, s * 0.32, Math.PI, 0);
  c.stroke(); // つる（白）
  c.fillStyle = THEME.text;
  c.strokeStyle = '#0b0d12';
  c.lineWidth = 1;
  c.fillRect(bx - s * 0.5, by - s * 0.15, s, s * 0.72);
  c.strokeRect(bx - s * 0.5, by - s * 0.15, s, s * 0.72); // 本体
  c.restore();
}
// 形の中に名前を書くときの、縦の位置のずれ（三角は重心が下にある）
const tokenLabelDy = (shape, r) => shape === 'triangle' ? r * 0.3 : 0;
