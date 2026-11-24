// 元に戻す
function pushUndo() {
  undoStack.push(JSON.stringify({ keys: S.keys, baseKeys: S.baseKeys, dancers: S.dancers, cues: S.cues }));
  if (undoStack.length > 60) undoStack.shift();
}
