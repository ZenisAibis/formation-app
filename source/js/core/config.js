// 基本の部品と定数（画面に触らない）
'use strict';
/* ===== 基本 ===== */
const $ = s => document.querySelector(s);
// ダンサーの色（10色）。赤（「要修正」の色）は使わない。丸の中の字は --on-token の濃い色
const PALETTE = [
  '#3fe0ff','#5b8cff','#a77bff','#e86bff','#ff7bc8','#ffb547','#d9b98a','#b6f05a','#3ddc97','#c3cad6'];
const LS_KEY = 'danceFormation.v1';
// 新しい項目を使った作品に付ける版。使っていない作品は v=1 のまま（schema.js の schemaVOf）。足すときはここに1行
const FEATURE_V = { groups: 2 };
const SCHEMA_V = Math.max(1, ...Object.values(FEATURE_V)); // このアプリが読める作品の版の最大。これより大きい版の作品は読み込まない
const MAX_GROUPS = 8;         // グループの数の上限
const GROUP_NAME_MAX = 12;    // グループの名前の字数の上限
const GROUP_SHAPES = { circle: '丸', square: '四角', triangle: '三角', diamond: 'ひし形' };
const GROUP_SHAPE_LIST = Object.keys(GROUP_SHAPES);
const GROUP_GLYPH = { circle: '●', square: '■', triangle: '▲', diamond: '◆' };
const UNDO_LIMIT = 60;     // 元に戻す・やり直すの、積める数
const SAVE_DELAY_MS = 300; // 編集から保存までの待ち（閉じる・隠れるときは待たずに保存する）
const MAX_DANCERS = 40;
const clone = o => JSON.parse(JSON.stringify(o));
const r2 = v => Math.round(v * 100) / 100;
const hyp = Math.hypot;
