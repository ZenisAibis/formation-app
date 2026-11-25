// 基本の部品と定数（画面に触らない）
'use strict';
/* ===== 基本 ===== */
const $ = s => document.querySelector(s);
// ダンサーの色（10色）。赤（「要修正」の色）は使わない。丸の中の字は --on-token の濃い色
const PALETTE = [
  '#3fe0ff','#5b8cff','#a77bff','#e86bff','#ff7bc8','#ffb547','#d9b98a','#b6f05a','#3ddc97','#c3cad6'];
const LS_KEY = 'danceFormation.v1';
const SCHEMA_V = 1;        // 作品のデータの版。これより大きい版の作品は読み込まない
const UNDO_LIMIT = 60;     // 元に戻す・やり直すの、積める数
const SAVE_DELAY_MS = 300; // 編集から保存までの待ち（閉じる・隠れるときは待たずに保存する）
const MAX_DANCERS = 40;
const clone = o => JSON.parse(JSON.stringify(o));
const r2 = v => Math.round(v * 100) / 100;
const hyp = Math.hypot;
