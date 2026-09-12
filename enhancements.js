let qualificationData=null;
let marketSnapshot=null;
let weightRules=null;
let weightPredictions=null;
let extrasPromise=null;

function loadExtras(){
  if(extrasPromise) return extrasPromise;
  extrasPromise=Promise.all([
    fetch('./data/qualification/2026-09-13.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/markets/2026-08-24-neds.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/weights/2026-handicap-rules.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/weights/2026-09-13-working-predictions.json',{cache:'no-store'}).then(r=>r.ok?r.json():null)
  ]).then(([q,m,w,p])=>{qualificationData=q;marketSnapshot=m;weightRules=w;weightPredictions=p;(q?.qualified||[]).forEach(x=>GOLDEN_TICKETS.add(x.horse));return true;});
  return extrasPromise;
}

function qualificationView(){
  const q=qualificationData;
  if(!q) return '<div class="placeholder">Loading qualification data…</div>';
  return `<div class="section-header"><div><div class="kicker">Ballot Exemptions · Snapshot ${q.snapshotDate}</div><h2>Order of Entry & Golden Tickets</h2><div class="section-copy">Qualification is separate from handicap weight. Golden Ticket winners are exempt from the ballot if they proceed to final acceptance.</div></div></div>
  <section class="metric-grid qualification-metrics">
    ${metric('Known Tickets',q.qualified.length,'Ballot-exempt winners to date')}
    ${metric('Latest','Shockletz','Archer Stakes · 12 Sep')}
    ${metric('International','3','Belmont · Ebor · Kergorlay')}
    ${metric('Next Ticket','3 Oct','The Bart Cummings')}
    ${metric('Final Field','24','Subject to declarations/acceptance')}
  </section>
  <div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Qualifying Race</th><th>Location</th><th>Status</th><th>Intelligence</th></tr></thead><tbody>${q.qualified.map(x=>`<tr><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>${x.race}</td><td>${x.location}</td><td>${tag(x.status.includes('uncertain')?'Qualified · uncertain':'Qualified','green')}</td><td class="wrap-cell">${x.note}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="panel spaced-panel"><h3>Remaining Golden Ticket Races</h3><div class="ticket-grid">${q.futureDomesticGoldenTicketRaces.map(x=>`<div class="ticket-card"><div class="ticket-date">${new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</div><strong>${x.race}</strong></div>`).join('')}</div></div>`;
}

function marketsView(){
  const m=marketSnapshot;
  if(!m) return '<div class="placeholder">Loading market snapshot…</div>';
  return `<div class="section-header"><div><div class="kicker">Market History · Evidence Preserved</div><h2>Melbourne Cup Markets</h2><div class="section-copy">This first market is deliberately date-stamped rather than presented as live. New snapshots will be appended so moves and drifts can be measured properly.</div></div></div>
  <section class="metric-grid">
    ${metric('Snapshot','24 Aug','Neds futures')}
    ${metric('Favourite','$10.00','Aeliana / Half Yours')}
    ${metric('Tracked',m.runners.length,'Quoted runners in snapshot')}
    ${metric('Live Feed','Pending','Will not fake stale prices')}
    ${metric('History','Enabled','Snapshots retained')}
  </section>
  <div class="panel"><div class="panel-head"><div><h3>24 August 2026 Market</h3><div class="panel-sub">Historical snapshot — not current odds.</div></div><span class="tag gold">${m.bookmaker}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Rank</th><th>Horse</th><th>Odds</th><th>Implied %</th><th>Status</th></tr></thead><tbody>${m.runners.map((x,i)=>`<tr><td>${i+1}</td><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>$${x.odds.toFixed(2)}</td><td>${(100/x.odds).toFixed(1)}%</td><td>${i<2?tag('Joint favourite','green'):tag('Tracked')}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function confidenceTag(c){
  if(c==='Medium') return tag(c,'green');
  if(c==='Low') return tag(c,'red');
  return tag(c,'gold');
}

function weightsView(){
  const w=weightRules;
  const p=weightPredictions;
  if(!w||!p) return '<div class="placeholder">Loading handicap framework…</div>';
  const preds=[...(p.predictions||[])].sort((a,b)=>b.predictedKg-a.predictedKg);
  return `<div class="section-header"><div><div class="kicker">Working Pre-Handicap Model · ${p.snapshotDate}</div><h2>Weights & Handicap</h2><div class="section-copy">These are Hub estimates, not official weights. They remain editable research until the pre-release freeze, then will be scored against Racing Victoria on 17 September.</div></div></div>
  <section class="metric-grid">
    ${metric('Minimum Topweight','59.0kg','Official handicap rule')}
    ${metric('Minimum Weight','51.0kg','Older horses')}
    ${metric('3YO Minimum','49.0kg','Age-adjusted floor')}
    ${metric('Predictions',preds.length,'Working estimates')}
    ${metric('Freeze','16 Sep','Before official release')}
  </section>
  <section class="profile-grid"><div class="panel"><h3>Handicap Model Rules</h3><div class="rule-list">${w.methodologyNotes.map((n,i)=>`<div class="rule-row"><span>${String(i+1).padStart(2,'0')}</span><p>${n}</p></div>`).join('')}</div></div><div class="panel"><h3>Model Discipline</h3><p class="analysis-copy">The Cup scale must contain a 59kg topweight at handicap declaration, but that does not mean the reigning winner or highest-profile mare must automatically be assigned 59kg. We estimate each horse first, then assess how Racing Victoria is likely to anchor and compress the scale.</p><p class="analysis-copy">Northern Hemisphere three-year-olds are handled separately. Their overseas ratings are not converted directly into older-horse kilograms, which avoids the inflated weights that a naive ratings-to-kg mapping can produce.</p><div class="audit-banner"><strong>Status</strong><span>Working model · not frozen · official comparison begins 17 Sep</span></div></div></section>
  <div class="panel"><div class="panel-head"><div><h3>Working Weight Board</h3><div class="panel-sub">Estimated range shows uncertainty before official declarations.</div></div><span class="tag gold">PRE-RELEASE</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Rank</th><th>Horse</th><th>Pred.</th><th>Range</th><th>Tier</th><th>Confidence</th><th>Reasoning</th></tr></thead><tbody>${preds.map((x,i)=>`<tr><td>${i+1}</td><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td><strong>${x.predictedKg.toFixed(1)}kg</strong></td><td>${x.rangeLow.toFixed(1)}–${x.rangeHigh.toFixed(1)}</td><td>${x.tier}</td><td>${confidenceTag(x.confidence)}</td><td class="wrap-cell">${x.reason}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="panel spaced-panel"><h3>Official Audit</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Hub Prediction</th><th>Official</th><th>Error</th><th>State</th></tr></thead><tbody>${preds.map(x=>`<tr><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>${x.predictedKg.toFixed(1)}kg</td><td>—</td><td>—</td><td><span class="muted">Awaiting 17 Sep</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

const originalRender=render;
render=function(view='dashboard'){
  if(['weights','markets','order'].includes(view)){
    const label=navItems.find(x=>x[0]===view)?.[1]||'Cup Dashboard';
    document.getElementById('page-title').textContent=label;
    const root=document.getElementById('app-content');
    if(!qualificationData||!marketSnapshot||!weightRules||!weightPredictions){root.innerHTML='<div class="placeholder">Loading intelligence layer…</div>';loadExtras().then(()=>render(view));return;}
    root.innerHTML=view==='weights'?weightsView():view==='markets'?marketsView():qualificationView();
    return;
  }
  originalRender(view);
};

loadExtras().then(()=>{
  if(currentView==='dashboard'){
    const label=document.getElementById('updated-label');
    if(label) label.textContent=`101 nominations · ${Object.keys(trainingBaseData?.bases??{}).length} bases verified · ${qualificationData?.qualified?.length??0} Golden Tickets known · ${weightPredictions?.predictions?.length??0} weights modelled`;
  }
});
