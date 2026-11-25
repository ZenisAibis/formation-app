// ステージの大きさ合わせ・1コマの描き直し・「自分」の案内文
function fitCanvas() {
  const wrap = $('#stageWrap'), dpr = window.devicePixelRatio || 1;
  let w, h;
  if (document.body.classList.contains('proj')) {
    w = window.innerWidth;
    h = window.innerHeight;
  }
  else {
    w = wrap.clientWidth;
    const aspect = (S.stage.d + 1.3) / (S.stage.w + 0.6);
    h = Math.round(Math.min(w * aspect, window.innerHeight * 0.58));
  }
  cv.style.height = h + 'px';
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  requestRender();
}
let lastLayout = null;
const beatEls = $('#beats').children;
let legendText = '';
function render() {
  const dpr = window.devicePixelRatio || 1, w = cv.width / dpr, h = cv.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const editing = isEditable(), k = S.keys[ui.sel];
  lastLayout = drawStage(ctx, w, h, ui.count, {
    view: ui.view, me: ui.me, compare: ui.compare, names: ui.showNames, showPaths: ui.showPaths && !editing, bamiri: ui.showBamiri,
    ghostPrev: editing && ui.sel > 0 ? ui.sel : 0, selDancer: editing ? ui.selDancer : -1, screen: true,
  });
  $('#countDisp').textContent = cLabel(ui.count);
  $('#countBig').textContent = document.body.classList.contains('proj') ? cLabel(ui.count) : '';
  const t = S.offset + ui.count * beatSec();
  const bi = ui.count >= 0 ? Math.floor(ui.count + 1e-6) % 8 : -1; // 今の拍の点（8つのうち1つだけ光る）
  for (let i = 0; i < beatEls.length; i++) beatEls[i].classList.toggle('on', i === bi);
  const lg = (S.groups && S.groups.length ? groupLegendText() + '　' : '') + '薄い丸と線＝前の隊形からの動き　× ＝クロス' + (ui.me >= 0 ? '　矢印＝自分の次の位置' : '');
  if (lg !== legendText) {
    legendText = lg;
    $('#stLegend').textContent = lg;
  }
  if (ui.card === 'dancer') fillDancerCard();
  $('#timeDisp').textContent = t >= 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '';
  renderMeInfo();
  renderTimeline();
  $('#btnPlay').textContent = ui.playing ? '⏸ 停止' : '▶ 再生';
  document.body.classList.toggle('playing', ui.playing);
  $('#projPlay').textContent = ui.playing ? '⏸' : '▶';
}
function renderMeInfo() {
  const box = $('#meInfo');
  if (ui.me < 0) {
    box.style.display = 'none';
    return;
  }
  const i = keyIndexAt(ui.count), nk = S.keys[i + 1], all = positionsAt(S.keys, ui.count), pos = all[ui.me];
  box.style.display = 'block';
  box.textContent = '';
  const nameEl = el('b', { text: S.dancers[ui.me].name, style: `color:${S.dancers[ui.me].color}` });
  const info = []; // 立ち位置のバミリ番号（出す設定のとき）と、まわりの人
  if (ui.showBamiri) {
    const h = S.keys[i].pos[ui.me];
    info.push(`📍 立ち位置 ${bamiriText(h[0], h[1])}${nk ? ` → 次 ${bamiriText(nk.pos[ui.me][0], nk.pos[ui.me][1])}` : ''}`);
  }
  info.push(`👥 まわり（画面の左右） ${neighborText(neighborsOf(all, ui.me), S.dancers.map(x => x.name), ui.view)}`);
  const addInfo = () => info.forEach(t => box.append(el('div', { text: t, style: 'font-size:13px;color:var(--muted)' })));
  if (!nk) {
    box.append(nameEl, ` ／ 最後の隊形（${S.keys[i].name}）です`);
    addInfo();
    return;
  }
  const dx = nk.pos[ui.me][0] - pos[0], dy = nk.pos[ui.me][1] - pos[1], d = hyp(dx, dy);
  const parts = [];
  if (Math.abs(dx) >= 0.1) parts.push(`${dx > 0 ? '上手' : '下手'}へ${Math.abs(dx).toFixed(1)}m`);
  if (Math.abs(dy) >= 0.1) parts.push(`${dy > 0 ? '後ろ' : '前'}へ${Math.abs(dy).toFixed(1)}m`);
  const ms = Math.max(S.keys[i].at, nk.at - nk.move), moving = ui.count >= ms;
  const when = moving ? '移動中' : `あと${Math.ceil(ms - ui.count)}カウントで移動`;
  box.append(nameEl, ` ／ 次「${nk.name}」（${cLabel(nk.at)}）：${d < 0.1 ? 'その場のまま' : parts.join('・')} ／ ${when}`);
  const extra = [];
  for (let j = i + 1; j <= Math.min(i + 2, S.keys.length - 1) && extra.length < 2; j++) {
    const cr = crossesInto(j).find(x => (x.a === ui.me || x.b === ui.me) && x.count >= ui.count - 0.5);
    if (cr) {
      const other = cr.a === ui.me ? cr.b : cr.a;
      extra.push(`✕ ${cLabel(cr.count)}ごろ ${S.dancers[other].name} とクロス（${cr.front === ui.me ? 'あなたが前' : 'あなたが後ろ'}を通る）`);
    }
  }
  const nq = nextCue(ui.count);
  if (nq) extra.push(`💡 次のきっかけ ${cLabel(nq.at)}「${nq.name}」（あと${Math.ceil(nq.at - ui.count - 1e-6)}カウント）`);
  addInfo();
  extra.forEach(t => box.append(el('div', { text: t, style: 'font-size:13px;color:var(--muted)' })));
}
function isEditable() {
  const k = S.keys[ui.sel];
  return !ui.playing && currentTab === 'edit' && k && Math.abs(ui.count - k.at) < 0.01;
}
