// 書き出しの共通部品：保存・共有・確認の画面・凡例
let dlCap; // claude.ai の中で開いたときは、保存の仕組み（downloads）を使う
if (window.claude && window.claude.use) dlCap = window.claude.use('downloads').catch(() => null);
async function download(blob, name) {
  const cap = dlCap ? await dlCap : null;
  if (cap) {
    try {
      await cap.save({ filename: name, data: blob });
      toast('保存しました');
    }
    catch (e) {
      toast(e && e.code === 'declined' ? '保存をやめました'
        : e && e.code === 'host_unavailable' ? 'このアプリでは保存できません。ブラウザかパソコンで開いてください'
          : '保存できませんでした');
    }
    return;
  }
  // iPhone などは共有シートから「写真」「ファイル」に保存する
  try {
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      ask(`「${name}」ができました。`, '保存・共有する', () => { navigator.share({ files: [file] }).catch(() => { }); });
      return;
    }
  } catch (e) { }
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 4000);
}
const closeAsk = () => { $('#askBox').hidden = true; };
function ask(msg, okLabel, fn, cancelLabel = 'やめる') { // 画面の中で確かめる（埋め込み先では確認ダイアログが出ないため）
  const box = $('#askBox');
  box.textContent = '';
  box.append(el('div', { text: msg, style: 'margin-bottom:8px' }), el('div', { class: 'row', style: 'margin:0' }, [
    el('button', { class: 'primary', text: okLabel, onclick: () => {
      closeAsk();
      fn();
    } }), el('button', { text: cancelLabel, onclick: closeAsk })]));
  box.hidden = false;
}
const safeName = s => (s || 'formation').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30);
// dry が true のときは描かず、できあがりの下端の y だけ返す（画像の高さを先に決めるため）
function legend(c, x, y, w, fs, dry = false) {
  let cx = x, cy = y;
  c.font = `${fs}px sans-serif`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  S.dancers.forEach(d => {
    const tw = c.measureText(d.name).width + fs * 1.8;
    if (cx + tw > x + w) {
      cx = x;
      cy += fs * 1.6;
    }
    if (!dry) {
      c.fillStyle = d.color;
      c.beginPath();
      c.arc(cx + fs * 0.5, cy, fs * 0.45, 0, 7);
      c.fill();
      c.fillStyle = THEME.text;
      c.fillText(d.name, cx + fs * 1.1, cy);
    }
    cx += tw;
  });
  return cy + fs;
}
// 各ダンサーのバミリ番号の一覧（画像の下）。見出し1行と、「名前　上手2.5・前から2.35m」を幅に合わせて何列かに並べる
function bamiriListLayout(c, w, fs, pos, names) {
  c.font = `700 ${fs}px sans-serif`;
  const items = pos.map((p, i) => ({ name: names[i] || '', text: bamiriText(p[0], p[1]) }));
  const colW = Math.ceil(Math.max(1, ...items.map(t => c.measureText(t.name).width + fs * 0.8 + c.measureText(t.text).width)) + fs * 1.5);
  const cols = Math.max(1, Math.floor(w / colW)), rows = Math.ceil(items.length / cols), rowH = fs * 1.55;
  return { items, colW, cols, rows, rowH, height: fs * 2 + rows * rowH };
}
function drawBamiriList(c, x, y, w, fs, lay) {
  c.textBaseline = 'top';
  c.textAlign = 'left';
  c.font = `700 ${fs}px sans-serif`;
  c.fillStyle = THEME.muted;
  c.fillText('バミリ番号（前の縁の中央が0・1mごと・上手は客席から見て右）', x, y);
  lay.items.forEach((t, i) => {
    const cx = x + (i % lay.cols) * lay.colW, cy = y + fs * 2 + Math.floor(i / lay.cols) * lay.rowH;
    c.font = `700 ${fs}px sans-serif`;
    c.fillStyle = S.dancers[i] ? S.dancers[i].color : THEME.text;
    c.fillText(t.name, cx, cy);
    c.font = `${fs}px sans-serif`;
    c.fillStyle = THEME.text;
    c.fillText(t.text, cx + c.measureText(t.name).width + fs * 0.8, cy);
  });
}
