// 元に戻す・やり直す。単位は作品 S の全部（title・bpm・offset・totalEights・stage・dancers・keys・baseKeys・cues・energy）
let undoStack = [];
let redoStack = [];

// 操作の「前」の作品を積む。新しい操作をしたらやり直しの積みは空にする
function pushUndo() {
  undoStack.push(JSON.stringify(S));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
}
// from の一番上を取り出し、今の作品を to に積む。戻す先の作品を返す（積みが空なら null）
function stepHistory(from, to) {
  const t = from.pop();
  if (!t) return null;
  to.push(JSON.stringify(S));
  if (to.length > UNDO_LIMIT) to.shift();
  return JSON.parse(t);
}
const undoState = () => stepHistory(undoStack, redoStack);
const redoState = () => stepHistory(redoStack, undoStack);
// 作品を置き換えたあと、画面の選びが範囲を外れていたら直す
function clampSelection() {
  const nd = S.dancers.length;
  ui.sel = Math.max(0, Math.min(ui.sel, S.keys.length - 1));
  if (ui.selDancer >= nd) ui.selDancer = -1;
  if (ui.me >= nd) ui.me = -1;
  if (ui.selCue != null && !(S.cues || []).some(q => q.id === ui.selCue)) ui.selCue = null;
}
