// 戻す・やり直す・変更のあとの描き直し（作品の全部を置き換え、選びを範囲内に直してから描き直す）
let songNoticed = false; // 「曲は読み込んだ物のまま」の知らせは1回だけ
// 曲を読み込む前の作品に戻したとき：曲（analysis・audio）は S の外にあるので、作品の盛り上がりと食い違う
function songMismatch() {
  try { return !!analysis && JSON.stringify(S.energy) !== JSON.stringify(energyPerEight(analysis)); } catch (e) { return false; }
}
function applyHistory(st, msg) {
  S = st;
  ui.drag = null;
  ui.dragMoved = false;
  taps = []; // タップで測る途中の印を解く
  tapPushed = false;
  closeAsk(); // 開いている確認は、置き換えた作品と文が合わなくなるので閉じる
  clampSelection();
  changed(true);
  fillCueForm();
  syncCountToAudio();
  if (ui.count > S.totalEights * 8) setCount(S.totalEights * 8);
  let text = msg;
  if (!songNoticed && songMismatch()) {
    songNoticed = true;
    text += '（曲は読み込んだ物のままです）';
  }
  toast(text);
}
function undo() {
  const st = undoState();
  if (st) applyHistory(st, '1つ前に戻しました');
  else toast('戻せる操作はありません');
}
function redo() {
  const st = redoState();
  if (st) applyHistory(st, 'やり直しました');
  else toast('やり直せる操作はありません');
}
function changed(all) {
  sortKeys();
  save();
  if (all) refreshAll();
  else {
    renderKeyChips();
    renderAdvice();
    renderLockCard(); // クロスの組・固定の一覧は、動かした・反転したあとで変わる
  }
  requestRender();
}
