import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE='https://api-affiliates.ladbrokes.com.au/affiliates/v1/racing';
const OUT='data/markets/live-ladbrokes.json';
const NOMINATIONS='data/nominations/2026-09-01.json';
const APPROVED=String(process.env.LADBROKES_REPUBLICATION_APPROVED||'').toLowerCase()==='true';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().replace(/[’']/g,'').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const finite=v=>Number.isFinite(Number(v))?Number(v):null;

function headers(){
  const h={Accept:'application/json','User-Agent':'Melbourne-Cup-Hub/1.0'};
  if(process.env.LADBROKES_FROM)h.From=process.env.LADBROKES_FROM;
  if(process.env.LADBROKES_PARTNER)h['X-Partner']=process.env.LADBROKES_PARTNER;
  if(process.env.LADBROKES_PARTNER_ID)h['X-Partner-ID']=process.env.LADBROKES_PARTNER_ID;
  return h;
}

async function getJson(url){
  const r=await fetch(url,{headers:headers()});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText} · ${url}`);
  return r.json();
}

function meetingLabel(m){return clean(m.name||m.meeting||m.jetbet_track_name||m.comp_mnemonic||m.club_mnemonic);}
function raceLabel(r){return clean(r.name||r.race_name||r.market_name);}
function raceStart(r,m){return clean(r.start_time||r.advertised_start||r.date||m.meeting_date||m.date);}

function scoreFutureRace(m,r){
  const meeting=norm(meetingLabel(m));
  const race=norm(raceLabel(r));
  const joined=`${meeting} ${race}`;
  let s=0;
  if(race==='melbourne cup'||race.includes('melbourne cup'))s+=120;
  if(meeting.includes('melbourne cup'))s+=50;
  if(joined.includes('flemington'))s+=30;
  if(Number(r.distance)===3200)s+=25;
  if(raceStart(r,m).startsWith('2026-11-03'))s+=30;
  if(joined.includes('2026'))s+=5;
  return s;
}

function findCupFuture(data){
  const candidates=[];
  for(const m of data?.meetings||[]){
    for(const r of m?.races||[]){
      const score=scoreFutureRace(m,r);
      if(score>0)candidates.push({meeting:m,race:r,score});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0];
  if(!best||best.score<70)throw new Error('Could not confidently identify the 2026 Melbourne Cup futures event.');
  const id=best.race.id||best.race.event_id;
  if(!id)throw new Error('Melbourne Cup future found but no race/event id was supplied by Ladbrokes.');
  return best;
}

function runnerArrays(node,out=[],seen=new Set()){
  if(!node||typeof node!=='object'||seen.has(node))return out;
  seen.add(node);
  if(Array.isArray(node)){
    if(node.some(x=>x&&typeof x==='object'&&x.odds&&finite(x.odds.fixed_win)!==null))out.push(node);
    for(const x of node)runnerArrays(x,out,seen);
  }else{
    for(const v of Object.values(node))runnerArrays(v,out,seen);
  }
  return out;
}

function pickRunners(event){
  if(Array.isArray(event?.runners)&&event.runners.length)return event.runners;
  if(Array.isArray(event?.entrants)&&event.entrants.length)return event.entrants;
  const arrays=runnerArrays(event);
  arrays.sort((a,b)=>b.filter(x=>finite(x?.odds?.fixed_win)!==null).length-a.filter(x=>finite(x?.odds?.fixed_win)!==null).length);
  return arrays[0]||[];
}

function runnerName(r){return clean(r.name||r.entrant_name||r.horse_name||r.runner_name);}
function outputRunner(r,official){
  const name=runnerName(r);
  return {
    horse:official?.horse||name,
    apiName:name,
    odds:finite(r?.odds?.fixed_win),
    fixedPlace:finite(r?.odds?.fixed_place),
    scratched:Boolean(r.is_scratched||r.is_late_scratched),
    runnerNumber:r.runner_number??r.entrant_number??null,
    mover:r.mover??null,
    officialNominee:Boolean(official)
  };
}

async function write(obj){await fs.mkdir(path.dirname(OUT),{recursive:true});await fs.writeFile(OUT,JSON.stringify(obj,null,2)+'\n');}

async function main(){
  const nominations=JSON.parse(await fs.readFile(NOMINATIONS,'utf8'));
  const officialByNorm=new Map((nominations.horses||[]).map(h=>[norm(h.horse),h]));

  if(!APPROVED){
    await write({
      provider:'Ladbrokes Australia',
      source:'Ladbrokes Affiliates API',
      status:'PUBLICATION_APPROVAL_REQUIRED',
      fetchedAt:null,
      live:false,
      reason:'The Ladbrokes Affiliates API terms state API information is for personal use and must not be republished without written permission from Entain Australia and New Zealand. Set LADBROKES_REPUBLICATION_APPROVED=true only after approval is held.',
      runners:[]
    });
    console.log('Ladbrokes adapter configured; publication approval gate remains closed.');
    return;
  }

  const now=new Date().toISOString();
  const futures=await getJson(`${API_BASE}/futures?enc=json`);
  const best=findCupFuture(futures);
  const eventId=best.race.id||best.race.event_id;
  const event=await getJson(`${API_BASE}/events/${encodeURIComponent(eventId)}?enc=json`);
  const apiRunners=pickRunners(event);
  if(!apiRunners.length)throw new Error('Ladbrokes event returned no runner array containing fixed-win odds.');

  const mapped=apiRunners.map(r=>outputRunner(r,officialByNorm.get(norm(runnerName(r))))).filter(r=>r.horse);
  const official=mapped.filter(r=>r.officialNominee&&r.odds!==null);
  const officialSeen=new Set(official.map(r=>norm(r.horse)));
  const missing=(nominations.horses||[]).filter(h=>!officialSeen.has(norm(h.horse))).map(h=>h.horse);

  const result={
    provider:'Ladbrokes Australia',
    source:'Ladbrokes Affiliates API',
    sourceEndpoint:`${API_BASE}/events/${eventId}`,
    futuresEndpoint:`${API_BASE}/futures`,
    status:'LIVE_API_SNAPSHOT',
    live:true,
    fetchedAt:now,
    event:{
      id:String(eventId),
      name:raceLabel(best.race)||'Melbourne Cup',
      meeting:meetingLabel(best.meeting)||'Flemington',
      startTime:raceStart(best.race,best.meeting)||null,
      discoveryScore:best.score
    },
    officialNominees:nominations.horses?.length||0,
    officialNomineesPriced:official.length,
    unmatchedOfficialNominees:missing,
    unmatchedApiEntrants:mapped.filter(r=>!r.officialNominee).map(r=>r.apiName),
    runners:official.sort((a,b)=>(a.odds??9999)-(b.odds??9999)||a.horse.localeCompare(b.horse))
  };
  await write(result);
  console.log(JSON.stringify({status:result.status,event:result.event,priced:result.officialNomineesPriced,missing:missing.length},null,2));
}

main().catch(async err=>{
  const obj={provider:'Ladbrokes Australia',source:'Ladbrokes Affiliates API',status:'API_ERROR',live:false,fetchedAt:null,error:String(err?.stack||err),runners:[]};
  await write(obj);
  console.error(err);
  process.exitCode=1;
});
