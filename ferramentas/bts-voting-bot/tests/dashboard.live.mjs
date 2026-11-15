import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const portal='https://perola7ventos.github.io/perola7ventos/warehouse-0613/bts/votacoes/';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1380,height:920}});
const reports=[];
let passed=false;
await mkdir('artifacts',{recursive:true});
for(let attempt=1;attempt<=6;attempt++){
  const consoleErrors=[],failed=[];
  const errorHandler=msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());};
  const rejectHandler=req=>failed.push({url:req.url(),failure:req.failure()?.errorText});
  page.on('console',errorHandler);page.on('requestfailed',rejectHandler);
  try {
    const response=await page.goto(portal+'?check='+Date.now(),{waitUntil:'domcontentloaded',timeout:35000});
    await page.waitForTimeout(2500);
    const info=await page.evaluate(()=>{
      const txt=id=>document.getElementById(id)?.textContent?.trim()??null;
      return {title:document.title,confirmed:txt('count-done'),status:txt('bot-sync-status'),connection:document.getElementById('bot-sync-status')?.dataset.state??null,total:txt('count-all'),cardCount:document.querySelectorAll('article.vcard').length,linkCount:document.querySelectorAll('a[href*="certificados/"]').length,scriptCount:document.querySelectorAll('script').length};
    });
    const check={attempt,httpStatus:response?.status()??null,...info,consoleErrors:consoleErrors.slice(0,5),failed:failed.slice(0,6)};
    reports.push(check);
    console.log(JSON.stringify(check));
    if(check.confirmed && Number(check.confirmed)>=6 && check.connection==='ok' && check.linkCount>=6 && check.cardCount===9){passed=true;break;}
  }catch(e){reports.push({attempt,error:String(e)});console.error('attempt '+attempt+': '+e);}
  finally{page.off('console',errorHandler);page.off('requestfailed',rejectHandler);}
  if(attempt<6)await page.waitForTimeout(12000);
}
await page.screenshot({path:'artifacts/dashboard-live.png',fullPage:true}).catch(()=>{});
await writeFile('artifacts/dashboard-live.json',JSON.stringify({passed,reports},null,2));
await browser.close();
if(!passed){console.error('Live dashboard did not display confirmed votes and evidence links');process.exitCode=1;}
