let leadupData=null;
let leadupPromise=null;

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

function leadupsView(){
  const d=leadupData;
  if(!d) return '<div class="placeholder">Loading lead-up tracker…</div>';
  const events=[...(d.events||[])].sort((a,b)=>b.date.localeCompare(a.date)||a.horse.localeCompare(b.horse));
  const starters=events.filter(x=>x.type==='Result').length;
  const tickets=events.filter(x=>x.status==='Golden Ticket').length;
  const pending=events.filter(x=>['Declared','Due to race'].includes(x.status)).length;
  const latest=events[0]||null;
  return `<div class="section-header"><div><div class="kicker">Campaign Timeline · Snapshot ${d.snapshotDate}</div><h2>Lead-up Tracker</h2><div class="section-copy">Every run, non-runner, qualification event and sourced future engagement is stored as a dated event. Historical lead-ups are never overwritten by later starts.</div></div></div>
  <section class="metric-grid">
    ${metric('Events',events.length,'Dated Cup-campaign records')}
    ${metric('Results',starters,'Completed lead-up runs')}
    ${metric('Golden Tickets',tickets,'Qualification event in tracker')}
    ${metric('Pending Starts',pending,'Declared / sourced engagement')}
    ${metric('Latest',latest?new Date(latest.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'}):'—',latest?latest.horse:'No event')}
  </section>
  <div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Horse</th><th>Race / Event</th><th>Track</th><th>Distance</th><th>Result</th><th>Status</th><th>Campaign Note</th></tr></thead><tbody>${events.map(x=>`<tr><td>${new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</td><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>${x.race}</td><td>${x.track||'—'}</td><td>${x.distanceM?`${x.distanceM}m`:'—'}</td><td><strong>${x.result}</strong></td><td>${leadupStatusTag(x.status)}</td><td class="wrap-cell">${x.note}</td></tr>`).join('')}</tbody></table></div></div>`;
}

const leadupRenderBase=render;
render=function(view='dashboard'){
  if(view==='leadups'){
    document.getElementById('page-title').textContent='Lead-up Tracker';
    const root=document.getElementById('app-content');
    if(!leadupData){root.innerHTML='<div class="placeholder">Loading lead-up tracker…</div>';loadLeadups().then(()=>render('leadups'));return;}
    root.innerHTML=leadupsView();return;
  }
  leadupRenderBase(view);
};

loadLeadups();
