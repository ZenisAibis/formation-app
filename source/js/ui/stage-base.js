// 画面の土台：知らせ（toast）・要素を作る関数・ステージの canvas と配置の計算
let audioReady = false, analysis = null, wakeLock = null;
const audio = $('#audio');

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), ms);
}
function el(tag, props = {}, kids = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) e.append(c);
  return e;
}

/* ===== 描画 ===== */
const cv = $('#stage'), ctx = cv.getContext('2d');
let needRender = true;
const requestRender = () => { needRender = true; };
function stageLayout(w, h, view) {
  const W = S.stage.w, D = S.stage.d, padX = Math.max(10, w * 0.03), padT = Math.max(8, h * 0.025), lab = Math.max(20, h * 0.07);
  const sc = Math.min((w - 2 * padX) / W, (h - 2 * padT - lab) / D), sw = W * sc, sd = D * sc;
  const ox = (w - sw) / 2, oy = view === 'audience' ? padT + (h - 2 * padT - lab - sd) / 2 : padT + lab + (h - 2 * padT - lab - sd) / 2;
  const map = view === 'audience' ? (x, y) => [ox + (x + W / 2) * sc, oy + (D - y) * sc] : (x, y) => [ox + (W / 2 - x) * sc, oy + y * sc];
  const inv = view === 'audience' ? (sx, sy) => [(sx - ox) / sc - W / 2, D - (sy - oy) / sc] : (sx, sy) => [W / 2 - (sx - ox) / sc, (sy - oy) / sc];
  return { sc, ox, oy, sw, sd, map, inv, lab };
}
