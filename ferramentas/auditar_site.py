#!/usr/bin/env python3
"""P0: auditoria das ligações locais e do site público sem alterar conteúdos."""
import argparse
import posixpath
import re
import sys
import time
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://perola7ventos.github.io/perola7ventos/"
HOST = urlsplit(BASE).hostname
PREFIX = urlsplit(BASE).path
ROUTES = [
    "", "ctrl-chaos/", "art-unbound/", "echos-of-ink/",
    "echos-of-ink/ink-fiction/", "echos-of-ink/ink-fiction/one-shots/",
    "echos-of-ink/ink-fiction/longfics/", "curiosity-cabinet/",
    "warehouse-0613/", "warehouse-0613/bts/fasciculos/",
    "korean-corner/", "7-purple-seas-loja/", "sobre/",
    "a-lenda-da-perola-dos-sete-ventos/",
    "ficcao/cracfics/reuniao-pre-tour-dragoes-raizes-ramen-e-pinguins/",
    "assets/style.css", "assets/site.js", "assets/banner-v3.webp",
]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs = []
        self.ids = set()
        self.base = None

    def handle_starttag(self, tag, pairs):
        a = dict(pairs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        if tag == "base":
            self.base = a.get("href") or self.base
        for key in ("href", "src", "poster"):
            if a.get(key) and not (tag == "base" and key == "href"):
                self.refs.append((tag+"."+key, a[key]))
        if a.get("srcset"):
            for part in a["srcset"].split(","):
                v = part.strip().split()
                if v:
                    self.refs.append(("srcset", v[0]))
    handle_startendtag = handle_starttag

def resolve(href, from_url):
    href = href.strip()
    if not href or href == "#" or href.startswith(("mailto:", "data:", "tel:", "javascript:", "blob:")):
        return None
    u = urlsplit(urljoin(from_url, href))
    if u.hostname != HOST:
        return None
    if not u.path.startswith(PREFIX):
        return ("outside", u.path, "")
    rel = unquote(u.path[len(PREFIX):])
    if rel.endswith("/") or not rel:
        rel += "index.html"
    rel = posixpath.normpath(rel)
    if rel.startswith("../") or rel == "..":
        return ("outside", rel, "")
    p = ROOT / rel
    if p.is_dir():
        p /= "index.html"
    return (p, u.path, unquote(u.fragment))

def audit_local():
    htmls = sorted(p for p in ROOT.rglob("*.html")
        if not str(p.relative_to(ROOT)).startswith("arquivo/versoes-visuais/"))
    pages = {}
    errors = []
    for p in htmls:
        parser = Page()
        parser.feed(p.read_text(encoding="utf-8"))
        pages[p.resolve()] = parser
    for path, parser in pages.items():
        rel = path.relative_to(ROOT).as_posix()
        page_url = urljoin(BASE, rel)
        if rel.endswith("/index.html"):
            page_url = page_url[:-len("index.html")]
        if parser.base:
            page_url = urljoin(page_url, parser.base)
        for role, href in parser.refs:
            resolved = resolve(href, page_url)
            if not resolved:
                continue
            local, _, fragment = resolved
            if local == "outside":
                errors.append((rel, role, href, "fora da raiz"))
            elif not local.is_file():
                errors.append((rel, role, href, "recurso não encontrado"))
            elif fragment and local.suffix.lower() == ".html":
                target = pages.get(local.resolve())
                if target and fragment not in target.ids:
                    errors.append((rel, role, href, "âncora inexistente"))
    for css in ROOT.rglob("*.css"):
        css_url = urljoin(BASE, css.relative_to(ROOT).as_posix())
        for ref in re.findall(r'url\(\s*["\x27]?([^\)"\x27]+)', css.read_text(encoding="utf-8")):
            resolved = resolve(ref, css_url)
            if resolved and (resolved[0] == "outside" or not resolved[0].is_file()):
                errors.append((str(css.relative_to(ROOT)), "css.url", ref, "recurso não encontrado"))
    print(f"Auditoria local: {len(htmls)} HTML, {len(errors)} falhas")
    for row in errors[:150]:
        print("ERRO | "+" | ".join(row))
    return len(errors) == 0

def audit_live():
    failed = []
    for route in ROUTES:
        url = urljoin(BASE, route)
        result = None
        for attempt in range(2):
            try:
                with urlopen(Request(url, headers={"User-Agent":"P7V-Site-Audit/1.0"}), timeout=15) as r:
                    result = r.status
                    if result == 200 and r.read(1):
                        break
            except Exception as exc:
                result = str(exc)
            if attempt == 0:
                time.sleep(2)
        print(f"HTTP | {result} | {route or '(início)'}")
        if result != 200:
            failed.append((route, result))
    print(f"Auditoria HTTP: {len(ROUTES)} recursos, {len(failed)} falhas")
    return not failed

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--local", action="store_true")
    parser.add_argument("--live", action="store_true")
    opts = parser.parse_args()
    if not (opts.local or opts.live):
        opts.local = opts.live = True
    success = True
    if opts.local:
        success = audit_local() and success
    if opts.live:
        success = audit_live() and success
    sys.exit(0 if success else 1)
