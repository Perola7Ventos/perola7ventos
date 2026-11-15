import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'artifacts');
const site = path.resolve(root, '../../warehouse-0613/bts/votacoes');
const candidates = JSON.parse(await readFile(path.join(root, 'campaigns.json'), 'utf8'));
const previous = JSON.parse(await readFile(path.join(site, 'data/status.json'), 'utf8'));
const flags = Object.fromEntries(process.argv.slice(2).filter(s => s.startsWith('--')).map(s => {
  const i=s.indexOf('=');
  return [s.slice(2,i<0?undefined:i),i<0?'true':s.slice(i+1)];
}));
const mode = flags.mode || process.env.MODE || 'probe';
const group = flags.group || process.env.RUN_GROUP || 'all';
const poll = flags.poll || process.env.POLL || 'all';
const override = flags.candidate || process.env.CANDIDATE || '';
if(!['vote','probe'].includes(mode))throw Error('mode deve ser probe ou vote');
if(!['all','popgolden','shining'].includes(group))throw Error('Grupo desconhecido');
if(override && poll === 'all')throw Error('Alterar candidato exige indicar uma campanha');
const ids = poll.split(',').map(s=>s.trim());
const jobs = candidates.filter(c=>(poll==='all'||ids.includes(c.id))&&(group==='all'||c.adapter===group));
if(!jobs.length || new Set(candidates.map(c=>c.id)).size !== candidates.length)throw Error('Campanhas inválidas');

const now=()=>new Date().toISOString();
const datePT=x=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x));
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
const escapeRx=x=>String(x).split('').map(ch=>'\\^$*+?.()|[]{}'.includes(ch)?'\\'+ch:ch).join('');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function gate(c){
  if(Date.now()>=Date.parse(c.endsAt))return 'terminada';
  if(!c.enabled||!c.candidate)return 'sem_candidato_definido';
  const last=previous.campaigns?.[c.id]?.lastAttemptAt;
  if(!last)return null;
  if(c.adapter==='popgolden' && datePT(last)===datePT(Date.now()))return 'tentativa_diaria_efetuada';
  if(Date.now()-Date.parse(last)<c.cooldownMinutes*60000)return 'intervalo_a_decorrer';
  return null;
}
async function selectPop(page,candidate){
  const cards=page.locator('.option-container-details .card-poll');
  const count=Math.min(await cards.count(),150);
  for(let i=0;i<count;i++){
    const el=cards.nth(i);
    const text=norm(await el.locator('.title-div p').first().innerText().catch(()=>''));
    if(!text.toLowerCase().includes(candidate.toLowerCase()))continue;
    if(!await el.isVisible().catch(()=>false))continue;
    await el.click({timeout:7000});
    await page.waitForTimeout(300);
    if(await el.evaluate(node=>node.classList.contains('selected')).catch(()=>false))return true;
  }
  return false;
}
async function findVoteButton(page){
  const options=[
    page.getByRole('button',{name:/^vote$/i}),
    page.locator('button').filter({hasText:/^vote$/i}),
    page.locator('input[type="submit"][value="Vote" i]')
  ];
  for(const collection of options){
    const count=Math.min(await collection.count().catch(()=>0),12);
    for(let i=0;i<count;i++){
      const b=collection.nth(i);
      if(await b.isVisible().catch(()=>false)&&await b.isEnabled().catch(()=>false))return b;
    }
  }
  return null;
}
async function confirmation(page){
  const pattern=/your vote is in|vote submitted|vote (was )?(successful|recorded)|thank you for (your )?vot(e|ing)|voto (registado|confirmado)/i;
  const visible=page.getByText(pattern).first();
  if(await visible.isVisible().catch(()=>false))return {ok:true,text:norm(await visible.innerText()).slice(0,240),element:visible};
  const notices=page.locator('[role="alert"],.alert-success,.toast-success,.success-message');
  for(let i=0;i<Math.min(await notices.count(),10);i++){
    const node=notices.nth(i);const txt=norm(await node.innerText().catch(()=>''));
    if(pattern.test(txt)&&await node.isVisible().catch(()=>false))return {ok:true,text:txt.slice(0,240),element:node};
  }
  return {ok:false};
}
async function processPop(page,c,result){
  const selected=await selectPop(page,c.candidate);
  result.selectionConfirmed=selected;
  if(!selected)return 'selecao_indisponivel';
  if(mode==='probe')return 'selecionado';
  const button=await findVoteButton(page);
  if(!button)return 'botao_indisponivel';
  await button.click({timeout:9000});
  await page.waitForTimeout(3000);
  const confirmed=await confirmation(page);
  result.confirmationText=confirmed.text??null;
  if(!confirmed.ok)return 'submetido_nao_confirmado';
  result.receiptFile=path.join(out,c.id+'.jpg');
  try{await confirmed.element.screenshot({path:result.receiptFile,type:'jpeg',quality:85,timeout:6000});}
  catch{await page.screenshot({path:result.receiptFile,type:'jpeg',quality:75,fullPage:false});}
  return 'confirmado';
}
async function processShining(page,c,result){
  const text=norm(await page.locator('body').innerText().catch(()=>''));
  result.candidateVisible=text.toLowerCase().includes(String(c.candidate).toLowerCase());
  result.voteButtonVisible=Boolean(await findVoteButton(page));
  result.requiresVerification=/complete (the )?(security|verification)|captcha|verify you are human|turnstile/i.test(text);
  if(mode==='probe')return result.candidateVisible?'disponivel':'indisponivel';
  return 'requer_validacao_de_interface';
}
await mkdir(out,{recursive:true});
const all=[];
const due=jobs.filter(c=>mode==='probe'||!gate(c));
if(process.env.GITHUB_ACTIONS==='true' && process.env.GITHUB_EVENT_NAME==='schedule' && due.length){
  const seed=createHash('sha256').update(datePT(now())+group).digest()[0];
  const delay=(seed%12)*60000;
  console.log('Distribuição operacional: início diferido '+Math.round(delay/60000)+' min');
  await sleep(delay);
}
const browser=due.length?await chromium.launch({headless:true,args:['--disable-dev-shm-usage']}):null;
for(const c of jobs){
  if(mode==='probe'&&(!c.enabled||!c.candidate)){
    all.push({id:c.id,status:'sem_candidato_definido',skipped:true,mode,endsAt:c.endsAt});
    continue;
  }
  const reason=mode==='vote'?gate(c):null;
  if(reason){
    all.push({id:c.id,status:reason,skipped:true,mode,endsAt:c.endsAt});
    continue;
  }
  const recorded={id:c.id,candidate:override||c.candidate,platform:c.platform,category:c.category,mode,adapter:c.adapter,attemptedAt:now(),endsAt:c.endsAt,status:'erro'};
  const context=await browser.newContext({viewport:{width:1365,height:900},locale:'pt-PT'});
  const page=await context.newPage();
  const responses=[];
  page.on('response',r=>{
    if(r.request().method()==='POST'&&/vote|poll|ballot/i.test(r.url())){
      try{const u=new URL(r.url());responses.push({httpStatus:r.status(),path:u.origin+u.pathname});}catch{}
    }
  });
  try{
    const nav=await page.goto(c.url,{waitUntil:'domcontentloaded',timeout:45000});
    recorded.pageHttpStatus=nav?.status()??null;
    await page.waitForTimeout(1800);
    if(c.adapter==='popgolden')recorded.status=await processPop(page,{...c,candidate:recorded.candidate},recorded);
    else recorded.status=await processShining(page,{...c,candidate:recorded.candidate},recorded);
    recorded.submitResponses=responses;
  }catch(e){
    recorded.error=norm(e.message).slice(0,320);
    recorded.status='erro';
  }finally{
    if(recorded.status!=='confirmado'){
      const file=path.join(out,c.id+'-diagnostico.jpg');
      try{await page.screenshot({path:file,type:'jpeg',quality:60,timeout:9000});}catch{}
    }
    recorded.finishedAt=now();
    await context.close();
    all.push(recorded);
    console.log(JSON.stringify({id:c.id,status:recorded.status,mode,error:recorded.error??null}));
  }
}
if(browser)await browser.close();
const report={schemaVersion:1,mode,group,poll,generatedAt:now(),results:all};
await writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));
const lines=['# BTS Voting Bot','', '| Campanha | Estado | Confirmação |','|---|---|---|'];
for(const r of all)lines.push('| '+r.id+' | '+r.status+' | '+(r.confirmationText||'')+' |');
await writeFile(path.join(out,'SUMMARY.md'),lines.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n',{flag:'a'});
if(all.some(r=>r.status==='erro'))process.exitCode=1;
