// 曲の解析（BPM・頭の位置・盛り上がり）
function analyzeAudio(ab) {
  const sr = ab.sampleRate, ch0 = ab.getChannelData(0), ch1 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null;
  const hop = 512, nF = Math.floor(ch0.length / hop), fr = sr / hop;
  const rms = new Float32Array(nF), on = new Float32Array(nF);
  let prev = 0, lp = 0;
  for (let f = 0; f < nF; f++) {
    let s = 0, sl = 0;
    const b = f * hop;
    for (let i = 0; i < hop; i++) {
      const v = ch1 ? (ch0[b + i] + ch1[b + i]) * 0.5 : ch0[b + i];
      s += v * v;
      lp += 0.08 * (v - lp);
      sl += lp * lp;
    }
    const e = Math.sqrt(s / hop);
    rms[f] = e;
    const le = Math.log(1 + 200 * Math.sqrt(sl / hop)) + 0.5 * Math.log(1 + 200 * e);
    on[f] = Math.max(0, le - prev);
    prev = le;
  }
  // 平均を引く
  const win = Math.round(fr * 0.4);
  const ons = new Float32Array(nF);
  let acc = 0;
  for (let f = 0; f < nF; f++) {
    acc += on[f];
    if (f >= win) acc -= on[f - win];
    ons[f] = Math.max(0, on[f] - acc / Math.min(f + 1, win));
  }
  const N = Math.min(nF, Math.round(fr * 150)), lag = b => fr * 60 / b;
  const acAt = L => {
    const l0 = Math.floor(L), t = L - l0;
    let s0 = 0, s1 = 0;
    for (let i = 0; i + l0 + 1 < N; i++) {
      s0 += ons[i] * ons[i + l0];
      s1 += ons[i] * ons[i + l0 + 1];
    }
    return s0 * (1 - t) + s1 * t;
  };
  let best = 120, bs = -1;
  for (let b = 78; b <= 170; b += 0.5) {
    const L = lag(b);
    const sc = acAt(L) + 0.5 * acAt(2 * L) + 0.25 * acAt(4 * L);
    if (sc > bs) {
      bs = sc;
      best = b;
    }
  }
  let fb = best, fphase = 0, fs = -1;
  for (let b = best - 1; b <= best + 1; b += 0.02) {
    const L = lag(b);
    for (let ph = 0; ph < L; ph += 1) {
      let s = 0;
      for (let x = ph; x < nF - 1; x += L) {
        const i = Math.round(x);
        s += ons[i] + 0.5 * (ons[i + 1] || 0);
      }
      if (s > fs) {
        fs = s;
        fb = b;
        fphase = ph;
      }
    }
  }
  const beat = 60 / fb, phaseT = fphase / fr;
  let mx = 0;
  for (let f = 0; f < nF; f++) mx = Math.max(mx, rms[f]);
  let t0 = 0;
  for (let f = 0; f < nF; f++) if (rms[f] > mx * 0.15) {
    t0 = f / fr;
    break;
  }
  let k = Math.ceil((t0 - phaseT) / beat - 0.5);
  if (k < 0) k = 0;
  return { bpm: Math.round(fb * 10) / 10, offset: r2(phaseT + k * beat), duration: ab.duration, rms, fr };
}
function energyPerEight(a) {
  const n = Math.max(1, Math.ceil((a.duration - S.offset) / (8 * beatSec()))), out = [];
  for (let e = 0; e < n; e++) {
    const t0 = S.offset + e * 8 * beatSec(), t1 = t0 + 8 * beatSec();
    const f0 = Math.max(0, Math.floor(t0 * a.fr)), f1 = Math.min(a.rms.length, Math.floor(t1 * a.fr));
    let s = 0;
    for (let f = f0; f < f1; f++) s += a.rms[f];
    out.push(f1 > f0 ? s / (f1 - f0) : 0);
  }
  const mx = Math.max(...out, 1e-9);
  return out.map(v => r2(v / mx));
}
