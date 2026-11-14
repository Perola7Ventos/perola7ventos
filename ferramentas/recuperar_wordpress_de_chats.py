#!/usr/bin/env python3
"""Extrai versões ORIGINAIS de conteúdos WordPress dos registos de execução
incluídos numa exportação de conversas ChatGPT, quando esses registos existam.

Não reescreve ficções nem cria conteúdos de preenchimento.
Uso: python recuperar_wordpress_de_chats.py export_chatgpt.zip
     python recuperar_wordpress_de_chats.py conversations.json
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

TARGETS = ("258596861", "perola7ventos.wordpress.com")
TOOL_RE = re.compile(r"WordPress|wpcom[_-]|wpcom_mcp", re.I)

def read_export(p: Path):
    if p.suffix.lower() == ".zip":
        with zipfile.ZipFile(p) as z:
            match = next((n for n in z.namelist()
                          if n.lower().endswith("conversations.json")), None)
            if not match:
                raise SystemExit("Não foi encontrado conversations.json no ZIP.")
            return json.loads(z.read(match))
    return json.loads(p.read_text(encoding="utf-8"))

def objects(value, depth=0):
    if depth > 14:
        return
    if isinstance(value, dict):
        yield value
        for v in value.values():
            yield from objects(v, depth + 1)
    elif isinstance(value, list):
        for v in value:
            yield from objects(v, depth + 1)
    elif isinstance(value, str) and value.lstrip().startswith(("{", "[")):
        try:
            parsed = json.loads(value)
            yield from objects(parsed, depth + 1)
        except (ValueError, RecursionError):
            pass

def messages(conversation):
    mapping = conversation.get("mapping")
    if isinstance(mapping, dict):
        for node in mapping.values():
            if isinstance(node, dict) and isinstance(node.get("message"), dict):
                yield node["message"]
    for item in conversation.get("messages", []):
        if isinstance(item, dict):
            yield item

def safe(s):
    s = re.sub(r"[^0-9a-zA-Z_-]+", "-", str(s)).strip("-")
    return s[:75] or "sem-titulo"

def raw_content(o):
    c = o.get("content")
    if isinstance(c, dict):
        c = c.get("raw")
    return c if isinstance(c, str) else ""

def extract(export, output):
    convs = export if isinstance(export, list) else export.get("conversations", [])
    if not isinstance(convs, list):
        raise SystemExit("Formato de exportação não reconhecido.")
    output.mkdir(parents=True, exist_ok=True)
    manifest = []
    seen = set()
    for conversation in convs:
        title = conversation.get("title", "Conversa") if isinstance(conversation, dict) else "Conversa"
        if not isinstance(conversation, dict):
            continue
        for message in messages(conversation):
            context = json.dumps({
                "recipient": message.get("recipient"),
                "author": message.get("author"),
                "metadata": message.get("metadata"),
            }, ensure_ascii=False, default=str)
            # Só extrair elementos associados explicitamente ao WordPress
            # OU com id do site e markup Gutenberg inequívoco.
            for o in objects(message):
                content = raw_content(o)
                if len(content) < 120:
                    continue
                site = str(o.get("wpcom_site", ""))
                if site and not any(t in site for t in TARGETS):
                    continue
                if not site and not (TOOL_RE.search(context) and
                                     ("<!-- wp:" in content or "<p" in content)):
                    continue
                if "<!-- wp:" not in content and "<p" not in content and "<div" not in content:
                    continue
                digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
                if digest in seen:
                    continue
                seen.add(digest)
                pid = o.get("id") or o.get("post_id") or "sem-id"
                slug = safe(o.get("slug") or o.get("title") or f"item-{pid}")
                kind = "desconhecido"
                if "posts" in context.lower(): kind = "artigos"
                if "pages" in context.lower(): kind = "paginas"
                folder = output / kind
                folder.mkdir(exist_ok=True)
                name = f"{safe(pid)}-{slug}-{digest[:10]}.html"
                target = folder / name
                target.write_text(content, encoding="utf-8")
                manifest.append({
                    "arquivo": str(target.relative_to(output)),
                    "id": pid,
                    "slug": o.get("slug"),
                    "titulo": o.get("title"),
                    "conversa": title,
                    "sha256": digest,
                    "bytes": len(content.encode("utf-8")),
                    "origem": "registo de execução da exportação ChatGPT",
                })
    (output / "MANIFESTO.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / "RELATORIO.txt").write_text(
        f"Versões originais encontradas: {len(manifest)}\n"
        "Zero textos reescritos ou inventados.\n"
        "Uma exportação pode omitir argumentos internos das ferramentas;\n"
        "nesse caso, não se pode reconstruir o conteúdo a partir dela.\n",
        encoding="utf-8")
    return len(manifest)

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("exportacao", type=Path)
    p.add_argument("--saida", type=Path, default=Path("wordpress_extraido_dos_chats"))
    a = p.parse_args()
    print("Ficheiros extraídos:", extract(read_export(a.exportacao), a.saida))
