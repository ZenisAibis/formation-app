// アドバイス（ルールで判定）
/* ===== アドバイス（ルールで判定） ===== */
const TH = { space: 0.8, hideDx: 0.45, hideDy: 0.3, hideFar: 1.5, speed: 1.5, comfy: 1.2, crash: 0.42, margin: 0.25 };
function hiddenOf(pos) {
  const hid = new Set(), pairs = [];
  for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) {
    if (i === j) continue;
    const dyy = pos[j][1] - pos[i][1];
    if (dyy > TH.hideDy && dyy <= TH.hideFar && Math.abs(pos[i][0] - pos[j][0]) < TH.hideDx && !hid.has(j)) {
      hid.add(j);
      pairs.push([i, j]);
    }
  }
  return pairs; // [前の人, 隠れる人]
}
function tightPairs(pos) {
  const out = [];
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++)
    if (hyp(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]) < TH.space) out.push([i, j]);
  return out;
}
function outOf(pos) {
  const W = S.stage.w, D = S.stage.d;
  return pos.map((p, i) => (Math.abs(p[0]) > W / 2 - 0.15 || p[1] < 0.15 || p[1] > D - 0.15) ? i : -1).filter(i => i >= 0);
}
const spreadOf = pos => {
  const cx = pos.reduce((s, p) => s + p[0], 0) / pos.length, cy = pos.reduce((s, p) => s + p[1], 0) / pos.length;
  return Math.sqrt(pos.reduce((s, p) => s + (p[0] - cx) ** 2 + (p[1] - cy) ** 2, 0) / pos.length);
};
// skip＝意図したクロスの組 [[小, 大]…]。この組は「ぶつかり」として数えない
function minPathGap(a, b, skip = []) {
  let best = 1e9, pair = null, at = 0;
  const skipSet = new Set(skip.map(c => c[0] + ',' + c[1]));
  for (let s = 0; s <= 24; s++) {
    const u = s / 24;
    const p = a.map((q, j) => [q[0] + (b[j][0] - q[0]) * u, q[1] + (b[j][1] - q[1]) * u]);
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      if (skipSet.size && skipSet.has(i + ',' + j)) continue;
      const d = hyp(p[i][0] - p[j][0], p[i][1] - p[j][1]);
      if (d < best) {
        best = d;
        pair = [i, j];
        at = u;
      }
    }
  }
  return { d: best, pair, u: at };
}
function keyEnergy(i) {
  if (!S.energy || !S.energy.length) return null;
  const a = S.keys[i].at, b = i + 1 < S.keys.length ? S.keys[i + 1].at : S.totalEights * 8;
  const e0 = Math.floor(a / 8), e1 = Math.max(e0 + 1, Math.ceil(b / 8));
  const xs = S.energy.slice(e0, e1);
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
}
const nm = i => S.dancers[i] ? S.dancers[i].name : '?';
const names = arr => {
  const u = [...new Set(arr)];
  return u.slice(0, 4).map(nm).join('・') + (u.length > 4 ? ` ほか${u.length - 4}人` : '');
};

function analyze() {
  const out = [], K = S.keys, W = S.stage.w;
  const add = (lv, key, msg, fixLabel, fix) => out.push({ lv, key, msg, fixLabel, fix });
  const energies = K.map((_, i) => keyEnergy(i)), spreads = K.map(k => spreadOf(k.pos));
  const eSorted = energies.filter(e => e != null).sort((a, b) => a - b);
  const eHigh = eSorted.length ? eSorted[Math.floor(eSorted.length * 0.7)] : null;
  const sMed = [...spreads].sort((a, b) => a - b)[Math.floor(spreads.length / 2)];
  K.forEach((k, i) => {
    const lk = lockPosOf(k), crossSkip = lockCrossOf(k), pins = assignPins(k);
    // 位置を固定した人が問題の人に含まれるとき、動かさないことを添える
    const lockNote = ids => ids.some(j => lk.includes(j)) ? `（位置を固定している人は動かしません：${names(ids.filter(j => lk.includes(j)))}）` : '';
    const o = outOf(k.pos);
    if (o.length) add(0, i, `${names(o)} がステージの端からはみ出しています。${lockNote(o)}`, '内側に入れる', () => { setPos(k, clampPos(k.pos)); });
    const hid = hiddenOf(k.pos);
    if (hid.length) add(0, i,
      `${names(hid.map(h => h[1]))} がすぐ前の人の真後ろにいて、客席から見えません。前の列と半人分ずらす（千鳥にする）と全員が見えます。${lockNote(hid.flat())}`,
      '千鳥にずらす', () => { setPos(k, fixFormation(k.pos, lk)); });
    const tp = tightPairs(k.pos);
    if (tp.length) add(0, i,
      `${tp.length}組の間隔が${TH.space * 100}cmより狭く、腕を広げるとぶつかります（例：${nm(tp[0][0])}と${nm(tp[0][1])}）。${lockNote(tp.flat())}`,
      '間隔を広げる', () => { setPos(k, fixFormation(k.pos, lk)); });
    const cx = k.pos.reduce((s, p) => s + p[0], 0) / k.pos.length;
    if (Math.abs(cx) > W * 0.12) add(1, i,
      `全体が${cx > 0 ? '上手（客席から見て右）' : '下手（客席から見て左）'}に${Math.abs(cx).toFixed(1)}m寄っています。意図した演出でなければ中央に寄せると見栄えが安定します。`,
      '中央に寄せる', () => { setPos(k, centerPos(k.pos)); });
    if (eHigh != null && energies[i] != null && energies[i] >= eHigh && spreads[i] < sMed * 0.95)
      add(1, i, `曲が盛り上がる所なのに、隊形がこぢんまりしています。ステージを広く使うと迫力が出ます。`, 'ステージ全体に広げる', () => { setPos(k, fixFormation(lockedPos(k, spreadOut(k.pos)), lk)); });
    if (i > 0) {
      const p = K[i - 1], gap = k.at - p.at, nd = neededMove(p.pos, k.pos);
      if (k.move > gap) add(0, i, `移動が${k.move}カウントですが、前の隊形からここまで${gap}カウントしかありません。`, `移動を${gap}カウントにする`, () => { k.move = gap; });
      const dists = p.pos.map((q, j) => hyp(q[0] - k.pos[j][0], q[1] - k.pos[j][1]));
      const maxD = Math.max(...dists), who = dists.indexOf(maxD), v = maxD / (Math.min(k.move, gap) * beatSec());
      if (v > TH.speed) {
        const can = Math.min(gap, nd);
        add(0, i,
          `${nm(who)} は${Math.min(k.move, gap)}カウントで${maxD.toFixed(1)}m動く必要があり、走らないと間に合いません（秒速${v.toFixed(1)}m）。`
          + (nd <= gap
            ? `移動を${nd}カウントにすると歩く速さで間に合います。`
            : '移動を長くしても足りないので、入れ替えで距離を短くするのがおすすめです。'),
          can > k.move ? `移動を${can}カウントにする` : null,
          can > k.move ? () => { k.move = can; } : null);
      }
      const opt = optimalNext(p.pos, k.pos, pins), cur = totalDist(p.pos, k.pos), best = totalDist(p.pos, opt);
      const g = minPathGap(p.pos, k.pos, crossSkip);
      if (g.d < TH.crash) {
        const g2 = minPathGap(p.pos, opt, crossSkip);
        const c = Math.round(k.at - k.move * (1 - g.u));
        add(0, i,
          `移動の途中（${cLabel(c)}ごろ）で ${nm(g.pair[0])} と ${nm(g.pair[1])} がぶつかります。`
          + (g2.d >= TH.crash
            ? '行き先を入れ替えると、ぶつからずに済みます。'
            : '通る道を前後にずらすか、移動のタイミングを1カウントずらしてください。'),
          g2.d >= TH.crash ? '行き先を入れ替える' : null,
          g2.d >= TH.crash ? () => { setPos(k, opt); } : null);
      } else if (cur - best > Math.max(2, cur * 0.15)) {
        add(1, i,
          `行き先を入れ替えると、全員の移動の合計が${cur.toFixed(1)}m → ${best.toFixed(1)}mに減ります（センターや見せ場の人が変わることがあります）。`,
          '行き先を入れ替える', () => { setPos(k, opt); });
      }
      const crsAll = crossesInto(i).filter(x => x.gap >= TH.crash || x.intended);
      const crs = crsAll.filter(x => !x.intended), ics = crsAll.filter(x => x.intended);
      if (crs.length) add(2, i,
        `この移動で${crs.length}組がクロスします（練習で合わせる所）：`
        + crs.slice(0, 4).map(x => `${nm(x.a)}×${nm(x.b)}（${cLabel(x.count)}ごろ、${nm(x.front)}が前）`).join('、')
        + (crs.length > 4 ? ` ほか${crs.length - 4}組` : '') + '。');
      if (ics.length) add(2, i,
        `この移動で${ics.length}組は意図したクロスです（ロック。ぶつかりの警告と行き先の入れ替えの対象から外しています）：`
        + ics.slice(0, 4).map(x => `${nm(x.a)}×${nm(x.b)}（${cLabel(x.count)}ごろ、${nm(x.front)}が前）`).join('、')
        + (ics.length > 4 ? ` ほか${ics.length - 4}組` : '') + '。');
      const md = cur / k.pos.length;
      if (md < 0.3 && gap >= 16) add(2, i, `前の隊形（${p.name}）とほとんど同じ形です。見ている人には変化が伝わりにくいので、形を変えるか、レベル（高さ）や向きで変化を付けると良くなります。`);
    }
    const next = K[i + 1], hold = (next ? next.at - next.move : S.totalEights * 8) - k.at;
    if (hold >= 40) add(2, i, `この隊形のまま${(hold / 8).toFixed(0)}×8カウント止まっています。途中で列の入れ替えや前後の動きを入れると飽きさせません。`);
  });
  if (K.length >= 4) {
    const cnt = {};
    K.forEach(k => {
      let b = -1, bv = 1e9;
      k.pos.forEach((p, j) => {
        const v = Math.abs(p[0]) + 0.5 * p[1];
        if (v < bv) {
          bv = v;
          b = j;
        }
      });
      cnt[b] = (cnt[b] || 0) + 1;
    });
    for (const [j, c] of Object.entries(cnt)) if (c / K.length >= 0.6) add(2, -1,
      `センター（前の真ん中）がほとんど ${nm(+j)} です（${K.length}回中${c}回）。サビごとにセンターを替えると全員が目立ちます。`);
  }
  const last = K[K.length - 1];
  if (last.at < S.totalEights * 8 - 48) add(2, -1,
    `曲の最後の${((S.totalEights * 8 - last.at) / 8).toFixed(0)}×8カウントに新しい隊形がありません。終わりの決めポーズの隊形を入れると締まります。`);
  if (!S.energy) add(2, -1, '曲を読み込むと、盛り上がる所に合わせた広がりのアドバイスも出せます（設定タブ）。');
  return out.sort((a, b) => a.lv - b.lv || a.key - b.key);
}
