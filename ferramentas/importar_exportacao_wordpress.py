#!/usr/bin/env python3
"""Resgata textos originais de exportações WordPress WXR XML/ZIP sem reescrever."""
import argparse, hashlib, html, json, re, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from html.parser import HTMLParser

WP="{http://wordpress.org/export/1.2/}"
CONTENT="{http://purl.org/rss/1.0/modules/content/}"
class Plain(HTMLParser):
    def __init__(self): super().__init__();self.parts=[]
    def handle_starttag(self,tag,attrs):
        if tag in ("p","br","div","h1","h2","h3","li","blockquote"):self.parts.append("\n")
    def handle_data(self,data):self.parts.append(data)
    def text(self):return re.sub(r"\n{3,}","\n\n",html.unescape("".join(self.parts))).strip()
def safe(s):return re.sub(r"[^a-z0-9-]+","-",(s or "").lower()).strip("-") or "sem-slug"
def xml_files(source):
    if source.suffix.lower()==".xml":return [(source.name,source.read_bytes())]
    if source.suffix.lower()==".zip":
        with zipfile.ZipFile(source) as z:return [(f,z.read(f)) for f in z.namelist() if f.lower().endswith(".xml") and not f.startswith("__MACOSX/")]
    raise ValueError("Indicar exportação WordPress XML ou ZIP com XML")
def run():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("exportacao",type=Path)
    p.add_argument("--saida",type=Path,default=Path("arquivo/manuscritos-originais"))
    a=p.parse_args()
    files=xml_files(a.exportacao)
    if not files:raise ValueError("Nenhum XML no ZIP")
    a.saida.mkdir(parents=True,exist_ok=True)
    manifest=[]
    for filename,blob in files:
        channel=ET.fromstring(blob).find("channel")
        if channel is None:raise ValueError("XML WordPress inválido: "+filename)
        for item in channel.findall("item"):
            typ=item.findtext(WP+"post_type","")
            status=item.findtext(WP+"status","")
            if typ not in ("post","page") or status!="publish":continue
            pid=item.findtext(WP+"post_id","")
            slug=item.findtext(WP+"post_name","")
            title=item.findtext("title","")
            body=item.findtext(CONTENT+"encoded")
            entry={"id":pid,"slug":slug,"titulo":title,"tipo":typ,"url":item.findtext("link",""),"fonte":filename}
            if not body or len(body.strip())<40:
                manifest.append({**entry,"estado":"sem_texto_na_exportacao"});continue
            folder=a.saida/("publicacoes" if typ=="post" else "paginas")/(pid+"-"+safe(slug))
            folder.mkdir(parents=True,exist_ok=True)
            (folder/"original.html").write_text(body,encoding="utf8")
            plain=Plain();plain.feed(body)
            (folder/"original.txt").write_text(plain.text(),encoding="utf8")
            entry.update({"estado":"recuperado_integral","sha256":hashlib.sha256(body.encode()).hexdigest(),"caracteres":len(body)})
            (folder/"proveniencia.json").write_text(json.dumps(entry,ensure_ascii=False,indent=2),encoding="utf8")
            manifest.append(entry)
    (a.saida/"inventario.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
    print(json.dumps({"recuperados":sum(x["estado"]=="recuperado_integral" for x in manifest),"nao_completos":sum(x["estado"]!="recuperado_integral" for x in manifest)},ensure_ascii=False))
if __name__=="__main__":run()
