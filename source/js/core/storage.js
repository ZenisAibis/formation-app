// 見本・読み込みの確かめ・保存
function demoState() {
  const names = ['あおい', 'いつき', 'うた', 'えま', 'おと', 'かい', 'きら', 'くう', 'けい', 'こはる', 'さな', 'しゅん', 'すず', 'せな'];
  const W = 10, D = 6, n = names.length;
  const st = { v: 1, title: '見本：14人のベース', bpm: 120, offset: 0, totalEights: 24, stage: { w: W, d: D },
    dancers: names.map((nm, i) => ({ name: nm, color: PALETTE[i % PALETTE.length] })), keys: [], baseKeys: null, energy: null, cues: [] };
  const cue = (eight, count, kind, name, o = {}) => ({
    id: newId(), at: (eight - 1) * 8 + count - 1, kind, name,
    color: o.color || '#ff3b6b', target: o.target == null ? -1 : o.target, fade: o.fade || 0 });
  st.cues = [
    cue(1, 1, 'full', '明転'),
    cue(8, 5, 'memo', 'ドラムが入る'),
    cue(13, 1, 'color', '赤の照明', { color: '#ff2d55', fade: 2 }),
    cue(17, 1, 'spot', 'スポット', { target: 0, fade: 1 }),
    cue(20, 5, 'black', '暗転', { fade: 2 }),
    cue(21, 1, 'full', '明転')];
  // わざと直すところがある「ベース」
  const line = names.map((_, i) => [(i - (n - 1) / 2) * 0.6, 1.2]);                        // 間隔が狭い横一列
  const grid = names.map((_, i) => [((i % 7) - 3) * 1.2, i < 7 ? 2 : 3.2]);                  // 前後が重なる2列
  const pyr = TEMPLATES['ピラミッド'](n, W, D);
  const vv = TEMPLATES['V字'](n, W, D);
  const circ = TEMPLATES['円'](n, W, D);
  const blk = names.map((_, i) => [((i % 5) - 2) * 0.9 + 1.6, 2 + Math.floor(i / 5) * 0.9]); // 上手に寄った小さい塊
  const mk = (name, eight, move, pos) => ({ id: newId(), name, at: (eight - 1) * 8, move, pos: pos.map(p => [r2(p[0]), r2(p[1])]) });
  let prev = line;
  const seq = [
    ['横一列', 1, 4, line], ['2列', 5, 4, grid], ['ピラミッド', 9, 4, pyr],
    ['V字', 13, 2, vv], ['円', 17, 4, circ], ['かたまり', 21, 4, blk]];
  seq.forEach(([nm, e, m, pos], idx) => {
    const p = idx === 0 || idx === 1 || idx === 5 ? pos : assignSpots(prev, pos);
    st.keys.push(mk(nm, e, m, p));
    prev = p;
  });
  return st;
}
function validState(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.dancers) || !Array.isArray(o.keys) || !o.keys.length) return null;
  const n = o.dancers.length;
  if (n < 1 || n > 40) return null;
  const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;
  const st = {
    v: 1, title: String(o.title || '無題').slice(0, 40), bpm: num(o.bpm, 120, 40, 240), offset: num(o.offset, 0, 0, 600),
    totalEights: Math.round(num(o.totalEights, 24, 1, 400)),
    stage: { w: num(o.stage && o.stage.w, 10, 3, 40), d: num(o.stage && o.stage.d, 6, 2, 30) },
    dancers: o.dancers.map((d, i) => ({
      name: String((d && d.name) || ('No.' + (i + 1))).slice(0, 16),
      color: /^#[0-9a-fA-F]{6}$/.test(d && d.color) ? d.color : PALETTE[i % PALETTE.length] })),
    keys: [], baseKeys: null, energy: Array.isArray(o.energy) ? o.energy.map(x => num(x, 0, 0, 1)) : null };
  const fixKeys = ks => ks.filter(k => k && Array.isArray(k.pos) && k.pos.length === n).map((k, i) => ({
    id: newId(), name: String(k.name || ('隊形' + (i + 1))).slice(0, 20), at: Math.max(0, Math.round(num(k.at, i * 32, 0, 4000))),
    move: Math.round(num(k.move, 4, 1, 64)), pos: k.pos.map(p => [num(p && p[0], 0, -50, 50), num(p && p[1], 0, -50, 50)]) }));
  st.keys = fixKeys(o.keys);
  if (!st.keys.length) return null;
  if (Array.isArray(o.baseKeys)) {
    const b = fixKeys(o.baseKeys);
    st.baseKeys = b.length ? b : null;
  }
  st.keys.sort((a, b) => a.at - b.at);
  st.cues = (Array.isArray(o.cues) ? o.cues : [])
    .filter(q => q && LIGHT_KINDS[q.kind])
    .slice(0, 300)
    .map(q => ({
      id: newId(), at: Math.max(0, Math.round(num(q.at, 0, 0, 4000))), kind: q.kind,
      name: String(q.name || LIGHT_KINDS[q.kind]).slice(0, 20),
      color: /^#[0-9a-fA-F]{6}$/.test(q.color) ? q.color : '#ff3b6b',
      target: Number.isInteger(q.target) && q.target >= 0 && q.target < n ? q.target : -1,
      fade: Math.round(num(q.fade, 0, 0, 32)) }))
    .sort((a, b) => a.at - b.at);
  return st;
}
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* 保存できない環境でも動かす */ }
  }, 300);
}
function load() {
  try {
    const t = localStorage.getItem(LS_KEY);
    if (t) {
      const s = validState(JSON.parse(t));
      if (s) return s;
    }
  } catch (e) { }
  return demoState();
}
