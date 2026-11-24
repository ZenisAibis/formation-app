// 基本の部品と定数（画面に触らない）
'use strict';
/* ===== 基本 ===== */
const $ = s => document.querySelector(s);
const PALETTE = [
  '#ff6b6b','#ffa53d','#ffd93d','#9be15d','#3ddc97','#3dd6d0','#4fb3ff','#7b93ff','#a77bff',
  '#e47bff','#ff7bc0','#d0a77e','#b6c3cc','#f4f4f4','#ff9e9e','#c4e86b','#7fe0ff','#ffc58a'];
const LS_KEY = 'danceFormation.v1';
const clone = o => JSON.parse(JSON.stringify(o));
const r2 = v => Math.round(v * 100) / 100;
const hyp = Math.hypot;
