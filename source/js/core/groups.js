// グループ（丸の形で見分ける）：作品の groups［{ id, name, shape }］とダンサーの group（グループの id）。画面に触らない
'use strict';
/* ===== グループ ===== */
// 作品に groups が無い・ダンサーに group が無い＝全員が丸（今までと同じ）。空の入れ物は残さない
const groupById = id => (S.groups || []).find(g => g.id === id) || null;
function dancerGroup(i) {
  const d = S.dancers[i];
  return d && d.group ? groupById(d.group) : null;
}
function dancerShape(i) {
  const g = dancerGroup(i);
  return g ? g.shape : 'circle';
}
const usesGroups = st => !!(st.groups && st.groups.length) || (st.dancers || []).some(d => d && d.group);
// 読み込みの確かめ：知らない形・使えない id・重なった id・9個目以降は、その1件だけ捨てる（作品は断らない）
function cleanGroups(raw) {
  const out = [], seen = new Set();
  if (!Array.isArray(raw)) return out;
  for (const g of raw) {
    if (out.length >= MAX_GROUPS) break;
    if (!g || typeof g !== 'object' || typeof g.id !== 'string' || !/^[A-Za-z0-9_-]{1,16}$/.test(g.id)) continue;
    if (seen.has(g.id) || !GROUP_SHAPE_LIST.includes(g.shape)) continue;
    seen.add(g.id);
    out.push({ id: g.id, name: String(g.name == null ? '' : g.name).trim().slice(0, GROUP_NAME_MAX) || `グループ${out.length + 1}`, shape: g.shape });
  }
  return out;
}
// 新しいグループの id（今ある id と重ならない g1・g2…）と、まだ使っていない形
function nextGroupId() {
  let n = (S.groups || []).length + 1;
  while ((S.groups || []).some(g => g.id === 'g' + n)) n++;
  return 'g' + n;
}
function nextGroupShape() {
  const used = (S.groups || []).map(g => g.shape);
  return ['square', 'triangle', 'diamond', 'circle'].find(s => !used.includes(s)) || 'square';
}
// 画面の凡例の文：「● チームA　■ チームB」（グループが無ければ空）
const groupLegendText = () => (S.groups || []).map(g => `${GROUP_GLYPH[g.shape]} ${g.name}`).join('　');
