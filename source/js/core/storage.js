// 見本・読み込みの確かめ・保存
function demoState() {
  const names = ['あおい', 'いつき', 'うた', 'えま', 'おと', 'かい', 'きら', 'くう', 'けい', 'こはる', 'さな', 'しゅん', 'すず', 'せな'];
  const W = 10, D = 6, n = names.length;
  const st = { v: 1, title: '見本：14人のベース', bpm: 120, offset: 0, totalEights: 24, stage: { w: W, d: D },
    dancers: names.map((nm, i) => ({ name: nm, color: PALETTE[i % PALETTE.length] })), keys: [], baseKeys: null, energy: null, cues: [] };
  const cue = (eight, count, kind, name, o = {}) => ({
    id: newId(), at: (eight - 1) * 8 + count - 1, kind, name,
    color: o.color || '#7a5cff', target: o.target == null ? -1 : o.target, fade: o.fade || 0 });
  st.cues = [
    cue(1, 1, 'full', '明転'),
    cue(8, 5, 'memo', 'ドラムが入る'),
    cue(13, 1, 'color', '紫の照明', { color: '#7a5cff', fade: 2 }),
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

/* ===== 読み込みの確かめ ===== */
const isNum = v => typeof v === 'number' && isFinite(v);
const clampNum = (v, d, lo, hi) => isNum(v) ? Math.min(hi, Math.max(lo, v)) : d;
const isColor = c => /^#[0-9a-fA-F]{6}$/.test(c);
const refuse = reason => ({ ok: false, reason });
// 使える作品なら { ok: true, state, dropped, baseRemoved }、断るなら { ok: false, reason } を返す。
// dropped は、人数と座標の数が合わず読み込めなかった隊形（keys）の数。
// baseRemoved は、ベースの隊形に悪い物があって、ベースだけを外したとき true（作品全体は断らない）。
// 断る物：形が違う・人数が範囲外・新しい版（v が SCHEMA_V より大きい）・座標が数でない隊形がある・使える隊形が無い。
function inspectLoad(o) {
  if (!o || typeof o !== 'object') return refuse('形式が違います');
  if (o.v != null && Number(o.v) > SCHEMA_V) return refuse('新しい版のアプリで作った作品です');
  if (!Array.isArray(o.dancers) || !Array.isArray(o.keys) || !o.keys.length) return refuse('形式が違います');
  const n = o.dancers.length;
  if (n < 1 || n > MAX_DANCERS) return refuse(`人数は1〜${MAX_DANCERS}人にしてください`);
  let dropped = 0, badKey = null, baseBad = false;
  const kindOf = k => {
    if (!k || !Array.isArray(k.pos) || k.pos.length !== n) return 'len';
    return k.pos.every(p => Array.isArray(p) && isNum(p[0]) && isNum(p[1])) ? 'ok' : 'num';
  };
  const fixKeys = (ks, isBase) => ks.filter(k => {
    const kind = kindOf(k);
    if (kind === 'ok') return true;
    if (isBase) baseBad = true;
    else if (kind === 'len') dropped++;
    else if (badKey === null) badKey = String((k && k.name) || '名前なし').slice(0, 20);
    return false;
  }).map((k, i) => ({
    id: newId(), name: String(k.name || ('隊形' + (i + 1))).slice(0, 20),
    at: Math.max(0, Math.round(clampNum(k.at, i * 32, 0, 4000))),
    move: Math.round(clampNum(k.move, 4, 1, 64)),
    pos: k.pos.map(p => [clampNum(p[0], 0, -50, 50), clampNum(p[1], 0, -50, 50)]) }));
  const keys = fixKeys(o.keys);
  const base = Array.isArray(o.baseKeys) ? fixKeys(o.baseKeys, true) : [];
  if (badKey !== null) return refuse(`座標が数でない隊形があります（「${badKey}」）`);
  if (!keys.length) return refuse('人数と座標の数が合う隊形がありません');
  const st = {
    v: SCHEMA_V, title: String(o.title || '無題').slice(0, 40), bpm: clampNum(o.bpm, 120, 40, 240),
    offset: clampNum(o.offset, 0, 0, 600), totalEights: Math.round(clampNum(o.totalEights, 24, 1, 400)),
    stage: { w: clampNum(o.stage && o.stage.w, 10, 3, 40), d: clampNum(o.stage && o.stage.d, 6, 2, 30) },
    // dancers は { name, color } の配列。名前だけの文字列の配列なら、その文字列を名前に使う
    dancers: o.dancers.map((d, i) => ({
      name: String((typeof d === 'string' ? d : d && d.name) || ('No.' + (i + 1))).slice(0, 16),
      color: isColor(d && d.color) ? d.color : PALETTE[i % PALETTE.length] })),
    keys: keys.sort((a, b) => a.at - b.at), baseKeys: base.length && !baseBad ? base : null,
    energy: Array.isArray(o.energy) ? o.energy.map(x => clampNum(x, 0, 0, 1)) : null };
  st.cues = (Array.isArray(o.cues) ? o.cues : [])
    .filter(q => q && LIGHT_KINDS[q.kind])
    .slice(0, 300)
    .map(q => ({
      id: newId(), at: Math.max(0, Math.round(clampNum(q.at, 0, 0, 4000))), kind: q.kind,
      name: String(q.name || LIGHT_KINDS[q.kind]).slice(0, 20),
      color: isColor(q.color) ? q.color : '#ff3b6b',
      target: Number.isInteger(q.target) && q.target >= 0 && q.target < n ? q.target : -1,
      fade: Math.round(clampNum(q.fade, 0, 0, 32)) }))
    .sort((a, b) => a.at - b.at);
  return { ok: true, state: st, dropped, baseRemoved: baseBad };
}

/* ===== 保存 ===== */
let saveT = 0, savePending = false, saveWarned = false;
// 保存できなかったときの知らせは画面の側が入れる（core は画面に触らない）
const saveHooks = { onFail: null };
function save() {
  savePending = true;
  clearTimeout(saveT);
  saveT = setTimeout(flushSave, SAVE_DELAY_MS);
}
// 待っている保存をすぐ行う（閉じる・隠れるときにも呼ぶ）。失敗は続けて何度も知らせない
function flushSave() {
  if (!savePending) return;
  clearTimeout(saveT);
  savePending = false;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(S));
    saveWarned = false;
  } catch (e) {
    if (!saveWarned && saveHooks.onFail) saveHooks.onFail(e);
    saveWarned = true;
  }
}

/* ===== 起動のときの読み込みと、読めなかった作品の保管 ===== */
const UNREADABLE_PREFIX = LS_KEY + '.unreadable.';
const UNREADABLE_KEEP = 3; // 保管は3件まで。古い物から捨てる（アプリの中の掃除）
// 読めなかった保存の知らせ。起動のあと画面の側が見て知らせる。{ reason, key, text } か null
let startupProblem = null;
const pad2 = n => String(n).padStart(2, '0');
const stampOf = d => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
  + `-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
// 保管してある、読めなかった作品のキー（古い順）
function unreadableKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(UNREADABLE_PREFIX)) keys.push(k);
    }
  } catch (e) { }
  return keys.sort();
}
// 読めなかった元の文字列を、そのまま別のキーに写す。写したキーを返す（写せなければ null）
function keepUnreadable(text) {
  try {
    const same = unreadableKeys().find(k => localStorage.getItem(k) === text);
    if (same) return same; // 同じ物は増やさない
    const key = UNREADABLE_PREFIX + stampOf(new Date());
    localStorage.setItem(key, text);
    const all = unreadableKeys();
    all.slice(0, Math.max(0, all.length - UNREADABLE_KEEP)).forEach(k => localStorage.removeItem(k));
    return key;
  } catch (e) {
    return null;
  }
}
// 起動のとき。読めたらその作品。読めなければ、元の文字列を保管してから見本を返し、startupProblem に残す。
function load() {
  let text = null;
  try { text = localStorage.getItem(LS_KEY); } catch (e) { }
  if (!text) return demoState();
  let reason, result = null;
  try {
    result = inspectLoad(JSON.parse(text));
    if (result.ok) {
      if (!result.baseRemoved) return result.state;
      reason = 'ベースの隊形を読めなかったので外しました';
    } else {
      reason = result.reason;
    }
  } catch (e) {
    reason = 'JSONとして読めません';
  }
  startupProblem = { reason, key: keepUnreadable(text), text };
  return result && result.ok ? result.state : demoState();
}
