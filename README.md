# フォーメーション練習

曲と照明のきっかけに合わせて、ダンサーの立ち位置・移動・クロスを見える化する練習アプリです。

- 開き方：GitHub Pages の URL を Safari で開き、「ホーム画面に追加」
- 曲は端末の中だけで解析し、どこにも送りません
- 作った隊形はその端末の中にだけ保存されます

## 作る人向け（置き場の形）
```text
source/            手で直すのはここだけ
├─ index.html      骨組み（<!-- @include ... --> を並べる）
├─ parts/          画面の部品（HTML）
├─ styles/         tokens.css（色・基準の値）・app.css
└─ js/
   ├─ core/        状態・保存・読み込みの確かめ・元に戻す・計算（画面に触らない）
   └─ ui/          画面と操作
build.py           組み立て＋検査（標準ライブラリだけの Python）
dist/              組み立ての出力（git に入れない）  index.html と build.json
index.html         公開用（GitHub Pages が配る物）。dist/index.html の写し
manifest.webmanifest・sw.js・icon-*.png・.nojekyll   そのまま
```
- 直すのは `source/` だけ。`dist/` と、ルートの `index.html` は手で直さない（組み立ての出力）
- 改行は LF（`.gitattributes`）

### 組み立てと検査
```text
C:/Users/osm12/family/tools/.venv/Scripts/python.exe -I build.py             # 組み立て＋検査。合格のときだけ dist/ に出す
C:/Users/osm12/family/tools/.venv/Scripts/python.exe -I build.py --check     # 検査だけ
C:/Users/osm12/family/tools/.venv/Scripts/python.exe -I build.py --publish   # dist/index.html をルートの index.html に写す（sha256 が同じときだけ）
C:/Users/osm12/family/tools/.venv/Scripts/python.exe -I build.py --verify    # ルートの index.html が build.json と同じか
```
検査（不合格は終了番号 1 で止まり、dist は書き換えない）：
1. `@include` の先がある・ぐるぐる回らない
2. source の .js・.css・.html に 500字を超える行がない
3. 改行は LF
4. 外部参照なし（`http:`・`https:`・`//` で始まる src/href・url(…外)・@import。CSP の meta の文の中は対象外。下の例外の表だけ許す）
5. 最上位の名前（function・const・let・var）の重なりなし（js の取り込み順に全部見る）
6. html の id の重なりなし
7. js の中に `</script` と `<!--` がない
8. 取り込む js の最初の文が `'use strict'`

`build.json`：sha256・バイト数・行数・取り込んだファイル・検査の結果・例外。**配る物は build.json の sha256 と同じ index.html だけ**。

### 検査の例外の表（外部参照）
| 場所 | 内容 | 理由 |
|---|---|---|
| source/js/ui/setup.js の `location.protocol === 'https:'` | 文字 `https:` が出る | 通信先ではない。https で開いたときだけ、電波がなくても動くための sw.js を登録する判定 |

（manifest・CSP の文の中の `http`・`https` は検査の対象外。今の CSP は `'self'` だけで、外のアドレスは書いていない）

## 試験
再現試験は `C:\Users\osm12\family\tools\formation\tests\`（`run_tests.js`・T1〜T10。使い方はそこの README）。
```text
node run_tests.js C:\Users\osm12\family\tools\.apps\formation-app\dist\index.html
```

## 段1（2026-11-25）：中身を変えずに分けた
- もとの index.html（1318行・sha256 b98ed8d2…）を役割で分け、build.py で1枚に組み立てるようにした。振る舞いは変えていない（試験の合否・各ケースの実測の文・見本の画面が直す前と同じ）
- 整形：1行に詰めた文は、文ごと・指定ごとに改行した。分けた直後は、空白と改行だけ足したことを機械で確かめた（空白を全部消した文字列がもとと同じ）。そのあとの手直しで、長い引数や式を折り返した所と、1つの長い文字列を `+` でつないだ所が少しある（出る文字は同じ）

## 残り（段1でやらなかった物）
- JS を1つの入れ物の名前（例 `App.core.storage`）の下に移すこと。試験が `S`・`undoStack`・`positionsAt`・`ui`・`lastLayout`・`isEditable` を最上位の名前で直接読んでおり、移すと試験の前提と振る舞いが変わる恐れが大きいため。名前の重なりは検査で止めている
- 画面にエラーを出す仕掛け（`window.onerror`）
- HTML の長めの行（最長 約280字。500字は超えていない）の折り返し
- 1ファイルが500行を超える `js/ui/tabs.js`・`js/ui/stage.js` の分け直し（合否にはしない目安）
- イベントの付け方：静的な要素には起動時に1回だけ付けている（コードを読んだ範囲。画面を切り替えたときに付け足す作りは見当たらないが、通しの確認はしていない）
