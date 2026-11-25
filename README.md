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
├─ styles/         tokens.css（色・基準の値）・app.css・youtube.css（動画の枠）
└─ js/
   ├─ core/        状態・保存・読み込みの確かめ・元に戻す・計算（画面に触らない）。youtube-id.js は URL から動画 ID を取り出す
   └─ ui/          画面と操作（役割ごとに分けてある。各 300 行以下）
      ├─ theme.js                      描画の色と光（CSS の変数から読む表 THEME・光の強さ GLOW）
      ├─ stage-base / stage-draw / stage-render / stage-drag    ステージの土台・描き方・1コマの描き直し・ドラッグ
      ├─ timeline.js / playback.js     タイムライン・再生
      ├─ youtube.js                    YouTube の動画の枠（試作。下の「YouTube で練習する」）
      ├─ history.js                    戻す・やり直す・変更のあとの描き直し
      ├─ tab-edit / tab-cues / tab-advice / tab-practice        各タブ
      ├─ export-common.js / export.js  書き出し（画像・動画）
      └─ setup.js                      設定タブ・保存と読み込みの操作・タブ切り替え・起動
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
4. 外部参照なし（`http:`・`https:`・`//` で始まる src/href・url(…外)・@import。例外の表（下）に名指しした文字列だけを取り除いて、まだ残るなら止める。CSP の meta の文は、外のアドレスが YouTube の2つ〈`https://www.youtube.com`・`https://www.youtube-nocookie.com`〉だけかを見る）
5. 最上位の名前（function・const・let・var）の重なりなし（js の取り込み順に全部見る）
6. html の id の重なりなし
7. js の中に `</script` と `<!--` がない
8. 取り込む js の最初の文が `'use strict'`

`build.json`：sha256・バイト数・行数・取り込んだファイル・検査の結果・例外。**配る物は build.json の sha256 と同じ index.html だけ**。

### 検査の例外の表（外部参照）
| 場所 | 内容 | 理由 |
|---|---|---|
| source/js/ui/setup.js の `location.protocol === 'https:'` | 文字 `https:` が出る | 通信先ではない。https で開いたときだけ、電波がなくても動くための sw.js を登録する判定 |
| source/js/ui/youtube.js の `https://www.youtube.com/iframe_api` | YouTube 公式の IFrame Player API の読み込み | 動画を出すとき1回だけ。CSP の script-src に同じ host |
| source/js/ui/youtube.js の `https://www.youtube-nocookie.com/embed/` | 埋め込み枠（iframe の src） | プライバシー強化モード。CSP の frame-src に同じ host |
| source/js/core/youtube-id.js の `'https://' + s` | 先頭に `https://` を足す文 | 通信しない。URL の先頭の指定が無い入力を URL として読むため |

（manifest の `http`・`https` は検査の対象外。CSP は YouTube の埋め込みに要る物だけ：script-src に `https://www.youtube.com`（IFrame Player API の2つの script がどちらも www.youtube.com から来る）、frame-src に `https://www.youtube-nocookie.com`。frame-src に `https://www.youtube.com` は、本物の YouTube で要らないと確かめたので足していない）

## 試験
再現試験は `C:\Users\osm12\family\tools\formation\tests\`（`run_tests.js`・T1〜T10。使い方はそこの README）。
```text
node run_tests.js C:\Users\osm12\family\tools\.apps\formation-app\dist\index.html
```

## 段1（2026-11-25）：中身を変えずに分けた
- もとの index.html（1318行・sha256 b98ed8d2…）を役割で分け、build.py で1枚に組み立てるようにした。振る舞いは変えていない（試験の合否・各ケースの実測の文・見本の画面が直す前と同じ）
- 整形：1行に詰めた文は、文ごと・指定ごとに改行した。分けた直後は、空白と改行だけ足したことを機械で確かめた（空白を全部消した文字列がもとと同じ）。そのあとの手直しで、長い引数や式を折り返した所と、1つの長い文字列を `+` でつないだ所が少しある（出る文字は同じ）

## 段2（2026-11-25）：データ保護を直した
- 元に戻す・やり直す：作品 S の全部（作品名・BPM・1カウント目・ステージ・総8カウント数・人数・隊形・ベース・照明・曲の盛り上がり）を1つの単位として積む（上限60）。戻す・やり直すと、作品を丸ごと置き換え、選び（隊形・ダンサー・自分・照明）を範囲内に直す
- やり直す：「元に戻す」の隣にボタン（編集タブ・アドバイスタブ）。キーは Ctrl/Cmd+Z＝元に戻す、Ctrl/Cmd+Shift+Z・Ctrl+Y＝やり直す。文字を打つ欄（文字・数の入力欄・貼り付け欄）にいる間は効かせず、ブラウザの文字の取り消しに任せる。新しい操作をするとやり直しの積みは空になる
- 積むとき：設定の入力欄は change のとき（値が変わったときだけ）1回。BPM のタップは連続して叩く間で1つ。点は、押しただけでは積まず、ドラッグで実際に動いた最初の時に1回だけ積む
- 保存：失敗したら画面に知らせる（同じ知らせは、成功するまで続けて出さない）。閉じる・隠れる（pagehide・visibilitychange が hidden）ときは、待っている保存をすぐ行う
- 読み込み（`inspectLoad`）：座標が数でない隊形がある・新しい版（v が 1 より大きい）の作品は、理由を知らせて断る。pos の長さ違いで捨てる隊形があるときは「n 個の隊形を読み込めませんでした」と知らせる確認を出し、押されたら残りを読み込む。dancers が文字列の配列なら、その文字列を名前に使う
- 読み込み・見本に戻す・ベースに戻すは、それぞれ1つの元に戻す単位（戻すと読み込む前の作品が丸ごと戻る）
- 基準の数字（版・履歴の上限・保存の待ち・人数の上限）は `source/js/core/config.js` に置いた

### 試験（段2の合格の条件）
`tests/run_tests.js` の T1〜T10 は、期待値を変えずに流す（T5 の INFO 2件は仕様判断のまま）。足した試験は `tests/run_extra_tests.js`（X1〜X9：やり直しの往復・キー・入力欄の中・上限60・保存失敗の知らせ・閉じる直前の保存・丸ごと戻す・読み込みの知らせ・ドラッグと選びの直し）。使い方は `tests/README.md`。

## 段3（2026-11-25）：点検の指摘の手直し
- 起動のとき保存の作品が読めない（新しい版・壊れた JSON・数でない座標など）と、読めなかった元の文字列をそのまま別のキー `danceFormation.v1.unreadable.<YYYYMMDD-HHMMSS>` に写してから見本を出す。3件まで残し、古い物から捨てる（同じ文字列は増やさない）。画面に「保存されていた作品を読めませんでした（理由）。元のデータは別に残してあります」と出し、「元のデータを書き出す」（そのまま .json）／「閉じる」。設定タブの保存の近くにも、残した物があるときだけ「読めなかった作品を書き出す」を出す
- 読み込みで、ベースの隊形だけが悪いとき（座標が数でない・pos の長さ違い）は、作品全体を断らず、ベースを外して「ベースの隊形を読めなかったので外しました」と知らせる
- 元に戻す・やり直すのあと：止まっているときは ui.count を音の位置に合わせ直す／照明の入力欄を作り直す／タップで測る途中の印を解く／開いている確認の画面を閉じる
- BPM・offset を同じ値にしたときは、何もしない（曲を読み込んでいても、盛り上がり・長さを作り直さない）。pushUndo は、積みの一番上が今の作品と同じなら積まない
- 曲の読み込みを元に戻したとき、最初の1回だけ「曲は読み込んだ物のままです」と知らせる

### 既知の限り
- 曲を読み込んだあとに元に戻しても、曲（`analysis`・`audio`）は新しい曲のまま残る（曲は作品 S の外にあるため）。作品の盛り上がり・長さだけが戻る

## 残り
### 段2でやらなかった物
- 起動のとき読めなかった保存データは、段3で別キーに残すようにした（上の段3）
- 読み込みで、照明の項目が使えない形のとき黙って捨てる・数が範囲外のとき範囲に丸める（今までどおり。知らせるのは、座標が数でない・pos の長さ違い・新しい版だけ）
- 保存失敗の知らせは1つの表示枠（toast・8秒）で、ほかの知らせが出ると上書きされる
- 同じ時刻（at）の隊形が重なる作品は、今までどおりそのまま読み込む（T5 の INFO）

### 段1でやらなかった物
- JS を1つの入れ物の名前（例 `App.core.storage`）の下に移すこと。試験が `S`・`undoStack`・`positionsAt`・`ui`・`lastLayout`・`isEditable` を最上位の名前で直接読んでおり、移すと試験の前提と振る舞いが変わる恐れが大きいため。名前の重なりは検査で止めている
- 画面にエラーを出す仕掛け（`window.onerror`）
- HTML の長めの行（最長 約280字。500字は超えていない）の折り返し
- イベントの付け方：静的な要素には起動時に1回だけ付けている（コードを読んだ範囲。画面を切り替えたときに付け足す作りは見当たらないが、通しの確認はしていない）

## 案C スタジオ（2026-11-26）：見た目を入れた
見本・決め事は `C:\Users\osm12\zenis-dev\work-claude\design\formation_mock\`（C_studio.html・README.md）。

### 段0：`tabs.js`（601行）・`stage.js`（554行）を役割ごとに分けた
- 13ファイル（上の置き場の表）に分けた。コードは前と同じ（見出しコメントと空行だけ違う）。build.py の検査・試験・画面の画素が分ける前と同じ

### 段1：色・光・余白
- `styles/tokens.css`：案Cの変数（面・字・光の役割・判定・光の強さ・字の大きさ・余白）。光は「選んだ物・今」＝シアン、「動き」＝紫の2色だけ。赤（`--danger`）は「要修正」だけ。必ず「▲」と言葉を添え、光らせない
- `styles/app.css`：変数だけで色を決める作りに。ボタン・カード・チップ・アドバイスの札（▲ 要修正／● 提案／i 参考）・スイッチ・`prefers-reduced-motion`（切り替えの動きを止める）。入力欄の字は 16px（iPhone の拡大を防ぐ）
- `js/ui/theme.js`：描画（canvas）の色は、ここで CSS の変数から読んだ表 `THEME` と `GLOW`（光の強さ・薄さ）だけを使う。書き出す画像・動画も同じ表（見た目の色が変わる。ファイルの形は変わらない）
- 見本の「見つかった問題」を直した：再生位置の線は「今」の色（シアン）に（前は要修正と同じ赤）／ダンサーの色の初期値は10色で赤を外した（前は1番目が赤）／動きを減らす設定に対応
- 照明の初期色は紫（前は赤み）。見本の作品の「赤の照明」は「紫の照明」にした

### 段2：配置
- 画面の下に固定のタブ（編集・アドバイス・練習・設定）。アドバイスに要修正の数「▲N」
- 見出しの右に「↶ 戻す」「↷（やり直す）」「大きく表示」（どのタブにいても押せる）。タブの中の戻す・やり直すは無くなった（`#btnUndo2`・`#btnRedo2` は無い）
- 再生の列は4つの格子（戻る・再生・カウント〈36px と8つの拍の点・時刻〉・速さ）。速さのボタンは押すたびに 0.5→0.75→1 と回る
- タイムラインは高さ80px・凡例1行。隊形（●）の段 y=44・照明（◆）の段 y=66（`timeline.js` の `TL_KEY_Y`・`TL_CUE_Y`。押す場所の判定も同じ値）
- 編集タブは、ふだんは「隊形のチップ」「＋ 隊形を追加」「◆ 照明・きっかけ」「25cm刻み」だけ。隊形（チップ・タイムラインの ●）・丸（ステージで押す）・照明（タイムラインの ◆）を選んだときだけ、その物のカードが出る（`ui.card`＝null・'key'・'dancer'・'cue'。保存しない画面の状態）
- 照明の追加：「◆ 照明・きっかけ」で今のカウントに「きっかけ」を1つ足して選び、カードで種類・名前・色・当てる人・時刻・フェードを直す。**直すとすぐ反映**（値が変わったときだけ、1回の元に戻す単位で積む）。「選んだものを更新」ボタンは無くなった
- 速さと向きは分割ボタン（練習タブ）。向きは前と同じキー（`danceFormation.v1.view`）に保存する
- 選んだ丸に光る輪・その人の前の隊形からの線をシアンで太く光らせ、ほかを薄くする（0.72）。丸の数が多く小さいときは、自分以外の名前を丸の中に書かず、選んだ丸に名前の吹き出し。丸の大きさは見本の寸法（20人以下 0.35・21人以上 0.31 × 1m の長さ）

### 入れなかった物（保存データに触れる、または別の決め）
- 「グループの形で見分ける」・ダンサーの色を選ぶ機能（保存データの項目が増える。持ち主の承認待ち）
- YouTube の埋め込み枠：このあとの「YouTube で練習する」で入れた（試作）
- 横長（844px）のとき、ステージを動画の枠の隣に並べる2列（動画の枠が無いので入れていない）。ステージの高さの上限（画面の高さの58%）は前のまま
- `manifest.webmanifest` の色（`#11151d`）と `sw.js`：「そのまま」の物なので触っていない（起動画面の色が少し違う）

## YouTube で練習する（2026-11-26・試作。公開していない）
設定タブの「YouTube の動画」に URL を入れて「動画を出す」と、画面の上（見出しとステージの間）に YouTube の公式プレーヤーが出る。再生・停止・位置の移動（動画の枠の中でも、アプリの ▶・タイムライン・「戻る」でも）に、アプリの再生位置が追いかける。

### 作り
| ファイル | 役目 |
|---|---|
| `source/js/core/youtube-id.js` | `ytParseUrl(text)`：`youtube.com/watch?v=`・`youtu.be/`・`youtube.com/shorts/`（先頭の http・https はあってもなくても可）から動画 ID（11字）を取り出す。再生リスト・チャンネル・埋め込み用・別のサイト・ID だけは断る（`{ ok:false, reason }`） |
| `source/js/ui/youtube.js` | 枠の出し入れ・IFrame Player API の読み込み・時刻の追いかけ・速さ・失敗の知らせ |
| `source/styles/youtube.css` | 枠（16:9・最小 200×200px・幅は最大 640px） |
| `source/parts/header-stage.html`・`tab-setup.html` | 枠（`#ytBox`）・入れ口のカード（`#cardYt`） |
| `playback.js`・`setup.js`・`tab-practice.js`・`export.js` | 動画を出している間（`ytActive()`）は、曲のファイルの代わりにプレーヤーの時刻を使う分岐を足した |

### 動き
- **時刻**：プレーヤーの `getCurrentTime()` が正。再生中は毎コマ読み、読んだ値からの経過を足して滑らかにする（足す上限 0.5秒）。止まっている間も 0.25秒ごとに読み、動画側で位置を動かしたら追いかける。カウント＝（時刻 − 1カウント目の時刻）÷ 1拍の秒。曲の読み込みと同じ軸（BPM・offset）。「再生中の『今』を 1-1 にする」も動画の時刻で働く
- **再生の状態**はプレーヤーの知らせ（onStateChange）に従う。アプリの ▶ は `playVideo()` を頼むだけ（2秒たっても始まらないときは「動画の枠の中の再生ボタンを直接押してください」と知らせる）。アプリから位置を動かすと `seekTo()`（直後 0.4秒は古い時刻を読み戻さない）
- **ずれたら**：「位置を合わせ直す」（枠の下）で、今のプレーヤーの時刻を読み直す
- **速さ**：API は頼むだけで保証が無い。`setPlaybackRate` を呼び、0.6秒後に `getPlaybackRate` で確かめて、変わらなければ「できませんでした。速さは YouTube の側（動画の歯車）で」と知らせる。YouTube の側で変えた速さも onPlaybackRateChange で表示に追いかける
- **曲のファイルとは同時に使わない**：曲を読み込むと動画を閉じる。動画を出している間は「動画に書き出す」を断る（YouTube の音は書き出せない）
- **大きく表示**：枠が隠れるので、先に止める（隠したまま鳴らさない）。戻っても自動では再生しない

### 守る条件（YouTube の決まり）
- 枠の上に何も重ねない（枠の入れ物は iframe 1つだけ。固定・絶対配置の物を重ねない）。16:9・幅も高さも 200px 以上。見えるまで自動で再生しない（`autoplay` を付けない・allow に autoplay を入れない・押されたときだけ `playVideo`・枠が見えない状態では頼まない）。枠が画面の外にあるとき、出したとき・▶ のときに見える所へ動かす
- `youtube-nocookie.com` の埋め込み（`/embed/ID?enablejsapi=1&playsinline=1&rel=0&origin=自分`）。iframe を自分で作り、`new YT.Player(iframe)` でつなぐ（公式の「iframe を自分で書く」形。`host` の指定は公式の IFrame の文書に無いので使わない）
- 保存データは変えない。動画 ID は別のキー `danceFormation.v1.youtube` に端末の中だけ（ID の11字だけ）。作品の JSON・書き出す JSON には入らない。次に開いたとき、入れ口に `youtu.be/ID` が入るだけで、枠は自動では出さず YouTube にも通信しない。「動画を閉じる」で消える
- `file://` で開いたときは出せない（エラー 153）。「公開版（https）で使えます」と知らせて、YouTube には通信しない。プレーヤーのエラー（101・150・100・153 など）・部品が読めない・枠の準備が 15秒来ない、のときも知らせて枠を閉じ、画面は落とさない
- 通信先は `https://www.youtube.com/iframe_api`（script。続けて同じ host の www-widgetapi.js）と `https://www.youtube-nocookie.com/embed/…`（枠）だけ。動画を出すまで通信しない

### 確かめ方
`C:\Users\osm12\family\tools\formation\tests\` の `run_youtube_tests.js`（Y1〜Y6。使い方は tests の README）。
