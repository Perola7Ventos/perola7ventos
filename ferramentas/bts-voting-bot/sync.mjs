import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=process.env.BOT_TEST_ROOT || path.dirname(fileURLToPath(import.meta.url));
const base=process.env.BOT_TEST_SITE || path.resolve(root,'../../warehouse-0613/bts/votacoes');
const dataPath=path.join(base,'data/status.json');
const result=JSON.parse(await readFile(path.join(root,'artifacts/results.json'),'utf8'));
if(result.mode!=='vote'){
  console.log('Modo de diagnóstico: não atualiza contagens');
  process.exit(0);
}
const campaigns=JSON.parse(await readFile(path.join(root,'campaigns.json'),'utf8'));
const known=new Map(campaigns.map(c=>[c.id,c]));
const state=JSON.parse(await readFile(dataPath,'utf8'));
state.schemaVersion=1;
state.campaigns=state.campaigns||{};
state.recentRuns=state.recentRuns||[];
let changes=0;
for(const r of result.results||[]){
  const c=known.get(r.id);
  if(!c||r.skipped)continue;
  const record=state.campaigns[r.id]||{confirmedCount:0};
  record.confirmedCount=Number(record.confirmedCount||0);
  if(!r.attemptedAt)continue;
  const wasAttempt=record.lastAttemptAt;
  if(wasAttempt && Date.parse(r.attemptedAt)<=Date.parse(wasAttempt))continue;
  record.lastAttemptAt=r.attemptedAt;
  record.lastStatus=r.status;
  record.endsAt=c.endsAt;
  record.candidate=r.candidate;
  record.platform=c.platform;
  record.enabled=c.enabled;
  changes++;
  if(r.status==='confirmado'){
    const src=path.join(root,'artifacts',r.id+'.jpg');
    await stat(src);
    const stamp=r.attemptedAt.replace(/[:.]/g,'-');
    const folder=path.join(base,'certificados',r.id);
    const filename=stamp+'.jpg';
    await mkdir(folder,{recursive:true});
    await copyFile(src,path.join(folder,filename));
    const link='certificados/'+r.id+'/'+filename;
    const evidence={
      kind:'comprovativo_tecnico_de_votacao',
      officialCertificate:false,
      campaignId:r.id,
      candidate:r.candidate,
      platform:c.platform,
      campaignUrl:c.url,
      attemptedAt:r.attemptedAt,
      finishedAt:r.finishedAt,
      confirmationText:r.confirmationText,
      submitResponses:r.submitResponses||[],
      image:filename,
      githubRunId:process.env.GITHUB_RUN_ID||null
    };
    await writeFile(path.join(folder,stamp+'.json'),JSON.stringify(evidence,null,2)+'\n');
    record.confirmedCount++;
    record.lastConfirmedAt=r.finishedAt||r.attemptedAt;
    record.lastReceipt=link;
    console.log('Comprovativo preservado: '+link);
  }
  state.campaigns[r.id]=record;
  state.recentRuns.unshift({
    id:r.id,
    status:r.status,
    at:r.attemptedAt,
    confirmation:r.confirmationText||null,
    receipt:record.lastReceipt||null,
    runId:process.env.GITHUB_RUN_ID||null
  });
}
if(!changes){console.log('Nenhuma execução nova para sincronizar');process.exit(0);}
state.recentRuns=state.recentRuns.slice(0,75);
state.totalConfirmed=Object.values(state.campaigns).reduce((sum,c)=>sum+Number(c.confirmedCount||0),0);
state.updatedAt=new Date().toISOString();
await writeFile(dataPath,JSON.stringify(state,null,2)+'\n');
console.log('Estado atualizado: '+changes+' campanha(s); '+state.totalConfirmed+' comprovativos');
