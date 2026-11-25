// グループの画面：設定タブのグループの一覧（名前・形・削除・追加）、メンバーの行と丸のカードでのグループの選び
// 変えるときは、1つの操作＝1つの元に戻す単位。グループが1つも無くなったら S.groups は書かない（空の入れ物を残さない）
/* ===== グループの画面 ===== */
const hasGroups = () => !!(S.groups && S.groups.length);
function afterGroupChange() {
  save();
  fillSetup();
  requestRender();
}
function setDancerGroup(i, gid) {
  const d = S.dancers[i];
  if (!d || (d.group || '') === gid) return;
  pushUndo();
  if (gid) d.group = gid;
  else delete d.group;
  afterGroupChange();
}
const groupOptionText = g => `${GROUP_GLYPH[g.shape]} ${g.name}`;
// メンバーの行に置く、グループの選び（グループが1つも無いときは置かない）
function groupSelect(i) {
  const d = S.dancers[i], s = el('select', { 'aria-label': `${d.name} のグループ` });
  s.append(el('option', { value: '', text: 'グループなし（丸）' }));
  S.groups.forEach(g => s.append(el('option', { value: g.id, text: groupOptionText(g) })));
  s.value = d.group || '';
  s.addEventListener('change', () => setDancerGroup(i, s.value));
  return s;
}
function addGroup() {
  if (hasGroups() && S.groups.length >= MAX_GROUPS) {
    toast(`グループは${MAX_GROUPS}つまでです`);
    return;
  }
  pushUndo();
  if (!S.groups) S.groups = [];
  S.groups.push({ id: nextGroupId(), name: `グループ${S.groups.length + 1}`, shape: nextGroupShape() });
  afterGroupChange();
  toast('グループを足しました。メンバーの行で、その人のグループを選んでください', 3600);
}
function renameGroup(id, text, input) {
  const g = groupById(id);
  if (!g) return;
  const nv = String(text).trim().slice(0, GROUP_NAME_MAX) || g.name;
  input.value = nv;
  if (nv === g.name) return;
  pushUndo();
  g.name = nv;
  afterGroupChange();
}
function setGroupShape(id, shape) {
  const g = groupById(id);
  if (!g || g.shape === shape || !GROUP_SHAPE_LIST.includes(shape)) return;
  pushUndo();
  g.shape = shape;
  afterGroupChange();
}
function deleteGroup(id) {
  if (!groupById(id)) return;
  pushUndo();
  S.groups = S.groups.filter(g => g.id !== id);
  S.dancers.forEach(d => { if (d.group === id) delete d.group; });
  if (!S.groups.length) delete S.groups;
  afterGroupChange();
}
// 設定タブのグループの一覧。メンバーの一覧は、グループがあるときは1列にして、行の中にグループの選びを置く
function fillGroups() {
  const box = $('#groupList');
  box.textContent = '';
  $('#dancerList').classList.toggle('has-groups', hasGroups());
  $('#btnAddGroup').disabled = hasGroups() && S.groups.length >= MAX_GROUPS;
  (S.groups || []).forEach(g => {
    const name = el('input', { type: 'text', maxlength: String(GROUP_NAME_MAX), value: g.name, 'aria-label': 'グループの名前' });
    name.addEventListener('change', () => renameGroup(g.id, name.value, name));
    const members = S.dancers.filter(d => d.group === g.id).length;
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': `${g.name} の形` },
      GROUP_SHAPE_LIST.map(s => el('button', {
        type: 'button', 'aria-pressed': g.shape === s ? 'true' : 'false', 'data-shape': s,
        text: `${GROUP_GLYPH[s]} ${GROUP_SHAPES[s]}`, onclick: () => setGroupShape(g.id, s) })));
    box.append(el('div', { class: 'grow' }, [
      el('div', { class: 'grow-h' }, [name, el('span', { class: 'muted', text: `${members}人` }),
        el('button', { type: 'button', class: 'small', text: '削除', 'aria-label': `${g.name} を削除`, onclick: () => deleteGroup(g.id) })]),
      seg]));
  });
}
$('#btnAddGroup').addEventListener('click', addGroup);
// 丸のカードのグループの選び。描き直しのたびに呼ばれるので、選びの中身は groups が変わったときだけ作り直す（開いた選びを閉じない）
let groupSelSig = '';
function fillDancerGroup(i) {
  const row = $('#cardDancerGroupRow'), sel = $('#cardDancerGroupSel');
  row.hidden = !hasGroups();
  if (!hasGroups()) {
    groupSelSig = '';
    return;
  }
  const sig = JSON.stringify(S.groups);
  if (sig !== groupSelSig) {
    groupSelSig = sig;
    sel.textContent = '';
    sel.append(el('option', { value: '', text: 'グループなし（丸）' }));
    S.groups.forEach(g => sel.append(el('option', { value: g.id, text: groupOptionText(g) })));
  }
  const want = (S.dancers[i] && S.dancers[i].group) || '';
  if (sel.value !== want) sel.value = want;
}
$('#cardDancerGroupSel').addEventListener('change', e => {
  if (ui.selDancer >= 0) setDancerGroup(ui.selDancer, e.target.value);
});
