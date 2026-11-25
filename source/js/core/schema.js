// 作品の版：使った項目の最大の版だけを書く（使っていない作品は v=1 のまま。前の版のアプリでも読める）
'use strict';
/* ===== 版の付け方 ===== */
// 作品が使っている新しい項目の名前（FEATURE_V の鍵）。baseKeys の中の使用も数える（前の版は黙って捨てるため）
function usedFeatures(st) {
  const f = [];
  if (usesGroups(st)) f.push('groups');
  if (usesLock(st)) f.push('lock');
  return f;
}
const schemaVOf = st => Math.max(1, ...usedFeatures(st).map(f => FEATURE_V[f]));
// 保存・書き出しの文字列。v は使った項目の最大の版に付け替える（S の v の位置は変えない）。indent は書き出し用
function workJson(st, indent) {
  return JSON.stringify(Object.assign({}, st, { v: schemaVOf(st) }), null, indent);
}
