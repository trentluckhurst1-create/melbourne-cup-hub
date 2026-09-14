let marketSnapshots=[];
let marketFeedStatus=null;
let marketWorkbenchPromise=null;
let marketFilter='all';
let newsFilter='all';

function snapshotAgeDays(date){
  if(!date)return null;
  const ms=Date.now()-new Date(`${date}T23:59:59+10:00`).getTime();
  return Math.max(0,Math.floor(ms/86400000));
}
function snapshotState(s){
  if(!s)return {label:'UNAVAILABLE',cls:'red'};
  const age=snapshotAgeDays(s.snapshotDate);
  if(age!==null&&age<=1)return {label:'RECENT SNAPSHOT',cls:'green'};
  return {label:'HISTORICAL',cls:'gold'};
}
function loadMarketWorkbench(){
  if(marketWorkbenchPromise)return marketWorkbenchPromise;
  const files=[
    './data/markets/2026-08-24-neds.json',
    './data/markets/2026-09-01-coral.json',
    './data/markets/2026-09-13-bet365.json',
    './data/markets/2026-09-13-betgold.json'
  ];
  marketWorkbenchPromise=Promise.all([
    ...files.map(f=>fetch(f,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)),
    fetch('./data/markets/live-ladbrokes.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    typeof loadLeadups==='function'?loadLeadups():Promise.resolve(),
    typeof loadIntelligence==='function'?loadIntelligence():Promise.resolve()
  ]).then(values=>{
    marketFeedStatus=values[files.length]||null;
    marketSnapshots=values.slice(0,files.length).filter(Boolean).sort((x,y)=>String(x.snapshotDate).localeCompare(String(y.snapshotDate))||String(x.bookmaker).localeCompare(String(y.bookmaker)));
    return marketSnapshots;
  });
  return marketWorkbenchPromise;
}

function marketUniverse(){
  const names=new Set((cupData?.horses||[]).map(h=>h.horse));
  const byHorse={};
  for(const snap of marketSnapshots){
    for(const r of snap.runners||[]){
      if(!names.has(r.horse))continue;
      byHorse[r.horse]=byHorse[r.horse]||{horse:r.horse,points:[]};
      byHorse[r.horse].points.push({date:snap.snapshotDate,bookmaker:snap.bookmaker,odds:Number(r.odds),source:snap.source,status:snap.status||'Stored snapshot'});
    }
  }
  return Object.values(byHorse).map(x=>{
    x.points.sort((a,b)=>a.date.localeCompare(b.date)||a.bookmaker.localeCompare(b.bookmaker));
    x.first=x.points[0];x.last=x.points[x.points.length-1];
    const sameBook=x.points.filter(p=>p.bookmaker===x.last.bookmaker);
    x.previousSameBook=sameBook.length>1?sameBook[sameBook.length-2]:null;
    x.change=x.previousSameBook?x.last.odds-x.previousSameBook.odds:null;
    x.implied=x.last.odds?100/x.last.odds:null;
    x.prevImplied=x.previousSameBook?.odds?100/x.previousSameBook.odds:null;
    x.impliedMovePct=x.prevImplied?((x.implied-x.prevImplied)/x.prevImplied)*100:null;
    x.material=x.impliedMovePct!==null&&Math.abs(x.impliedMovePct)>=15;
    return x;
  });
}
function movementLabel(row){
  if(!row.previousSameBook)return '<span class="movement-flat">No same-book comparison</span>';
  const pct=Math.abs(row.impliedMovePct||0).toFixed(0);
  if(row.change<0)return `<span class="movement-up">Shortened · +${pct}% implied</span>`;
  if(row.change>0)return `<span class="movement-down">Drifted · -${pct}% implied</span>`;
  return '<span class="movement-flat">Unchanged</span>';
}
function marketRows(){
  const projected=new Set((projectedFieldData?.projected24||[]).map(x=>x.horse));
  return marketUniverse().filter(r=>{
    const h=horseByName(r.horse);if(!h)return false;
    if(marketFilter==='projected')return projected.has(r.horse);
    if(marketFilter==='international')return h.trainingRegion==='International';
    if(marketFilter==='tickets')return qualificationState(r.horse)==='Golden Ticket';
    if(marketFilter==='movers')return r.material;
    return true;
  }).sort((a,b)=>(a.last.odds-b.last.odds)||a.horse.localeCompare(b.horse));
}
function marketsWorkbenchView(){
  const rows=marketRows();const snaps=marketSnapshots;
  const latest=snaps[snaps.length-1];
  const state=snapshotState(latest);
  const official=new Set((cupData?.horses||[]).map(h=>h.horse));
  const universe=marketUniverse();
  const covered=new Set(universe.map(x=>x.horse)).size;
  const sameBook=universe.filter(x=>x.previousSameBook).length;
  const material=universe.filter(x=>x.material).length;
  const liveAllowed=marketFeedStatus?.live===true;
  return `<div class="section-header"><div><div class="kicker">Dated Futures Evidence</div><h2>Melbourne Cup Markets</h2><div class="section-copy">Every price is tied to bookmaker, observation date and source state. Stored or crawled snapshots are never presented as live.</div></div></div>
  <section class="metric-grid">${metric('Snapshots',snaps.length,'Historical/recent captures')}${metric('Nominees Covered',covered,`of ${official.size} official nominees`)}${metric('Same-book Comparisons',sameBook,'Valid movement pairs')}${metric('Material Moves',material,'15%+ implied probability change')}${metric('Latest Stored',latest?.snapshotDate||'—',latest?.bookmaker||'No source')}${metric('Live Feed',liveAllowed?'AVAILABLE':'NOT PUBLISHED',liveAllowed?'Approved live source':(marketFeedStatus?.status||'No approved live feed'))}</section>
  <div class="market-warning"><strong>Integrity rule:</strong> bookmaker-to-bookmaker differences are not labelled as price moves. A move requires two observations from the same bookmaker. Latest stored prices may be recent, but they are not live unless the source explicitly says so.</div>
  <div class="market-source-strip">${snaps.map(s=>{const st=snapshotState(s);return `<div class="market-source-card"><span>${s.snapshotDate}</span><strong>${s.bookmaker}</strong><div>${(s.runners||[]).filter(r=>official.has(r.horse)).length} official nominees</div><div><span class="tag ${st.cls}">${st.label}</span></div></div>`}).join('')}</div>
  <div class="market-toolbar"><input id="market-search" class="search" type="search" placeholder="Search horse…"><button class="market-chip ${marketFilter==='all'?'active':''}" data-market-filter="all">All</button><button class="market-chip ${marketFilter==='movers'?'active':''}" data-market-filter="movers">Material movers</button><button class="market-chip ${marketFilter==='projected'?'active':''}" data-market-filter="projected">Projected 24</button><button class="market-chip ${marketFilter==='international'?'active':''}" data-market-filter="international">International</button><button class="market-chip ${marketFilter==='tickets'?'active':''}" data-market-filter="tickets">Golden Ticket</button></div>
  <div class="panel"><div class="panel-head"><div><h3>Price Evidence Board</h3><div class="panel-sub">Latest stored observation with same-book movement only when a valid previous observation exists.</div></div><span class="tag ${state.cls}">${state.label}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Latest Stored</th><th>Implied</th><th>Valid Movement</th><th>Previous Same Book</th><th>Source State</th><th>Projected</th></tr></thead><tbody id="market-board-body">${rows.map(r=>marketRowHtml(r)).join('')}</tbody></table></div></div>`;
}
function marketRowHtml(r){
  const p=projectedRec(r.horse);const st=snapshotState({snapshotDate:r.last.date});
  return `<tr data-market-horse="${r.horse.toLowerCase()}"><td class="horse">${horseLink(r.horse)}</td><td><strong>$${r.last.odds.toFixed(2)}</strong><div class="muted">${r.last.bookmaker} · ${r.last.date}</div></td><td>${r.implied?.toFixed(1)||'—'}%</td><td>${movementLabel(r)}</td><td>${r.previousSameBook?`$${r.previousSameBook.odds.toFixed(2)} · ${r.previousSameBook.date}`:'—'}</td><td><span class="tag ${st.cls}">${st.label}</span></td><td>${p?`#${p.rank}`:'—'}</td></tr>`;
}
function bindMarketsWorkbench(){
  document.querySelectorAll('[data-market-filter]').forEach(btn=>btn.onclick=()=>{marketFilter=btn.dataset.marketFilter;render('markets');});
  const s=document.getElementById('market-search');if(s)s.oninput=()=>{const q=s.value.toLowerCase().trim();document.querySelectorAll('#market-board-body tr').forEach(tr=>tr.style.display=!q||tr.dataset.marketHorse.includes(q)?'':'none');};
}

function newsItems(){
  const out=[];
  for(const e of (leadupData?.events||[]))out.push({date:e.date,horse:e.horse,title:e.race,detail:e.note||`${e.result||e.status||''} at ${e.track||''}`.trim(),source:e.source||'Lead-up tracker',kind:e.status==='Golden Ticket'?'qualification':'campaign'});
  for(const e of (intelligenceData?.events||[]))out.push({date:e.date,horse:e.horse||null,title:e.title,detail:e.detail||'',source:e.source||'Hub intelligence',kind:'intelligence'});
  return out.sort((a,b)=>b.date.localeCompare(a.date)||String(a.horse||'').localeCompare(String(b.horse||'')));
}
function newsWorkbenchView(){
  const projected=new Set((projectedFieldData?.projected24||[]).map(x=>x.horse));
  const rows=newsItems().filter(x=>{
    const h=x.horse?horseByName(x.horse):null;
    if(newsFilter==='projected')return x.horse&&projected.has(x.horse);
    if(newsFilter==='international')return h?.trainingRegion==='International';
    if(newsFilter==='qualification')return x.kind==='qualification';
    return true;
  });
  const horseLinked=new Set(rows.filter(x=>x.horse).map(x=>x.horse)).size;
  return `<div class="section-header"><div><div class="kicker">Horse-Linked Intelligence Feed</div><h2>News Centre</h2><div class="section-copy">Campaign events and verified horse intelligence are attached to the runner they affect, preserving date and source context.</div></div></div>
  <section class="metric-grid">${metric('Feed Items',rows.length,'Current filtered intelligence')}${metric('Horses Linked',horseLinked,'Unique runners in feed')}${metric('Golden Ticket Events',rows.filter(x=>x.kind==='qualification').length,'Qualification intelligence')}${metric('Projected 24 News',rows.filter(x=>x.horse&&projected.has(x.horse)).length,'Current field relevance')}${metric('Source Rule','DATED','No unsourced live claims')}</section>
  <div class="news-toolbar"><input id="news-search" class="search" type="search" placeholder="Search horse, race or note…"><button class="news-chip ${newsFilter==='all'?'active':''}" data-news-filter="all">All</button><button class="news-chip ${newsFilter==='projected'?'active':''}" data-news-filter="projected">Projected 24</button><button class="news-chip ${newsFilter==='international'?'active':''}" data-news-filter="international">International</button><button class="news-chip ${newsFilter==='qualification'?'active':''}" data-news-filter="qualification">Qualification</button></div>
  <div class="panel"><div class="panel-head"><div><h3>Cup Intelligence Feed</h3><div class="panel-sub">Newest first. Click a horse to open its dossier.</div></div><span class="tag gold">DATED EVENTS</span></div><div class="news-feed" id="news-feed">${rows.length?rows.map(newsRowHtml).join(''):'<div class="news-empty">No items match this filter.</div>'}</div></div>`;
}
function newsRowHtml(x){
  const search=`${x.horse||''} ${x.title||''} ${x.detail||''} ${x.source||''}`.toLowerCase().replace(/"/g,'&quot;');
  return `<article class="news-intel-row" data-news-search="${search}"><div class="date">${x.date||'—'}</div><div class="subject">${x.horse&&horseByName(x.horse)?horseLink(x.horse):(x.horse||'Cup-wide')}${x.kind==='qualification'?'<span class="news-priority">Ticket</span>':''}<div>${x.title||''}</div></div><div class="copy">${x.detail||'—'}</div><div class="source">${x.source||'Source recorded in dataset'}</div></article>`;
}
function bindNewsWorkbench(){
  document.querySelectorAll('[data-news-filter]').forEach(btn=>btn.onclick=()=>{newsFilter=btn.dataset.newsFilter;render('news');});
  const s=document.getElementById('news-search');if(s)s.oninput=()=>{const q=s.value.toLowerCase().trim();document.querySelectorAll('#news-feed [data-news-search]').forEach(el=>el.style.display=!q||el.dataset.newsSearch.includes(q)?'':'none');};
}

const marketNewsRenderBase=render;
render=function(view='dashboard'){
  if(view==='markets'||view==='news'){
    const root=document.getElementById('app-content');document.getElementById('page-title').textContent=view==='markets'?'Markets':'News Centre';
    if(!marketSnapshots.length||!leadupData){root.innerHTML='<div class="placeholder">Loading Cup intelligence workspace…</div>';loadMarketWorkbench().then(()=>render(view));return;}
    root.innerHTML=view==='markets'?marketsWorkbenchView():newsWorkbenchView();
    setTimeout(()=>view==='markets'?bindMarketsWorkbench():bindNewsWorkbench(),0);return;
  }
  marketNewsRenderBase(view);
};
loadMarketWorkbench();
