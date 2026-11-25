// 書き出し：全隊形の画像・今の隊形の画像・動画
$('#btnSheet').addEventListener('click', () => {
  const cols = S.keys.length > 4 ? 3 : 2, cw = 520;
  const ch = Math.round(cw * (S.stage.d + 1.3) / (S.stage.w + 0.6)) + 34, rows = Math.ceil(S.keys.length / cols);
  const c = document.createElement('canvas'), W = cols * cw + 20, H = 70 + rows * (ch + 10) + 120;
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = THEME.bg;
  x.fillRect(0, 0, W, H);
  x.fillStyle = THEME.text;
  x.font = '700 28px sans-serif';
  x.textBaseline = 'top';
  x.textAlign = 'left';
  x.fillText(`${S.title}（${S.dancers.length}人・BPM ${S.bpm}）`, 14, 18);
  S.keys.forEach((k, i) => {
    const ox = 10 + (i % cols) * cw, oy = 70 + Math.floor(i / cols) * (ch + 10);
    x.save();
    x.translate(ox, oy + 34);
    drawStage(x, cw - 10, ch - 34, k.at, { view: ui.view, me: -1, names: true, bamiri: ui.showBamiri });
    x.restore();
    x.fillStyle = THEME.sel;
    x.font = '700 20px sans-serif';
    x.textBaseline = 'top';
    x.textAlign = 'left';
    x.fillText(`${i + 1}. ${cLabel(k.at)} ${k.name}`, ox + 4, oy + 6);
  });
  legend(x, 14, 70 + rows * (ch + 10) + 20, W - 28, 18);
  c.toBlob(b => download(b, safeName(S.title) + '_全隊形.png'), 'image/png');
});
$('#btnKeyPng').addEventListener('click', () => {
  // 高さ：見出し60＋ステージ＋凡例（人数が多いと何行かになる）＋バミリ番号の一覧（出す設定のとき）。画像の大きさだけが変わる
  const w = 1200, stageH = Math.round(w * (S.stage.d + 1.3) / (S.stage.w + 0.6)), m = document.createElement('canvas').getContext('2d');
  const legY = stageH + 80, legBottom = legend(m, 16, legY, w - 32, 20, true);
  const pos = positionsAt(S.keys, ui.count), lay = bamiriListLayout(m, w - 32, 18, pos, S.dancers.map(d => d.name));
  const listY = legBottom + 14, h = ui.showBamiri ? listY + lay.height + 20 : legBottom + 40;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = THEME.bg;
  x.fillRect(0, 0, w, h);
  x.save();
  x.translate(0, 60);
  drawStage(x, w, stageH, ui.count, { view: ui.view, me: ui.me, names: true, bamiri: ui.showBamiri });
  x.restore();
  const k = S.keys[keyIndexAt(ui.count)];
  x.fillStyle = THEME.text;
  x.font = '700 30px sans-serif';
  x.textBaseline = 'top';
  x.textAlign = 'left';
  x.fillText(`${S.title} ／ ${cLabel(ui.count)} ${k.name}`, 16, 14);
  legend(x, 16, legY, w - 32, 20);
  if (ui.showBamiri) drawBamiriList(x, 16, listY, w - 32, 18, lay);
  c.toBlob(b => download(b, `${safeName(S.title)}_${cLabel(ui.count)}.png`), 'image/png');
});
/* 動画 */
let rec = null, recChunks = [], recCanvas = null, recCtx = null, audioCtx = null, mediaDest = null;
function drawRecFrame() {
  if (!recCtx) return;
  const w = recCanvas.width, h = recCanvas.height;
  drawStage(recCtx, w, h, ui.count, { view: ui.view, me: ui.me, names: true, showPaths: ui.showPaths, bamiri: ui.showBamiri });
  recCtx.fillStyle = THEME.text;
  recCtx.font = '800 64px sans-serif';
  recCtx.textAlign = 'right';
  recCtx.textBaseline = 'top';
  recCtx.fillText(cLabel(ui.count), w - 24, 14);
  const k = S.keys[keyIndexAt(ui.count)];
  recCtx.font = '700 30px sans-serif';
  recCtx.textAlign = 'left';
  recCtx.fillText(`${S.title} ／ ${k.name}`, 20, 20);
}
$('#btnVideo').addEventListener('click', async () => {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    toast('この端末のブラウザは動画の書き出しに対応していません');
    return;
  }
  if (ui.recording) {
    stopRecording();
    return;
  }
  if (ytActive()) {
    toast('動画に書き出すときは、先に YouTube の動画を閉じてください（YouTube の音は書き出せません）');
    return;
  }
  pause();
  recCanvas = document.createElement('canvas');
  recCanvas.width = 1280;
  recCanvas.height = 720;
  recCtx = recCanvas.getContext('2d');
  const stream = recCanvas.captureStream(30);
  if (audioReady) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaElementSource(audio);
        mediaDest = audioCtx.createMediaStreamDestination();
        src.connect(audioCtx.destination);
        src.connect(mediaDest);
      }
      await audioCtx.resume();
      mediaDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) { toast('音を入れられなかったので、映像だけで作ります'); }
  }
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  try {
    rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined);
  } catch (e) {
    toast('動画を作れませんでした');
    return;
  }
  recChunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
  rec.onstop = () => {
    const type = rec.mimeType || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    download(new Blob(recChunks, { type }), `${safeName(S.title)}.${ext}`);
    recCtx = null;
    $('#btnVideo').textContent = '動画に書き出す';
    toast('動画を保存しました');
  };
  ui.recording = true;
  setCount(0);
  drawRecFrame();
  rec.start(500);
  $('#btnVideo').textContent = '■ 書き出しを止める';
  toast('最後まで再生すると動画ができます。途中で止めるとそこまでの動画になります', 4000);
  play();
});
function stopRecording() {
  ui.recording = false;
  try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) { }
}
