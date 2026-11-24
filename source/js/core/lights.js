// 照明・きっかけの計算
/* ===== 照明 ===== */
const LIGHT_KINDS = { full: '明るく（全体）', color: '色の照明', spot: 'スポット', black: '暗転', memo: '音などのきっかけ' };
function lightTarget(q) {
  if (q.kind === 'color') return { dark: 0.2, tint: q.color, tintA: 0.3, spot: -1 };
  if (q.kind === 'spot') return { dark: 0.8, tint: null, tintA: 0, spot: q.target };
  if (q.kind === 'black') return { dark: 0.94, tint: null, tintA: 0, spot: -1 };
  return { dark: 0, tint: null, tintA: 0, spot: -1 };
}
function lightAt(c) {
  let st = { dark: 0, tint: null, tintA: 0, spot: -1, name: '' };
  for (const q of (S.cues || [])) {
    if (q.kind === 'memo' || q.at > c) continue;
    const t = lightTarget(q), u = q.fade > 0 ? Math.min(1, (c - q.at) / q.fade) : 1;
    const tint = t.tint === st.tint
      ? { tint: t.tint, tintA: st.tintA + (t.tintA - st.tintA) * u }
      : (u < 0.5
        ? { tint: st.tint, tintA: st.tintA * (1 - 2 * u) }
        : { tint: t.tint, tintA: t.tintA * (2 * u - 1) });
    st = { dark: st.dark + (t.dark - st.dark) * u, tint: tint.tint, tintA: tint.tintA, spot: u < 0.5 ? st.spot : t.spot, name: q.name };
  }
  return st;
}
function nextCue(c, within = 1e9) {
  return (S.cues || []).find(q => q.at > c + 1e-6 && q.at - c <= within) || null;
}
