let ladbrokesLiveData=null;
let ladbrokesLivePromise=null;
let ladbrokesLiveTimer=null;

function loadLadbrokesLive(force=false){
  if(ladbrokesLivePromise&&!force)return ladbrokesLivePromise;
  ladbrokesLivePromise=fetch('./data/markets/live-ladbrokes.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(d=>{ladbrokesLiveData=d;return d;})
    .catch(()=>null)
    .finally(()=>{ladbrokesLivePromise=null;});
  return ladbrokesLivePromise;
}

function ladbrokesIsLive(){return ladbrokesLiveData?.status==='LIVE_API_SNAPSHOT'&&ladbrokesLiveData?.live===true&&(ladbrokesLiveData?.runners||[]).length>0;}
function ladbrokesAgeMinutes(){
  const t=ladbrokesLiveData?.fetchedAt?new Date(ladbrokesLiveData.fetchedAt).getTime():NaN;
  return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/60000)):null;
}
function ladbrokesFreshness(){
  if(!ladbrokesIsLive())return {state:'offline',label:'Not live'};
  const age=ladbrokesAgeMinutes();
  if(age===null)return {state:'offline',label:'Timestamp missing'};
  if(age<=20)return {state:'live',label:`${age}m old`};
  if(age<=60)return {state:'stale',label:`${age}m old`};
  return {state:'offline',label:`${age}m old`};
}
function ladbrokesRunner(name){
  const n=String(name||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  return (ladbrokesLiveData?.runners||[]).find(r=>String(r.horse||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim()===n)||null;
}

const historicalMarketUniverse=marketUniverse;
marketUniverse=function(){
  const rows=historicalMarketUniverse();
  const byHorse=new Map(rows.map(r=>[r.horse,r]));
  if(ladbrokesIsLive()){
    for(const lr of ladbrokesLiveData.runners||[]){
      if(!horseByName(lr.horse)||!Number.isFinite(Number(lr.odds)))continue;
      let row=byHorse.get(lr.horse);
      if(!row){row={horse:lr.horse,points:[]};byHorse.set(lr.horse,row);}
      row.points=row.points.filter(p=>!p.live);
      row.points.push({date:ladbrokesLiveData.fetchedAt,bookmaker:'Ladbrokes',odds:Number(lr.odds),source:ladbrokesLiveData.source,live:true});
      row.points.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
      row.first=row.points[0];row.last=row.points[row.points.length-1];
      row.change=row.points.length>1?row.last.odds-row.first.odds:null;
      row.implied=row.last.odds?100/row.last.odds:null;
    }
  }
  return [...byHorse.values()];
};

const historicalMarketRowHtml=marketRowHtml;
marketRowHtml=function(r){
  const live=ladbrokesRunner(r.horse);
  const p=projectedRec(r.horse);
  const h24=r.points.find(x=>String(x.date).startsWith('2026-08-24'))?.odds;
  const h01=r.points.find(x=>String(x.date).startsWith('2026-09-01'))?.odds;
  const latest=live&&Number.isFinite(Number(live.odds))?Number(live.odds):r.last?.odds;
  const implied=latest?100/latest:null;
  const firstHistorical=[h24,h01].find(x=>Number.isFinite(Number(x)));
  const movement=firstHistorical&&latest
    ? latest<firstHistorical?`<span class="movement-up">Shortened ${(firstHistorical-latest).toFixed(1)}</span>`:latest>firstHistorical?`<span class="movement-down">Drifted ${(latest-firstHistorical).toFixed(1)}</span>`:'<span class="movement-flat">Unchanged</span>'
    : movementLabel(r);
  return `<tr data-market-horse="${r.horse.toLowerCase()}"><td class="horse">${horseLink(r.horse)}</td><td>${live?`<strong class="live-price">$${latest.toFixed(2)}</strong><div class="muted">Ladbrokes · live feed</div>`:`<strong>$${latest?.toFixed?.(2)||'—'}</strong><div class="muted">${r.last?.bookmaker||'Historical'} · stored</div>`}</td><td>${implied?.toFixed(1)||'—'}%</td><td>${movement}</td><td>${h24?`$${Number(h24).toFixed(2)}`:'—'}</td><td>${h01?`$${Number(h01).toFixed(2)}`:'—'}</td><td>${p?`#${p.rank}`:'—'}</td></tr>`;
};

const historicalMarketsWorkbenchView=marketsWorkbenchView;
marketsWorkbenchView=function(){
  const rows=marketRows();
  const snaps=marketSnapshots;
  const latestHistorical=snaps[snaps.length-1];
  const official=new Set((cupData?.horses||[]).map(h=>h.horse));
  const covered=new Set(marketUniverse().map(x=>x.horse)).size;
  const liveCount=ladbrokesIsLive()?(ladbrokesLiveData.runners||[]).filter(r=>official.has(r.horse)&&Number.isFinite(Number(r.odds))).length:0;
  const fresh=ladbrokesFreshness();
  const statusClass=fresh.state==='live'?'green':fresh.state==='stale'?'gold':'red';
  const statusText=ladbrokesLiveData?.status||'UNAVAILABLE';
  const sourceNote=ladbrokesIsLive()?`API snapshot ${fresh.label}`:(ladbrokesLiveData?.reason||'Awaiting Ladbrokes API feed');
  return `<div class="section-header"><div><div class="kicker">Live + Dated Futures Evidence</div><h2>Melbourne Cup Markets</h2><div class="section-copy">Ladbrokes API prices sit on top of preserved historical snapshots. Historical observations are never relabelled as live.</div></div></div>
  <section class="metric-grid">${metric('Ladbrokes Live',ladbrokesIsLive()?'ON':'OFF',sourceNote)}${metric('Live Nominees',liveCount,`of ${official.size} official nominees`)}${metric('Market Coverage',covered,`horses with live or stored prices`)}${metric('Latest API',ladbrokesLiveData?.fetchedAt?new Date(ladbrokesLiveData.fetchedAt).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}):'—',fresh.label)}${metric('Historical',snaps.length,latestHistorical?`${latestHistorical.bookmaker} · ${latestHistorical.snapshotDate}`:'No snapshots')}</section>
  <div class="market-warning ${ladbrokesIsLive()?'market-live-ok':''}"><strong>Ladbrokes API:</strong> ${statusText} · ${sourceNote}</div>
  <div class="market-source-strip"><div class="market-source-card"><span>LIVE FEED</span><strong>Ladbrokes</strong><div>${ladbrokesIsLive()?`${liveCount} official nominees · ${fresh.label}`:'Adapter installed · feed inactive'}</div></div>${snaps.map(s=>`<div class="market-source-card"><span>${s.snapshotDate}</span><strong>${s.bookmaker}</strong><div>${(s.runners||[]).filter(r=>official.has(r.horse)).length} official nominees captured</div></div>`).join('')}</div>
  <div class="market-toolbar"><input id="market-search" class="search" type="search" placeholder="Search horse…"><button class="market-chip ${marketFilter==='all'?'active':''}" data-market-filter="all">All</button><button class="market-chip ${marketFilter==='projected'?'active':''}" data-market-filter="projected">Projected 24</button><button class="market-chip ${marketFilter==='international'?'active':''}" data-market-filter="international">International</button><button class="market-chip ${marketFilter==='tickets'?'active':''}" data-market-filter="tickets">Golden Ticket</button></div>
  <div class="panel"><div class="panel-head"><div><h3>Live Price Board</h3><div class="panel-sub">Latest Ladbrokes fixed-win price where available, with preserved historical context.</div></div><span class="tag ${statusClass}">${ladbrokesIsLive()?'LIVE':'API '+statusText}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Ladbrokes / Latest</th><th>Implied</th><th>Vs first stored</th><th>24 Aug · Neds</th><th>1 Sep · Coral</th><th>Projected</th></tr></thead><tbody id="market-board-body">${rows.map(r=>marketRowHtml(r)).join('')}</tbody></table></div></div>`;
};

async function refreshLadbrokesLive(){
  const before=ladbrokesLiveData?.fetchedAt;
  await loadLadbrokesLive(true);
  if(ladbrokesLiveData?.fetchedAt!==before&&typeof render==='function'&&(currentView==='markets'||currentView==='dashboard'))render(currentView);
}

loadLadbrokesLive().then(()=>{if(typeof render==='function'&&(currentView==='markets'||currentView==='dashboard'))render(currentView);});
if(!ladbrokesLiveTimer)ladbrokesLiveTimer=setInterval(refreshLadbrokesLive,60000);
