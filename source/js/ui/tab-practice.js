// 練習タブ：自分・向き・名前・線
/* ===== 練習タブ ===== */
function fillMeSel() {
  const s = $('#meSel');
  s.textContent = '';
  s.append(el('option', { value: '-1', text: '（選ばない）' }));
  S.dancers.forEach((d, i) => s.append(el('option', { value: String(i), text: d.name })));
  if (ui.me >= S.dancers.length) ui.me = -1;
  s.value = String(ui.me);
}
// 「自分」を選ぶ（練習タブの選択欄と、丸のカードの「この人を自分にする」から）
function setMe(i) {
  ui.me = i;
  try { localStorage.setItem(LS_KEY + '.me', String(ui.me)); } catch (x) { }
  $('#meSel').value = String(ui.me);
  requestRender();
}
$('#meSel').addEventListener('change', e => setMe(parseInt(e.target.value)));
// 向き：分割ボタン（今の向きが押された見た目）
function syncViewUi() {
  document.querySelectorAll('#viewSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === ui.view)));
}
function setView(v) {
  ui.view = v;
  try { localStorage.setItem(LS_KEY + '.view', ui.view); } catch (x) { }
  syncViewUi();
  requestRender();
}
document.querySelectorAll('#viewSeg button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
// 速さ：練習タブの分割ボタンと、再生の列のボタン（押すたびに 0.5→0.75→1→0.5…）
const RATES = [0.5, 0.75, 1];
function syncRateUi() {
  document.querySelectorAll('#rateSeg button').forEach(b => b.setAttribute('aria-pressed', String(parseFloat(b.dataset.rate) === ui.rate)));
  $('#btnRate').textContent = `${ui.rate}倍`;
}
function setRate(r) {
  if (ytActive()) return ytSetRate(r); // 動画の速さは YouTube が決める。変わったかを見てから画面に反映する
  ui.rate = r;
  if (audioReady) audio.playbackRate = ui.rate;
  if (ui.playing) {
    ui.clockT0 = performance.now();
    ui.clockC0 = ui.count;
  }
  syncRateUi();
}
document.querySelectorAll('#rateSeg button').forEach(b => b.addEventListener('click', () => setRate(parseFloat(b.dataset.rate))));
$('#btnRate').addEventListener('click', () => setRate(RATES[(RATES.indexOf(ui.rate) + 1) % RATES.length]));
$('#showNames').addEventListener('change', e => {
  ui.showNames = e.target.checked;
  requestRender();
});
$('#showPaths').addEventListener('change', e => {
  ui.showPaths = e.target.checked;
  requestRender();
});
