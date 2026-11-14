#!/usr/bin/env python3
"""Resgate por canais públicos dos originais WordPress. Nunca gera substituições."""
import concurrent.futures, datetime, hashlib, html, json, os, pathlib, re, time
from html.parser import HTMLParser
from urllib.parse import quote
import requests

SITE="perola7ventos.wordpress.com"
SITE_ID="258596861"
BASE=pathlib.Path("arquivo/resgate-wordpress")
BASE.mkdir(parents=True,exist_ok=True)
SESSION=requests.Session()
SESSION.headers.update({"User-Agent":"Perola7Ventos-Manuscript-Recovery/1.0 (owner archive rescue)"})
TODAY=datetime.datetime.now(datetime.timezone.utc).isoformat()
LOG=[]
class Clean(HTMLParser):
    def __init__(self): super().__init__();self.bits=[]
    def handle_data(self,d): self.bits.append(d)
    def handle_starttag(self,t,a):
        if t in ["br","p","div","h1","h2","h3","li"]:self.bits.append("\n")
    def get(self):return re.sub(r"\n{3,}","\n\n",html.unescape("".join(self.bits))).strip()
def fetch(url,timeout=18):
    try:
        r=SESSION.get(url,timeout=timeout,allow_redirects=True)
        return r.status_code,r.text,r.headers.get("Content-Type",""),r.url
    except Exception as e:
        return 0,str(e),"",""
def valid(content):
    p=Clean();p.feed(content or "");v=p.get()
    if len(v)<150 or len(v.split())<35: return False
    blacklist=("this site has been suspended","this blog has been suspended","site has been suspended","site is suspended","this site is no longer available","page not found","content unavailable")
    return not any(b in v.lower()[:700] for b in blacklist)
def save(item,id_,source):
    raw=item.get("content",{}) or {}
    body=(raw.get("rendered",raw.get("raw","")) if isinstance(raw,dict) else raw)
    if not isinstance(body,str) or not valid(body):return False
    title=item.get("title","")
    if isinstance(title,dict):title=title.get("rendered",title.get("raw",""))
    kind="paginas" if item.get("type")=="page" else "publicacoes"
    target=BASE/kind/str(item.get("id",id_))
    target.mkdir(parents=True,exist_ok=True)
    (target/"original.html").write_text(body,encoding="utf8")
    parser=Clean();parser.feed(body)
    (target/"original.txt").write_text(parser.get(),encoding="utf8")
    (target/"origem.json").write_text(json.dumps({"id":item.get("id",id_),"titulo":title,"url":item.get("link"),"fonte":source,"recolhido_utc":TODAY,"sha256":hashlib.sha256(body.encode()).hexdigest(),"raw":item},ensure_ascii=False,indent=2),encoding="utf8")
    return True
def parse_array(result,kind,source):
    found=0
    if isinstance(result,dict):result=result.get("posts",result.get("pages",[]))
    if not isinstance(result,list):return 0
    for x in result:
        if isinstance(x,dict):
            x.setdefault("type",kind)
            if save(x,x.get("id","unknown"),source):found+=1
    return found
def scan_wp():
    probes=[
        ("wp_rest_posts",f"https://{SITE}/wp-json/wp/v2/posts?per_page=100&page=1"),
        ("wp_rest_pages",f"https://{SITE}/wp-json/wp/v2/pages?per_page=100&page=1"),
        ("wp_proxy_posts",f"https://public-api.wordpress.com/wp/v2/sites/{SITE_ID}/posts?per_page=100&page=1"),
        ("wp_proxy_pages",f"https://public-api.wordpress.com/wp/v2/sites/{SITE_ID}/pages?per_page=100&page=1"),
        ("wp_legacy_posts",f"https://public-api.wordpress.com/rest/v1.1/sites/{SITE_ID}/posts/?number=100"),
        ("wp_legacy_pages",f"https://public-api.wordpress.com/rest/v1.1/sites/{SITE_ID}/posts/?type=page&number=100"),
    ]
    for name,url in probes:
        code,body,ctype,final=fetch(url)
        entry={"metodo":name,"http":code,"length":len(body),"content_type":ctype,"endereco_final":final}
        count=0
        if code==200:
            try:count=parse_array(json.loads(body),"page" if "pages" in name else "post",url)
            except Exception as exc:entry["json_error"]=str(exc)[:250]
        entry["recuperados"]=count
        LOG.append(entry)
        print("PROBE",name,code,len(body),"RECOVERED",count,flush=True)
        if count>0 and name.startswith("wp_rest"):
            for page in range(2,5):
                u=url.replace("page=1",f"page={page}")
                c,b,_,_=fetch(u)
                if c!=200:break
                try:
                    found=parse_array(json.loads(b),"page" if "pages" in name else "post",u)
                    print("PAGE",name,page,found,flush=True)
                    if not found:break
                except Exception:break
    return
def direct_posts():
    ids=set([11,41,43,49,51,261,262,263,268,269,270,272,273,474,475,476,477,478,479])
    ids.update(range(480,553))
    api=[
       lambda i:f"https://public-api.wordpress.com/rest/v1.1/sites/{SITE_ID}/posts/{i}",
       lambda i:f"https://{SITE}/wp-json/wp/v2/posts/{i}",
       lambda i:f"https://public-api.wordpress.com/wp/v2/sites/{SITE_ID}/posts/{i}",
    ]
    # Only attempt deeper reads if a collection endpoint returned any data.
    if not any(x.get("recuperados",0)>0 for x in LOG):return
    def one(i):
      for q in api:
        url=q(i);code,body,_,_=fetch(url,timeout=10)
        if code!=200:continue
        try:
          item=json.loads(body)
          if isinstance(item,dict) and save(item,i,url):return i
        except Exception:pass
      return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
      saved=[x for x in pool.map(one,sorted(ids)) if x]
    LOG.append({"metodo":"ids_individuais","recuperados":len(saved)})
def archive():
    for host in ["https://web.archive.org/cdx/search/cdx","https://arquivo.pt/wayback/cdx"]:
        url=f"{host}?url={quote(SITE+'/*')}&output=json&filter=statuscode:200&collapse=urlkey"
        code,body,_,_=fetch(url,timeout=30)
        entry={"metodo":"arquivo", "url":url,"http":code,"bytes":len(body)}
        if code==200:
            try:
                rows=json.loads(body)
                if isinstance(rows,list) and rows and isinstance(rows[0],list):
                    fields=rows[0];arr=[dict(zip(fields,x)) for x in rows[1:]]
                    entry["snapshots"]=len(arr);(BASE/("wayback_index.json" if "web.archive" in host else "arquivo_pt_index.json")).write_text(json.dumps(arr,ensure_ascii=False,indent=2),encoding="utf8")
                    if "web.archive" in host:
                        for obj in arr[:200]:
                            orig=obj.get("original","");ts=obj.get("timestamp","")
                            if not orig or not ts:continue
                            u=f"https://web.archive.org/web/{ts}id_/{orig}"
                            c,b,_,_=fetch(u,timeout=12)
                            if c==200 and valid(b):
                                p=BASE/"capturas_wayback";p.mkdir(parents=True,exist_ok=True)
                                stem=re.sub(r"[^a-zA-Z0-9_-]","_",orig)[-110:]
                                (p/(stem+"_"+ts+".html")).write_text(b,encoding="utf8")
                else:entry["resposta"]=str(rows)[:300]
            except Exception as ex:entry["json_error"]=str(ex)[:160]
        LOG.append(entry)
        print("ARCHIVE",host,code,entry.get("snapshots",0),flush=True)
def main():
    scan_wp();direct_posts();archive()
    status={"executado_utc":TODAY,"resultados":LOG,"ficheiros_resgatados":len(list(BASE.rglob("original.html"))),"capturas":len(list(BASE.rglob("*wayback*.html")))}
    (BASE/"estado_resgate.json").write_text(json.dumps(status,ensure_ascii=False,indent=2),encoding="utf8")
    print("RESULTADO_FINAL",json.dumps(status,ensure_ascii=False),flush=True)
if __name__=="__main__":main()
