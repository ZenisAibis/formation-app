// 上手・下手の向きの計算（画面に触らない・保存しない）
'use strict';
/* ===== 上手・下手の向き ===== */
// 画面の左右と、正面（客席側の縁）が上か下か。x がプラス＝客席から見て右＝上手（ステージの座標）
// 客席から：正面が下・左が下手・右が上手　／　ダンサー目線（舞台の奥から客席を向く）：正面が上・左が上手・右が下手
function stageSides(view) {
  return view !== 'audience'
    ? { frontAtTop: true, left: '上手', right: '下手' }
    : { frontAtTop: false, left: '下手', right: '上手' };
}
