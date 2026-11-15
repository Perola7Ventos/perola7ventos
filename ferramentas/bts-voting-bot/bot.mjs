import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'artifacts');
const campaigns=JSON.parse(await readFile(path.join(root,'campaigns.json'),'utf8'));
const flags=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const [k,...v]=x.slice(2).split('=');return [k,v.join('=')||'true'];}));
const mode=flags.mode||process.env.MODE||'probe';
const poll=flags.poll||process.env.POLL||'all';
const override=flags.candidate||process.env.CANDIDATE||'';
const headless=(flags.headless||process.env.HEADLESS||'true')!=='false';
if(!['probe','vote'].includes(mode))throw Error('Mode must be probe or vote');
if(override&&poll==='all')throw Error('Choose --poll for candidate override');
const requestedIds=new Set(String(poll).split(',').map(s=>s.trim()));
const chosen=campaigns.filter(c=>poll==='all'||requestedIds.has(c.id));
if(!chosen.length||new Set(campaigns.map(c=>c.id)).size!==campaigns.length)throw Error('Invalid campaign configuration');
await mkdir(out,{recursive:true});
if(mode==='vote' && Date.now()>=Date.parse('2026-12-11T00:00:00Z')){
  const result={mode,poll,status:'fora_do_prazo',message:'Campanha 2026 terminada'};
  await writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));
  console.log(result.message);
  process.exit(0);
}
const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
const escaped=s=>String(s).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
const re=s=>new RegExp('^\\s*'+escaped(s)+'\\s*$','i');

async function snapshot(page,target){
  return page.evaluate(name=>{
    const norm=s=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
    const requested=norm(name);
    const inputs=Array.from(document.querySelectorAll('input[type="radio"],input[type="checkbox"]'));
    const choices=inputs.map(el=>{
      const label=el.closest('label')||(el.id?document.querySelector('label[for="'+CSS.escape(el.id)+'"]'):null);
      const container=label||el.closest('[role="radio"],li,.candidate,.option,.nominee')||el.parentElement;
      const text=norm(container?.textContent||'');
      return {text:text.slice(0,120),value:el.value,checked:el.checked,match:text===requested||(text.startsWith(requested+' ')&&text.length<requested.length+30)};
    });
    const buttons=Array.from(document.querySelectorAll('button,input[type="submit"],[role="button"]'))
      .filter(el=>el.getClientRects().length).map(el=>norm(el.innerText||el.value||el.getAttribute('aria-label'))).slice(0,60);
    const candidateLabels=Array.from(document.querySelectorAll('label,[role="radio"],[role="option"]')).filter(el=>norm(el.textContent)===requested).length;
    return {title:document.title,radioCount:inputs.length,matches:choices.filter(x=>x.match).slice(0,10),checked:choices.filter(x=>x.checked).slice(0,10),buttons,candidateLabels};
  },target);
}
async function voteButton(page){
  const variants=[page.getByRole('button',{name:/^vote$/i}),page.locator('input[type="submit"][value="Vote" i]'),page.getByText(/^Vote$/i)];
  for(const loc of variants){
    const n=Math.min(await loc.count().catch(()=>0),15);
    for(let i=0;i<n;i++){
      const item=loc.nth(i);
      if(await item.isVisible().catch(()=>false)&&await item.isEnabled().catch(()=>false))return item;
    }
  }
  return null;
}
async function pick(page,candidate){
  // Pop Golden: cada opção é um .card-poll que guarda o ID num input oculto.
  // Uma seleção válida aplica a classe .selected ao cartão, não a um input radio.
  const cards=page.locator('.option-container-details .card-poll').filter({
    has:page.locator('.title-div p').filter({hasText:new RegExp(escaped(candidate),'i')})
  });
  const cardCount=await cards.count();
  for(let i=0;i<Math.min(cardCount,12);i++){
    const card=cards.nth(i);
    if(!await card.isVisible().catch(()=>false))continue;
    const title=await card.locator('.title-div p').first().innerText().catch(()=>null);
    if(!title||!title.toLowerCase().includes(candidate.toLowerCase()))continue;
    await card.click({timeout:4500});
    await page.waitForTimeout(300);
    if(await card.evaluate(el=>el.classList.contains('selected')).catch(()=>false))return true;
  }
  const candidates=[page.getByRole('radio',{name:re(candidate)}),page.getByLabel(re(candidate)),page.locator('label').filter({hasText:re(candidate)}),page.getByText(re(candidate))];
  for(const loc of candidates){
    const n=Math.min(await loc.count().catch(()=>0),15);
    for(let i=0;i<n;i++){
      const node=loc.nth(i);
      if(!await node.isVisible().catch(()=>false))continue;
      try{
        const type=await node.getAttribute('type').catch(()=>null);
        if(type==='radio'||type==='checkbox')await node.check({timeout:3000});
        else await node.click({timeout:3000});
        await page.waitForTimeout(250);
        if((await snapshot(page,candidate)).matches.some(x=>x.checked))return true;
      }catch{}
    }
  }
  const index=await page.evaluate(name=>{
    const wanted=(name||'').toLowerCase();
    const radios=Array.from(document.querySelectorAll('input[type="radio"]'));
    return radios.findIndex(el=>{
      const t=(el.closest('label')||el.parentElement?.parentElement||el.parentElement)?.textContent?.trim().toLowerCase()||'';
      return t===wanted||t.startsWith(wanted+' ');
    });
  },candidate);
  if(index>=0){
    try{
      await page.locator('input[type="radio"]').nth(index).check({timeout:4000});
      return (await snapshot(page,candidate)).matches.some(x=>x.checked);
    }catch{}
  }
  return false;
}
const browser=await chromium.launch({headless,args:['--disable-dev-shm-usage']});
const results=[];
for(const c of chosen){
  const name=override||c.candidate;
  const entry={id:c.id,category:c.category,candidate:name,url:c.url,mode,status:'indisponivel',timestamp:new Date().toISOString()};
  const context=await browser.newContext({viewport:{width:1365,height:900},locale:'pt-PT'});
  const page=await context.newPage();
  const responses=[];
  page.on('response',r=>{
    if(r.request().method()==='POST'&&/poll|vote|ballot|submit/i.test(r.url())){
      try{const u=new URL(r.url());responses.push({status:r.status(),url:u.origin+u.pathname});}catch{}
    }
  });
  try{
    const nav=await page.goto(c.url,{waitUntil:'domcontentloaded',timeout:45000});
    entry.http=nav?.status()||null;
    await page.waitForTimeout(2500);
    entry.before=await snapshot(page,name);
    if(mode==='probe'){
      await writeFile(path.join(out,c.id+'.html'),await page.content());
      entry.domSample=await page.evaluate(candidate=>{
        const wanted=candidate.toLowerCase();
        const nodes=Array.from(document.querySelectorAll('body *')).filter(el=>el.children.length===0 && el.textContent?.trim().toLowerCase()===wanted).slice(0,8);
        return {candidate:nodes.map(el=>el.parentElement?.parentElement?.outerHTML.slice(0,1300)),radios:Array.from(document.querySelectorAll('input[type="radio"]')).slice(0,8).map(el=>el.outerHTML)};
      },name);
    }
    entry.voteButton=Boolean(await voteButton(page));
    if(mode==='probe'){
      entry.previewSelection=await pick(page,name);
      entry.status=entry.previewSelection?'selecionado':'indisponivel';
    }else if(!await pick(page,name)){
      entry.status='erro';entry.error='Não foi possível confirmar a seleção do candidato';
    }else{
      entry.status='selecionado';
      const button=await voteButton(page);
      if(!button){entry.status='erro';entry.error='Botão Vote não encontrado';}
      else{
        await button.click({timeout:9000});
        await page.waitForTimeout(3200);
        entry.status='submetido_nao_confirmado';
        entry.postResponses=responses;
        const notice=page.getByText(/thank you for (your )?vot(e|ing)|vote (was )?(successful|recorded|submitted)|voto (registado|confirmado|aceite)/i).first();
        if(await notice.isVisible().catch(()=>false))entry.status='confirmado';
        entry.afterText=clean(await page.locator('body').innerText().catch(()=>'' )).slice(-500);
      }
    }
  }catch(e){entry.status='erro';entry.error=clean(e.message).slice(0,350);}
  finally{
    try{await page.screenshot({path:path.join(out,c.id+'.png'),fullPage:false,timeout:10000});}catch{}
    await context.close();
    results.push(entry);
    console.log(JSON.stringify({id:entry.id,status:entry.status,error:entry.error||null}));
  }
}
await browser.close();
await writeFile(path.join(out,'results.json'),JSON.stringify({mode,poll,generated:new Date().toISOString(),results},null,2));
const summary=['# BTS Voting Bot','','| Votação | Candidato | Estado | Vote visível |','|---|---|---|---|',...results.map(r=>'| '+r.id+' | '+r.candidate+' | '+r.status+' | '+(r.voteButton?'sim':'não')+' |')].join('\n')+'\n';
await writeFile(path.join(out,'SUMMARY.md'),summary);
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,summary,{flag:'a'});
if(results.some(r=>r.status==='erro'))process.exitCode=1;
