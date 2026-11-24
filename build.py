#!/usr/bin/env python3
"""フォーメーション練習アプリの組み立て＋検査（Python の標準ライブラリだけ）。

使い方（このフォルダで）：
  python -I build.py             source/index.html の @include を展開 → 検査 → 合格のときだけ dist/ に出す
  python -I build.py --check     検査だけ（dist は書かない）
  python -I build.py --publish   dist/index.html を、公開用のルートの index.html に写す（sha256 が build.json と同じときだけ）
  python -I build.py --verify    ルートの index.html が build.json の sha256 と同じか確かめる

不合格のときは終了番号 1 で止まり、dist は書き換えない。
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "source")
DIST = os.path.join(ROOT, "dist")
MAX_LINE = 500  # source の .js・.css・.html の1行の字数の上限

# 外部参照の検査の例外。ここに書いた物だけ許す（理由も README の「検査の例外」に書く）。
EXTERNAL_EXCEPTIONS = [
    {
        "file": "js/ui/setup.js",
        "contains": "location.protocol === 'https:'",
        "reason": "通信先ではない。https で開いたときだけ、電波がなくても動くための sw.js を登録する判定",
    },
]

INCLUDE_RE = re.compile(r"^\s*<!--\s*@include\s+(\S+)\s*-->\s*$")


class BuildError(Exception):
    pass


def read(path):
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def expand(rel, stack, sources):
    """rel（source からの相対）を読み、@include を展開した文字列を返す。無い・ぐるぐる回る参照は止める。"""
    if rel in stack:
        raise BuildError("@include がぐるぐる回っています: " + " -> ".join(stack + [rel]))
    path = os.path.normpath(os.path.join(SRC, rel))
    if not path.startswith(SRC + os.sep):
        raise BuildError("source の外は読めません: " + rel)
    if not os.path.isfile(path):
        raise BuildError("@include の先がありません: " + rel)
    text = read(path)
    if rel not in [s["file"] for s in sources]:
        sources.append({"file": rel, "lines": text.count("\n") + (0 if text.endswith("\n") else 1)})
    out = []
    for line in text.split("\n"):
        m = INCLUDE_RE.match(line)
        if m:
            out.append(expand(m.group(1), stack + [rel], sources).rstrip("\n"))
        else:
            out.append(line)
    return "\n".join(out)


def js_order(text_rel="index.html"):
    """index.html から見た .js の取り込み順（最上位の名前の検査用）。"""
    order = []

    def walk(rel):
        text = read(os.path.join(SRC, rel))
        for line in text.split("\n"):
            m = INCLUDE_RE.match(line)
            if m:
                inc = m.group(1)
                if inc.endswith(".js"):
                    order.append(inc)
                else:
                    walk(inc)

    walk(text_rel)
    return order


# ---------------- 検査 ----------------
def check_line_length(files):
    bad = []
    for rel in files:
        if not rel.endswith((".js", ".css", ".html")):
            continue
        for n, line in enumerate(read(os.path.join(SRC, rel)).split("\n"), 1):
            if len(line) > MAX_LINE:
                bad.append("%s:%d (%d字)" % (rel, n, len(line)))
    return bad


def check_crlf(files):
    return [rel for rel in files if "\r" in read(os.path.join(SRC, rel))]


EXT_PATTERNS = [
    re.compile(r"https?:"),
    re.compile(r"""(?:src|href|action)\s*=\s*["']?//"""),
    re.compile(r"""url\(\s*["']?(?!data:|#)[^)]*//"""),
    re.compile(r"@import"),
]


def check_external(files):
    bad = []
    for rel in files:
        if not rel.endswith((".js", ".css", ".html")):
            continue
        for n, line in enumerate(read(os.path.join(SRC, rel)).split("\n"), 1):
            if "Content-Security-Policy" in line:
                continue  # CSP の文の中は対象外
            if not any(p.search(line) for p in EXT_PATTERNS):
                continue
            if any(e["file"] == rel and e["contains"] in line for e in EXTERNAL_EXCEPTIONS):
                continue
            bad.append("%s:%d %s" % (rel, n, line.strip()[:80]))
    return bad


DECL_RE = re.compile(r"^(?:const|let|var)\s+(.*)$")
FUNC_RE = re.compile(r"^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)")
IDENT_RE = re.compile(r"[A-Za-z_$][\w$]*")


def declared_names(rest):
    """const/let/var の後ろ（1行目）から、depth 0 のカンマで区切った宣言の名前を取る。"""
    if rest.lstrip().startswith(("[", "{")):
        raise BuildError("最上位の分割代入は検査が読めません: " + rest[:40])
    names, depth, q, cur = [], 0, None, []
    parts = []
    i = 0
    while i < len(rest):
        c = rest[i]
        if q:
            cur.append(c)
            if c == "\\":
                cur.append(rest[i + 1] if i + 1 < len(rest) else "")
                i += 1
            elif c == q:
                q = None
        elif c in "'\"`":
            q = c
            cur.append(c)
        elif c in "([{":
            depth += 1
            cur.append(c)
        elif c in ")]}":
            depth -= 1
            cur.append(c)
        elif c == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        elif c == ";" and depth == 0:
            break
        else:
            cur.append(c)
        i += 1
    parts.append("".join(cur))
    for p in parts:
        m = IDENT_RE.match(p.strip())
        if m:
            names.append(m.group())
    return names


def top_level_names(text):
    names = []
    in_block_comment = False
    for line in text.split("\n"):
        if in_block_comment:
            if "*/" in line:
                in_block_comment = False
            continue
        if line.startswith("/*") and "*/" not in line:
            in_block_comment = True
            continue
        m = FUNC_RE.match(line)
        if m:
            names.append(m.group(1))
            continue
        m = DECL_RE.match(line)
        if m:
            names.extend(declared_names(m.group(1)))
    return names


def check_top_level_names(order):
    seen, dup = {}, []
    for rel in order:
        for name in top_level_names(read(os.path.join(SRC, rel))):
            if name in seen:
                dup.append("%s（%s と %s）" % (name, seen[name], rel))
            else:
                seen[name] = rel
    return dup, len(seen)


def check_html_ids(html):
    body = re.sub(r"<script\b.*?</script>", "", html, flags=re.S)
    body = re.sub(r"<style\b.*?</style>", "", body, flags=re.S)
    ids = re.findall(r"""\sid\s*=\s*["']([^"']+)["']""", body)
    seen, dup = set(), []
    for i in ids:
        if i in seen:
            dup.append(i)
        seen.add(i)
    return dup, len(ids)


def check_script_safety(order):
    bad = []
    for rel in order:
        t = read(os.path.join(SRC, rel))
        if re.search(r"</script", t, re.I):
            bad.append(rel + " に </script がある")
        if "<!--" in t:
            bad.append(rel + " に <!-- がある")
    return bad


def check_use_strict(order):
    if not order:
        return ["js が1つも取り込まれていない"]
    for line in read(os.path.join(SRC, order[0])).split("\n"):
        s = line.strip()
        if not s or s.startswith("//") or s.startswith("/*"):
            continue
        return [] if s in ("'use strict';", '"use strict";') else [order[0] + " の最初の文が 'use strict' でない"]
    return [order[0] + " が空"]


def run_checks(files, order, html):
    results = []

    def add(name, problems, detail=""):
        results.append({"name": name, "ok": not problems, "detail": detail if not problems else "; ".join(problems[:20])})

    add("1行%d字以内" % MAX_LINE, check_line_length(files), "source %d ファイル" % len(files))
    add("改行は LF", check_crlf(files))
    ext = check_external(files)
    add("外部参照なし（例外 %d 件）" % len(EXTERNAL_EXCEPTIONS), ext)
    dup, n_names = check_top_level_names(order)
    add("最上位の名前の重なりなし", dup, "%d 個の名前" % n_names)
    dup_ids, n_ids = check_html_ids(html)
    add("id の重なりなし", dup_ids, "%d 個の id" % n_ids)
    add("script の中に </script と <!-- がない", check_script_safety(order))
    add("先頭が 'use strict'", check_use_strict(order))
    return results


# ---------------- 命令 ----------------
def sha256_of(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def build(write):
    sources = []
    html = expand("index.html", [], sources)
    if not html.endswith("\n"):
        html += "\n"
    files = [s["file"] for s in sources]
    order = js_order()
    results = run_checks(files, order, html)
    for r in results:
        print(("合格 " if r["ok"] else "不合格 ") + r["name"] + ("  " + r["detail"] if r["detail"] else ""))
    if not all(r["ok"] for r in results):
        print("検査に通らないので、dist は書き換えません。")
        return 1
    if not write:
        print("検査だけ：合格")
        return 0
    data = html.encode("utf-8")
    info = {
        "app": "formation",
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
        "lines": html.count("\n"),
        "sources": sources,
        "checks": results,
        "externalExceptions": EXTERNAL_EXCEPTIONS,
    }
    os.makedirs(DIST, exist_ok=True)
    with open(os.path.join(DIST, "index.html"), "wb") as f:
        f.write(data)
    with open(os.path.join(DIST, "build.json"), "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(info, ensure_ascii=False, indent=2) + "\n")
    print("dist/index.html を書きました（%d バイト・%d 行・sha256 %s）" % (len(data), info["lines"], info["sha256"][:16]))
    return 0


def load_info():
    p = os.path.join(DIST, "build.json")
    if not os.path.isfile(p):
        raise BuildError("dist/build.json がありません。先に build.py を動かしてください")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def publish():
    info = load_info()
    src = os.path.join(DIST, "index.html")
    if sha256_of(src) != info["sha256"]:
        raise BuildError("dist/index.html が build.json の sha256 と違います（組み立て直してください）")
    with open(src, "rb") as f:
        data = f.read()
    with open(os.path.join(ROOT, "index.html"), "wb") as f:
        f.write(data)
    print("公開用の index.html を dist/index.html の写しにしました（sha256 %s）" % info["sha256"][:16])
    return 0


def verify():
    info = load_info()
    got = sha256_of(os.path.join(ROOT, "index.html"))
    if got != info["sha256"]:
        print("不一致：ルートの index.html %s ／ build.json %s" % (got[:16], info["sha256"][:16]))
        return 1
    print("一致：ルートの index.html は build.json の sha256 と同じ（%s）" % got[:16])
    return 0


def main(argv):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        if "--publish" in argv:
            return publish()
        if "--verify" in argv:
            return verify()
        return build(write="--check" not in argv)
    except BuildError as e:
        print("止まりました: " + str(e))
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
