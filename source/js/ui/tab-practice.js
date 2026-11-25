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
$('#meSel').addEventListener('change', e => {
  ui.me = parseInt(e.target.value);
  try { localStorage.setItem(LS_KEY + '.me', String(ui.me)); } catch (x) { }
  requestRender();
});
$('#viewSel').addEventListener('change', e => {
  ui.view = e.target.value;
  try { localStorage.setItem(LS_KEY + '.view', ui.view); } catch (x) { }
  requestRender();
});
$('#showNames').addEventListener('change', e => {
  ui.showNames = e.target.checked;
  requestRender();
});
$('#showPaths').addEventListener('change', e => {
  ui.showPaths = e.target.checked;
  requestRender();
});
