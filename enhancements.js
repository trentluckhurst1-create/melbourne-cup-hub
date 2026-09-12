let qualificationData=null;
let marketSnapshot=null;
let weightRules=null;
let extrasPromise=null;

function loadExtras(){
  if(extrasPromise) return extrasPromise;
  extrasPromise=Promise.all([
    fetch('./data/qualification/2026-09-13.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/markets/2026-08-24-neds.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/weights/2026-handicap-rules.json',{cache:'no-store'}).then(r=>r.ok?r.json():null)
  ]).then(([q,m,w])=>{qualificationData=q;marketSnapshot=m;weightRules=w;GOLDEN_TICKETS.add('Shockletz');return true;});
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

function weightsView(){
  const w=weightRules;
  if(!w) return '<div class="placeholder">Loading handicap framework…</div>';
  return `<div class="section-header"><div><div class="kicker">Pre-Handicap Audit · Official Weights 17 September</div><h2>Weights & Handicap</h2><div class="section-copy">The prediction layer is being frozen before the handicapper publishes the official weights. We will keep both sets forever and score every miss.</div></div></div>
  <section class="metric-grid">
    ${metric('Minimum Topweight','59.0kg','At handicap declaration')}
    ${metric('Minimum Weight','51.0kg','Older horses')}
    ${metric('3YO Minimum','49.0kg','Applicable 3YO scale')}
    ${metric('Declared Spread','8.0kg','Top to minimum')}
    ${metric('Official Release','17 Sep','Prediction freeze beforehand')}
  </section>
  <section class="profile-grid"><div class="panel"><h3>Handicap Model Rules</h3><div class="rule-list">${w.methodologyNotes.map((n,i)=>`<div class="rule-row"><span>${String(i+1).padStart(2,'0')}</span><p>${n}</p></div>`).join('')}</div></div><div class="panel"><h3>Why the 59kg Anchor Matters</h3><p class="analysis-copy">At declaration, the Cup must have a topweight of at least 59kg. That means the handicap is not simply “rating X equals weight Y”. The handicapper first determines the top of the scale and the remaining field is positioned relative to it.</p><p class="analysis-copy">This is especially important for imported horses and Northern Hemisphere three-year-olds. Their overseas ratings and age allowances cannot be pasted directly onto an Australian older-horse scale.</p><div class="audit-banner"><strong>Prediction status</strong><span>Methodology locked · horse-by-horse estimates in build</span></div></div></section>
  <div class="panel"><h3>Prediction Audit Table</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Predicted</th><th>Official</th><th>Error</th><th>Audit State</th></tr></thead><tbody>${(cupData?.horses??[]).slice(0,20).map(h=>`<tr><td class="horse">${horseLink(h.horse)}</td><td>${dash(h.predictedWeightKg)}</td><td>${dash(h.officialWeightKg)}</td><td>—</td><td><span class="muted">Pre-release research</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

const originalRender=render;
render=function(view='dashboard'){
  if(['weights','markets','order'].includes(view)){
    const label=navItems.find(x=>x[0]===view)?.[1]||'Cup Dashboard';
    document.getElementById('page-title').textContent=label;
    const root=document.getElementById('app-content');
    if(!qualificationData||!marketSnapshot||!weightRules){root.innerHTML='<div class="placeholder">Loading intelligence layer…</div>';loadExtras().then(()=>render(view));return;}
    root.innerHTML=view==='weights'?weightsView():view==='markets'?marketsView():qualificationView();
    return;
  }
  originalRender(view);
};

loadExtras().then(()=>{
  if(currentView==='dashboard'){
    const label=document.getElementById('updated-label');
    if(label) label.textContent=`101 nominations · ${Object.keys(trainingBaseData?.bases??{}).length} bases verified · ${qualificationData?.qualified?.length??0} Golden Tickets known`;
  }
});
