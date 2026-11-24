// 作品の状態 S・画面の選び ui・カウントの表示
let S = null;
const ui = { sel: 0, selDancer: -1, me: -1, view: 'audience', compare: false, playing: false, count: 0,
  rate: 1, selCue: null, clockT0: 0, clockC0: 0, showNames: true, showPaths: false, drag: null, dragMoved: false,
  recording: false };

const beatSec = () => 60 / S.bpm;
const cLabel = c => {
  if (c < 0) return '準備';
  const i = Math.floor(c + 1e-6);
  return `${Math.floor(i / 8) + 1}-${i % 8 + 1}`;
};

/* ===== 状態・保存 ===== */
let idSeq = 1;
const newId = () => 'k' + Date.now().toString(36) + (idSeq++);
