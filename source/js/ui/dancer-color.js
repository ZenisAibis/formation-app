// ダンサーの色の選び：既定の10色（PALETTE）の丸ボタンの列から選ぶ。自由な色の入力は入れない
// （赤・暗い色が選べると、案Cの「赤は要修正だけ」と丸の中の濃い字が読めなくなるため）。
// 保存の形は変えない（dancers[i].color はもともと保存している）。古い作品でパレットに無い色の人は、その色のまま出し、選び直せる。
/* ===== 色の選び ===== */
const isInPalette = c => PALETTE.includes(String(c).toLowerCase());
// 1人の色を変える。同じ色なら何もしない。変えるときは1つの元に戻す単位（名前の変更と同じ）
function setDancerColor(i, color) {
  const d = S.dancers[i];
  if (!d || d.color === color) return;
  pushUndo();
  d.color = color;
  save();
  fillSetup();
  syncDancerPalette();
  requestRender();
}
// 色の丸ボタンの列を host に作る。パレットに無い今の色は、先頭に「いまの色」として出す
function fillPalette(host, i) {
  const cur = S.dancers[i].color, list = isInPalette(cur) ? PALETTE : [cur, ...PALETTE];
  host.textContent = '';
  host.dataset.d = String(i);
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', `${S.dancers[i].name} の色を選ぶ`);
  list.forEach((c, n) => {
    const on = c.toLowerCase() === String(cur).toLowerCase(), extra = !isInPalette(c);
    host.append(el('button', {
      type: 'button', class: 'palbtn' + (on ? ' on' : '') + (extra ? ' extra' : ''), style: `background:${c}`,
      'aria-pressed': on ? 'true' : 'false',
      'aria-label': extra ? 'いまの色（パレットに無い色）' : `色 ${n + 1}${on ? '（いま）' : ''}`,
      text: on ? '✓' : '',
      onclick: () => setDancerColor(i, c) }));
  });
}
// 設定の行の色見本を押すと、その下に色の列が開く（もう一度押すと閉じる）。ほかの列は閉じる
function togglePalette(btn, host, i) {
  const open = host.hidden;
  document.querySelectorAll('#dancerList .palrow').forEach(h => { h.hidden = true; });
  document.querySelectorAll('#dancerList .swbtn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  if (!open) return;
  fillPalette(host, i);
  host.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
}
// 丸のカードの色見本：押すとカードの中に色の列が開く。選んでいる人が変わったら閉じる
function syncDancerPalette() {
  const host = $('#cardDancerPal');
  if (!host) return;
  if (host.hidden) return;
  if (ui.card !== 'dancer' || ui.selDancer < 0 || host.dataset.d !== String(ui.selDancer)) {
    host.hidden = true;
    $('#cardDancerSw').setAttribute('aria-expanded', 'false');
    return;
  }
  fillPalette(host, ui.selDancer);
}
$('#cardDancerSw').addEventListener('click', () => {
  const host = $('#cardDancerPal');
  if (ui.selDancer < 0) return;
  host.hidden = !host.hidden;
  $('#cardDancerSw').setAttribute('aria-expanded', host.hidden ? 'false' : 'true');
  if (!host.hidden) fillPalette(host, ui.selDancer);
});
