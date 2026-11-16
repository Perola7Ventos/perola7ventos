#!/usr/bin/env python3
"""Guardião editorial: evita regressões em títulos, navegação e conteúdo."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors = []

def check(condition, description):
    if not condition:
        errors.append(description)

def read(path):
    p = ROOT / path
    check(p.is_file(), f"Ficheiro em falta: {path}")
    return p.read_text(encoding="utf-8") if p.is_file() else ""

canonical = json.loads(read("arquivo/inventario/IDENTIDADE_EDITORIAL_CANONICA.json"))
fiction = json.loads(read("arquivo/inventario/ficcao-canonica.json"))
names = [x["title"] for x in canonical["sections"]]
slugs = [x["slug"] for x in canonical["sections"]]
check(len(names) == len(set(names)) == len(set(slugs)) == 7, "As sete secções devem ser distintas.")
nav = read("assets/site.js")
for name, slug in zip(names, slugs):
    check(name in nav, f"Nome do menu ausente: {name}")
    html = read(f"{slug}/index.html")
    check('<main id="conteudo"' in html, f"Área principal em falta: {slug}")
    check("Conteúdo original por recuperar" not in html, f"Página principal vazia: {slug}")
    check("portal-main" in html, f"Entrada editorial não aplicada: {slug}")

title = canonical["fiction"]["canonical_title"]
slug = canonical["fiction"]["canonical_url"]
story = read(slug + "index.html")
check(title in story, "Título definitivo da Reunião Pré-Tour em falta.")
check("reuniao-pre-tour-aprovada.webp" in story, "Capa da Reunião Pré-Tour em falta.")
check("— MAS EU SÓ COMI" in story, "Corpo do manuscrito da Reunião Pré-Tour em falta.")
check((ROOT / "assets/capas/reuniao-pre-tour-aprovada.webp").is_file(), "Capa original desapareceu.")
check("OS DRAGÕES DE JUNGKOOK" not in read("index.html"), "A homepage voltou ao título antigo.")

oneshots = fiction["oneshots"]
complete = [x for x in oneshots if x["status"] == "complete"]
check(len(oneshots) == 22 and len(complete) >= 7, "Índice das one-shots perdeu obras.")
for item in complete:
    path = item["url"] + "index.html"
    html = read(path)
    check("Conteúdo original por recuperar" not in html, f"Texto integral perdido: {path}")
    check(item["genre"] in canonical["fiction"]["one_shot_categories"], f"Género não reconhecido: {path}")

series = next((x for x in fiction["longfics"] if x["slug"] == "a-rua-das-duas-horas"), None)
check(series is not None and series["recovered_chapters"] >= 15, "Longfic perdeu capítulos recuperados.")

from_pages = [
    *[f"warehouse-0613/{slug}/index.html" for slug in ("namjoon","seokjin","yoongi","hoseok","jimin","taehyung","jungkook")],
    *[f"korean-corner/{slug}/index.html" for slug in (
      "hangul-uma-revolucao-em-letras","coreano-em-contexto-aprender-a-comunicar",
      "satoori-sotaques-e-dialetos-coreanos","historia-coreia-camadas-de-memoria",
      "hanok-hanbok-arquitetura-e-identidade","hanji-papel-coreano-tradicao-e-oficio",
      "bojagi-e-maedeup-tecidos-nos-e-memoria","dancheong-yeondeunghoe-cores-lanternas",
      "minhwa-pintura-popular-e-simbolismo","mudang-gut-xamanismo-coreano",
      "saju-quatro-pilares-cinco-elementos","dalmaji-dalmajung-a-lua-entre-tradicao-e-recriacao",
      "seollal-dano-chuseok-festas-coreanas","kimjang-e-a-mesa-coreana",
      "etiqueta-coreana-cumprimentos-mesa-e-formalidade","pansori-nongak-voz-ritmo-comunidade",
      "taekkyeon-ssireum-desporto-tradicional","arirang-talchum-haenyeo-patrimonio-vivo",
      "jikji-livros-impressao-goryeo")],
    *[f"warehouse-0613/bts/musica/{slug}/index.html" for slug in (
      "dark-and-wild","wings","love-yourself-tear","map-of-the-soul-7","be","arirang",
      "wake-up","youth","face-yourself","map-of-the-soul-7-the-journey",
      "the-best-of-bts-japan-edition","the-best-of-bts-korea-edition-japan","bts-the-best")]
]
check(len(from_pages) == 39, "Número de páginas editoriais alterado.")
for path in from_pages:
    html = read(path)
    check("Conteúdo original por recuperar" not in html, f"Página editorial ficou vazia: {path}")
    check("href=" in html, f"Página editorial sem fontes ou navegação: {path}")

for path in (
    "echos-of-ink/ink-reflections/your-library/",
    "echos-of-ink/ink-reflections/reviews/",
    "echos-of-ink/ink-reflections/dnf/",
    "echos-of-ink/ink-reflections/hidden-pearls/",
    "echos-of-ink/ink-reflections/recommendations/",
    "echos-of-ink/ink-reflections/your-library/currently-reading/",
    "echos-of-ink/ink-reflections/your-library/shelfies/"):
    check("assets/library.js" in read(path+"index.html"), f"Biblioteca sem funcionamento: {path}")

read("assets/library.js")
check("data-library-view" in read("assets/library.js"), "Biblioteca sem controlador de estados.")
check("os-dragoes-de-jungkook" not in read("index.html"), "Ligação histórica reintroduzida na homepage.")

if errors:
    for error in errors:
        print("FALHA EDITORIAL | " + error)
    raise SystemExit(f"Guarda editorial: {len(errors)} falhas")
print("Guarda editorial: 7 secções, 39 páginas editoriais, 7 obras integrais e biblioteca verificados.")
