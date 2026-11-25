// プライバシーポリシーの1枚と、YouTube の動画を初めて出すときの同意（1回だけ）
/* ===== プライバシーポリシー・同意 ===== */
const YT_CONSENT_KEY = LS_KEY + '.ytConsent'; // 同意した日付（YYYY-MM-DD）だけ。端末の中だけ。作品の JSON には入れない
const YT_POLICY_DATE = '2026-11-26';          // 今のポリシーの最終改定日（同意の印に書く）
const YT_CONSENT_RE = /^\d{4}-\d{2}-\d{2}$/;
let privacyOpener = null;   // ポリシーを開く前に押されていた物（閉じたら戻す）
let consentResume = null;   // 同意されたら続ける処理（動画を出す）

function ytHasConsent() {
  try { return YT_CONSENT_RE.test(localStorage.getItem(YT_CONSENT_KEY) || ''); } catch (e) { return false; }
}
function ytSaveConsent() {
  try { localStorage.setItem(YT_CONSENT_KEY, YT_POLICY_DATE); } catch (e) { }
}

function openPrivacy() {
  privacyOpener = document.activeElement;
  $('#privacyBox').hidden = false;
  $('#privacyBox').scrollTop = 0;
  $('#btnPrivacyClose').focus();
}
function closePrivacy() {
  $('#privacyBox').hidden = true;
  const o = privacyOpener;
  privacyOpener = null;
  try { if (o && o.focus && document.contains(o) && !o.closest('[hidden]')) o.focus(); } catch (e) { }
}

function closeConsent() {
  $('#ytConsentBox').hidden = true;
  consentResume = null;
}
// 同意を確かめる（next：同意されたあとに続ける処理）。リンクは設定タブのカードの物を写して使う（アドレスを1か所にするため）
function ytAskConsent(next) {
  consentResume = next;
  const links = $('#ytTermsLinks').cloneNode(true);
  links.removeAttribute('id');
  $('#ytConsentLinks').textContent = '';
  $('#ytConsentLinks').append(links);
  $('#ytConsentBox').hidden = false;
  $('#btnYtAgree').focus();
}

// 「このアプリのプライバシーポリシー」のボタン（設定タブのカードと同意の確認の中。写した物にも効くよう、まとめて受ける）
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('[data-open-privacy]')) openPrivacy();
});
$('#btnPrivacyClose').addEventListener('click', closePrivacy);
$('#btnPrivacyClose2').addEventListener('click', closePrivacy);
$('#btnYtAgree').addEventListener('click', () => {
  const go = consentResume;
  ytSaveConsent();
  closeConsent();
  if (go) go();
});
$('#btnYtDecline').addEventListener('click', () => {
  closeConsent();
  $('#ytMsg').textContent = '同意しないと YouTube の動画は使えません。曲のファイルは、そのまま使えます';
});
// 開いている間は、Space で再生・停止にならないようにする。Esc で閉じる
['#privacyBox', '#ytConsentBox'].forEach(sel => $(sel).addEventListener('keydown', e => {
  if (e.code === 'Space') e.stopPropagation();
  if (e.key === 'Escape') {
    e.stopPropagation();
    if (sel === '#privacyBox') closePrivacy();
    else $('#btnYtDecline').click();
  }
}));
