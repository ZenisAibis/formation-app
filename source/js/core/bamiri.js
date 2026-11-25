// 上手・下手の向きとバミリ番号の計算（画面に触らない・保存しない）
'use strict';
/* ===== 上手・下手の向き ===== */
// 画面の左右と、正面（客席側の縁）が上か下か。x がプラス＝客席から見て右＝上手（ステージの座標）
// 客席から：正面が下・左が下手・右が上手　／　ダンサー目線（舞台の奥から客席を向く）：正面が上・左が上手・右が下手
function stageSides(view) {
  return view !== 'audience'
    ? { frontAtTop: true, left: '上手', right: '下手' }
    : { frontAtTop: false, left: '下手', right: '上手' };
}

/* ===== バミリ番号 ===== */
// 前の縁の中央を 0 とし、左右へ 1m ごとに 1・2・3…（現場でテープを貼る間隔）。上手・下手は文字で添える
const BAMIRI_STEP_M = 1;
const BAMIRI_MIN_PX = 20; // 番号どうしの画面上の間隔の下限。狭い画面・広いステージでは 2・5・10 個おきにする
const bamiriNum = v => Math.abs(Math.round(v * 100) / 100); // 2.5 → 2.5・2.35 → 2.35（0.01m まで。-0 にしない）
// 前の縁に出す番号：[{ x: ステージの x(m), n: 番号 }]。every 個おき（every は 1・2・5…）
function bamiriTicks(stageW, every = 1) {
  const out = [], half = stageW / 2, max = Math.floor(half / BAMIRI_STEP_M + 1e-9);
  for (let k = -max; k <= max; k++) if (k % every === 0) out.push({ x: k * BAMIRI_STEP_M, n: Math.abs(k) });
  return out;
}
// 1m あたり sc px の画面で、番号を何個おきに出すか
function bamiriEvery(sc) {
  const need = BAMIRI_MIN_PX / (sc * BAMIRI_STEP_M);
  return [1, 2, 5, 10, 20].find(m => m >= need) || 20;
}
// 横の位置の読み：「上手2.5」「下手1」「中央0」
function bamiriX(x) {
  const a = bamiriNum(x);
  return a === 0 ? '中央0' : (x > 0 ? '上手' : '下手') + a;
}
// 立ち位置の読み：「上手2.5・前から2.35m」
const bamiriText = (x, y) => `${bamiriX(x)}・前から${bamiriNum(y)}m`;
