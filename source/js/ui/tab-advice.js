// アドバイスタブ：点検の表示・直す・ベース・自動で直す
/* ===== アドバイスタブ ===== */
function renderAdvice() {
  const list = $('#advList'), adv = analyze();
  list.textContent = '';
  const c = [0, 0, 0];
  adv.forEach(a => c[a.lv]++);
  const sm = $('#advSummary');
  sm.textContent = '';
  sm.append(
    el('span', { class: 'pill p0' }, [el('b', { text: String(c[0]) }), ' 要修正']),
    el('span', { class: 'pill p1' }, [el('b', { text: String(c[1]) }), ' 提案']),
    el('span', { class: 'pill p2' }, [el('b', { text: String(c[2]) }), ' 参考']));
  const badge = $('#advBadge');
  badge.textContent = `▲${c[0]}`;
  badge.hidden = c[0] === 0;
  badge.setAttribute('aria-label', `要修正${c[0]}件`);
  if (S.baseKeys) sm.append(el('span', { class: 'muted', text: '（ベースを保存済み）' }));
  if (!adv.length) list.append(el('div', { class: 'card', text: '気になる所は見つかりませんでした。完成形です。' }));
  adv.forEach(a => {
    const where = a.key >= 0 ? el('span', { class: 'where', text: `${cLabel(S.keys[a.key].at)} ${S.keys[a.key].name}`, onclick: () => {
      switchTab('edit');
      selectKey(a.key);
    } }) : null;
    const body = el('div', { class: 'body' }, [where ? el('div', {}, [where]) : null, el('div', { text: a.msg })]);
    const row = el('div', { class: 'adv l' + a.lv }, [el('span', { class: 'tag', text: ['要修正', '提案', '参考'][a.lv] }), body]);
    if (a.fix) row.append(el('button', { class: 'small', text: a.fixLabel, onclick: () => {
      pushUndo();
      if (!S.baseKeys) S.baseKeys = clone(S.keys);
      a.fix();
      changed(true);
      toast('直しました（元に戻すで戻せます）');
    } }));
    list.append(row);
  });
}
$('#btnImprove').addEventListener('click', autoImprove);
$('#compare').addEventListener('change', e => {
  ui.compare = e.target.checked;
  if (ui.compare && !S.baseKeys) toast('まだ改善していないので、ベースはありません');
  requestRender();
});
$('#btnRestoreBase').addEventListener('click', () => {
  if (!S.baseKeys) {
    toast('ベースは保存されていません');
    return;
  }
  pushUndo();
  S.keys = clone(S.baseKeys);
  ui.sel = 0;
  changed(true);
  toast('ベースに戻しました');
});
$('#btnSetBase').addEventListener('click', () => {
  pushUndo();
  S.baseKeys = clone(S.keys);
  changed(true);
  toast('今の形をベースとして保存しました');
});
$('#btnAiText').addEventListener('click', async () => {
  const adv = analyze(), L = [];
  L.push(`ダンスのフォーメーションについて、振付の観点で改善案をください。`, `作品：${S.title} ／ ${S.dancers.length}人 ／ ステージ 横${S.stage.w}m×奥行${S.stage.d}m ／ BPM ${S.bpm} ／ 長さ ${S.totalEights}×8カウント`,
    `座標：x はステージ中央が0で、客席から見て右（上手）がプラス。y は客席側の端が0で、奥へ行くほど大きい（単位 m）。`, '');
  S.keys.forEach(k => {
    L.push(`■ ${cLabel(k.at)}「${k.name}」（移動 ${k.move}カウント）`);
    L.push(k.pos.map((p, i) => `${S.dancers[i].name}(${p[0].toFixed(1)},${p[1].toFixed(1)})`).join(' '));
  });
  if (S.cues && S.cues.length) L.push('',
    '照明・きっかけ：' + S.cues.map(q => `${cLabel(q.at)} ${LIGHT_KINDS[q.kind]}「${q.name}」`
      + `${q.kind === 'spot' && q.target >= 0 ? '→' + S.dancers[q.target].name : ''}${q.fade ? `（フェード${q.fade}）` : ''}`).join(' ／ '));
  if (S.energy) L.push('', '曲の盛り上がり（8カウントごと、0〜1）：' + S.energy.map(e => e.toFixed(2)).join(' '));
  L.push('', 'アプリが自動で見つけた点：');
  adv.forEach(a => L.push(`- [${['要修正', '提案', '参考'][a.lv]}] ${a.key >= 0 ? cLabel(S.keys[a.key].at) + ' ' : ''}${a.msg}`));
  L.push('', '見せ方・流れ・センターの使い方などの意見と、直した後の座標を同じ書き方で返してください。');
  const txt = L.join('\n');
  try {
    await navigator.clipboard.writeText(txt);
    toast('コピーしました。Claude や ChatGPT に貼り付けてください');
  }
  catch (e) {
    $('#pasteJson').value = txt;
    switchTab('setup');
    toast('自動でコピーできなかったので、設定タブの入力欄に入れました');
  }
});
$('#allowSwap').addEventListener('change', () => { });

function autoImprove() {
  const before = analyze();
  const nb = before.filter(a => a.lv === 0).length, ns = before.filter(a => a.lv === 1).length;
  pushUndo();
  if (!S.baseKeys) S.baseKeys = clone(S.keys);
  const allowSwap = $('#allowSwap').checked;
  const energies = S.keys.map((_, i) => keyEnergy(i)), eS = energies.filter(e => e != null).sort((a, b) => a - b);
  const eHigh = eS.length ? eS[Math.floor(eS.length * 0.7)] : null;
  const sMed = [...S.keys.map(k => spreadOf(k.pos))].sort((a, b) => a - b)[Math.floor(S.keys.length / 2)];
  S.keys.forEach((k, i) => {
    setPos(k, clampPos(k.pos)); // 位置を固定した人は、どの段でも動かさない（setPos が元の座標に戻す）
    const cx = k.pos.reduce((s, p) => s + p[0], 0) / k.pos.length;
    if (Math.abs(cx) > S.stage.w * 0.12) setPos(k, centerPos(k.pos));
    if (eHigh != null && energies[i] != null && energies[i] >= eHigh && spreadOf(k.pos) < sMed * 0.95) setPos(k, spreadOut(k.pos));
    setPos(k, fixFormation(k.pos, lockPosOf(k)));
  });
  for (let i = 1; i < S.keys.length; i++) {
    const p = S.keys[i - 1], k = S.keys[i], gap = k.at - p.at, skip = lockCrossOf(k);
    if (allowSwap) {
      const opt = optimalNext(p.pos, k.pos, assignPins(k)), cur = totalDist(p.pos, k.pos), best = totalDist(p.pos, opt);
      const crash = minPathGap(p.pos, k.pos, skip).d < TH.crash, crash2 = minPathGap(p.pos, opt, skip).d < TH.crash;
      if ((crash && !crash2) || cur - best > Math.max(2, cur * 0.15)) setPos(k, opt);
    }
    if (k.move > gap) k.move = gap;
    const v = Math.max(...p.pos.map((q, j) => hyp(q[0] - k.pos[j][0], q[1] - k.pos[j][1]))) / (k.move * beatSec());
    if (v > TH.speed) k.move = Math.min(gap, Math.max(k.move, neededMove(p.pos, k.pos)));
  }
  changed(true);
  const after = analyze();
  const na = after.filter(a => a.lv === 0).length, sa = after.filter(a => a.lv === 1).length;
  toast(`要修正 ${nb}→${na}件、提案 ${ns}→${sa}件になりました。気に入らなければ「元に戻す」で戻せます。`, 4200);
}
