// 再生・停止・1コマごとの進み（tick）
/* ===== 再生 ===== */
function setCount(c) {
  ui.count = c;
  if (audioReady) {
    const t = S.offset + c * beatSec();
    audio.currentTime = Math.max(0, t);
  }
  if (ui.playing) {
    ui.clockT0 = performance.now();
    ui.clockC0 = c;
  }
  requestRender();
}
async function play() {
  if (ui.playing) return;
  if (ui.count >= S.totalEights * 8 - 0.5) setCount(0);
  ui.playing = true;
  ui.clockT0 = performance.now();
  ui.clockC0 = ui.count;
  lastBeat = null;
  if (audioReady) {
    audio.playbackRate = ui.rate;
    const t = S.offset + ui.count * beatSec();
    if (t < 0) { audio.currentTime = 0; } else audio.currentTime = t;
    try { await audio.play(); } catch (e) {
      toast('曲を再生できませんでした。もう一度押してください');
      ui.playing = false;
    }
  }
  try {
    if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { }
  requestRender();
}
function pause() {
  if (!ui.playing) return;
  ui.playing = false;
  if (audioReady) audio.pause();
  try { if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  } } catch (e) { }
  if (ui.recording) stopRecording();
  requestRender();
}
const toggle = () => ui.playing ? pause() : play();
function tick() {
  if (ui.playing) {
    if (audioReady) ui.count = (audio.currentTime - S.offset) / beatSec();
    else ui.count = ui.clockC0 + (performance.now() - ui.clockT0) / 1000 / beatSec() * ui.rate;
    const bi = Math.floor(ui.count);
    if ($('#clickOn').checked && bi >= 0 && lastBeat !== null && bi !== lastBeat) clickSound(bi % 8 === 0);
    lastBeat = bi;
    if (ui.count >= S.totalEights * 8 || (audioReady && audio.ended)) {
      ui.count = Math.min(ui.count, S.totalEights * 8);
      pause();
    }
    if (!isEditable() && currentTab === 'edit') {
      const k = keyIndexAt(ui.count);
      if (k !== ui.sel) {
        ui.sel = k;
        renderKeyChips();
        fillKeyForm();
      }
    }
    needRender = true;
  }
  if (needRender) {
    needRender = false;
    render();
    if (ui.recording) drawRecFrame();
  }
  requestAnimationFrame(tick);
}
