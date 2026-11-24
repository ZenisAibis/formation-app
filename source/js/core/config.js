// 基本の部品と定数（画面に触らない）
'use strict';
/* ===== 基本 ===== */
const $ = s => document.querySelector(s);
const PALETTE = [
  '#ff6b6b','#ffa53d','#ffd93d','#9be15d','#3ddc97','#3dd6d0','#4fb3ff','#7b93ff','#a77bff',
  '#e47bff','#ff7bc0','#d0a77e','#b6c3cc','#f4f4f4','#ff9e9e','#c4e86b','#7fe0ff','#ffc58a'];
const LS_KEY = 'danceFormation.v1';
const SCHEMA_V = 1;        // 作品のデータの版。これより大きい版の作品は読み込まない
const UNDO_LIMIT = 60;     // 元に戻す・やり直すの、積める数
const SAVE_DELAY_MS = 300; // 編集から保存までの待ち（閉じる・隠れるときは待たずに保存する）
const MAX_DANCERS = 40;
const clone = o => JSON.parse(JSON.stringify(o));
const r2 = v => Math.round(v * 100) / 100;
const hyp = Math.hypot;
