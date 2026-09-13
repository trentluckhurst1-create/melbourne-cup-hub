let leadupData=null;
let leadupPromise=null;
let leadupFilter='all';
let leadupQuery='';

function loadLeadups(){
  if(leadupPromise) return leadupPromise;
  leadupPromise=fetch('./data/leadups/2026-09-13.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(d=>{leadupData=d;return d;})
    .catch(()=>null);
  return leadupPromise;
}

function leadupStatusTag(status){
  if(status==='Golden Ticket') return tag(status,'green');
  if(status==='Completed') return tag(status,'gold');
  if(status==='Declared'||status==='Due to race') return tag(status,'green');
  if(status==='Did not start') return tag(status,'red');
  return `<span class="tag">${status}</span>`;
}
function leadupProjected(name){return !!(projectedFieldData?.projected24||[]).find(x=>x.horse===name);}
function leadupInternational(name){return horseByName(name)?.trainingRegion==='International';}
function leadupFilteredEvents(){
  const q=leadupQuery.trim().toLowerCase();
  return [...(leadupData?.events||[])].sort((a,b)=>b.date.localeCompare(a.date)||a.horse.localeCompare(b.horse)).filter(x=>{
    if(q&&!`${x.horse} ${x.race||''} ${x.track||''} ${x.note||''}`.toLowerCase().includes(q))return false;
    if(leadupFilter==='results'&&x.type!=='Result')return false;
    if(leadupFilter==='tickets'&&x.status!=='Golden Ticket')return false;
    if(leadupFilter==='pending'&&!['Declared','Due to race'].includes(x.status))return false;
    if(leadupFilter==='projected'&&!leadupProjected(x.horse))return false;
    if(leadupFilter==='international'&&!leadupInternational(x.horse))return false;
    return true;
  });
}
function setLeadupFilter(v){leadupFilter=v;render('leadups');}
function setLeadupQuery(v){leadupQuery=v;render('leadups');setTimeout(()=>{const e=document.getElementById('leadup-search');if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length);}},0);}
window.setLeadupFilter=setLeadupFilter;window.setLeadupQuery=setLeadupQuery;

function leadupControls(){const filters=[['all','All events'],['projected','Projected 24'],['results','Results'],['tickets','Golden Tickets'],['pending','Pending'],['international','International']];return `<div class="order-tools"><input id="leadup-search" class="order-search" value="${leadupQuery.replace(/"/g,'&quot;')}" placeholder="Search horse, race, track or note…" oninput="setLeadupQuery(this.value)">${filters.map(([k,l])=>`<button class="order-filter ${leadupFilter===k?'active':''}" onclick="setLeadupFilter('${k}')">${l}</button>`).join('')}</div>`;}

function projectedPrepCoverage(){
  const names=(projectedFieldData?.projected24||[]).map(x=>x.horse);
  const events=leadupData?.events||[];
  const withEvent=names.filter(n=>events.some(e=>e.horse===n));
  const missing=names.filter(n=>!events.some(e=>e.horse===n));
  return {names,withEvent,missing};
}

function leadupsView(){
  const d=leadupData;
  if(!d) return '<div class="placeholder">Loading lead-up tracker…</div>';
  const all=[...(d.events||[])].sort((a,b)=>b.date.localeCompare(a.date)||a.horse.localeCompare(b.horse));
  const events=leadupFilteredEvents();
  const starters=all.filter(x=>x.type==='Result').length;
  const tickets=all.filter(x=>x.status==='Golden Ticket').length;
  const pending=all.filter(x=>['Declared','Due to race'].includes(x.status)).length;
  const latest=all[0]||null;
  const pc=projectedPrepCoverage();
  return `<div class="section-header"><div><div class="kicker">Campaign Timeline · Snapshot ${d.snapshotDate}</div><h2>Lead-up Preparation Control</h2><div class="section-copy">Every run, non-runner, qualification event and sourced future engagement is stored as a dated event. Historical lead-ups are never overwritten by later starts.</div></div></div>
  <section class="metric-grid">
    ${metric('Events',all.length,'Dated Cup-campaign records')}
    ${metric('Results',starters,'Completed lead-up runs')}
    ${metric('Golden Tickets',tickets,'Qualification events in tracker')}
    ${metric('Pending Starts',pending,'Declared / sourced engagements')}
    ${metric('Projected Prep',`${pc.withEvent.length}/${pc.names.length}`,'Projected 24 with tracked campaign event')}
  </section>
  <div class="panel"><div class="panel-head"><div><h3>Campaign Event Ledger</h3><div class="panel-sub">Filter the dated preparation history without losing older events.</div></div><span class="tag gold">${events.length} SHOWN</span></div>${leadupControls()}<div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Horse</th><th>Projected</th><th>Race / Event</th><th>Track</th><th>Distance</th><th>Result</th><th>Status</th><th>Campaign Note</th></tr></thead><tbody>${events.length?events.map(x=>`<tr><td>${new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</td><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>${leadupProjected(x.horse)?tag('Top 24','green'):'—'}</td><td>${x.race}</td><td>${x.track||'—'}</td><td>${x.distanceM?`${x.distanceM}m`:'—'}</td><td><strong>${x.result||'—'}</strong></td><td>${leadupStatusTag(x.status)}</td><td class="wrap-cell">${x.note||'—'}</td></tr>`).join(''):'<tr><td colspan="9" class="order-empty">No campaign events match this filter.</td></tr>'}</tbody></table></div></div>
  <section class="dossier-grid dossier-section"><div class="panel"><div class="panel-head"><div><h3>Projected 24 · Preparation Coverage</h3><div class="panel-sub">Who has at least one dated campaign event in the tracker.</div></div></div><div class="dossier-facts"><div><span>Tracked</span><strong>${pc.withEvent.length}/${pc.names.length}</strong></div><div><span>Still missing</span><strong>${pc.missing.length}</strong></div><div><span>Latest tracker date</span><strong>${latest?new Date(latest.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'}):'—'}</strong></div><div><span>Next action</span><strong>Close projected-runner prep gaps</strong></div></div></div><div class="panel"><div class="panel-head"><div><h3>Projected Runners Without Tracked Event</h3><div class="panel-sub">Research queue only — absence here means the Hub has not yet stored a dated campaign event.</div></div></div>${pc.missing.length?`<div class="next-six">${pc.missing.map((name,i)=>`<button onclick="openHorse('${name.replace(/'/g,"\\'")}')"><span>${String(i+1).padStart(2,'0')}</span><strong>${name}</strong></button>`).join('')}</div>`:'<div class="queue-empty">All projected runners have a tracked campaign event.</div>'}</div></section>`;
}

const leadupRenderBase=render;
render=function(view='dashboard'){
  if(view==='leadups'){
    document.getElementById('page-title').textContent='Lead-up Tracker';
    const root=document.getElementById('app-content');
    if(!leadupData){root.innerHTML='<div class="placeholder">Loading lead-up tracker…</div>';Promise.all([loadLeadups(),typeof loadProjectedField==='function'?loadProjectedField():Promise.resolve()]).then(()=>render('leadups'));return;}
    root.innerHTML=leadupsView();return;
  }
  leadupRenderBase(view);
};

loadLeadups();
