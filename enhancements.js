let qualificationData=null;
let marketSnapshot=null;
let marketHistory=[];
let weightRules=null;
let weightPredictions=null;
let officialWeights=null;
let extrasPromise=null;

function loadExtras(){
  if(extrasPromise) return extrasPromise;
  extrasPromise=Promise.all([
    fetch('./data/qualification/2026-09-13.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/markets/2026-08-24-neds.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/markets/2026-09-01-coral.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/weights/2026-handicap-rules.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/weights/2026-09-13-working-predictions.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/weights/2026-official.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([q,m1,m2,w,p,o])=>{qualificationData=q;marketSnapshot=m2||m1;marketHistory=[m1,m2].filter(Boolean);weightRules=w;weightPredictions=p;officialWeights=o;(q?.qualified||[]).forEach(x=>GOLDEN_TICKETS.add(x.horse));return true;});
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

function movementLabel(oldOdds,newOdds){
  if(oldOdds==null) return '<span class="muted">New quote</span>';
  if(newOdds<oldOdds) return tag(`Firmed ${oldOdds.toFixed(0)}→${newOdds.toFixed(0)}`,'green');
  if(newOdds>oldOdds) return tag(`Drifted ${oldOdds.toFixed(0)}→${newOdds.toFixed(0)}`,'red');
  return '<span class="muted">Unchanged</span>';
}

function marketsView(){
  const latest=marketSnapshot;
  if(!latest) return '<div class="placeholder">Loading market snapshots…</div>';
  const previous=marketHistory.length>1?marketHistory[marketHistory.length-2]:null;
  const prevMap=new Map((previous?.runners||[]).map(x=>[x.horse,x.odds]));
  const latestOfficial=(latest.runners||[]).filter(x=>horseByName(x.horse));
  return `<div class="section-header"><div><div class="kicker">Market History · ${marketHistory.length} Snapshots Preserved</div><h2>Melbourne Cup Markets</h2><div class="section-copy">Every price board is date-stamped. We compare snapshots but never relabel historical prices as live current odds.</div></div></div>
  <section class="metric-grid">
    ${metric('Latest Snapshot','1 Sep','Coral futures via Racing Post')}
    ${metric('Favourite','$10.00','Aeliana / Defiantly')}
    ${metric('Official Nominees',latestOfficial.length,'Quoted in latest snapshot')}
    ${metric('Snapshots',marketHistory.length,'24 Aug + 1 Sep')}
    ${metric('Live Feed','Pending','No stale odds presented as live')}
  </section>
  <div class="panel"><div class="panel-head"><div><h3>1 September 2026 Market</h3><div class="panel-sub">Historical snapshot — movement compares against 24 August where the same horse was quoted.</div></div><span class="tag gold">${latest.bookmaker}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Rank</th><th>Horse</th><th>1 Sep</th><th>24 Aug</th><th>Movement</th><th>Implied %</th></tr></thead><tbody>${latestOfficial.map((x,i)=>{const old=prevMap.get(x.horse);return `<tr><td>${i+1}</td><td class="horse">${horseLink(x.horse)}</td><td><strong>$${x.odds.toFixed(2)}</strong></td><td>${old!=null?`$${old.toFixed(2)}`:'—'}</td><td>${movementLabel(old,x.odds)}</td><td>${(100/x.odds).toFixed(1)}%</td></tr>`}).join('')}</tbody></table></div></div>
  <div class="panel spaced-panel"><div class="panel-head"><div><h3>Snapshot Archive</h3><div class="panel-sub">Raw historical boards are retained even when a quoted horse was not in the official nomination set.</div></div></div><div class="timeline">${marketHistory.map(m=>`<div class="timeline-row"><div class="timeline-date">${new Date(m.snapshotDate+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</div><div><strong>${m.bookmaker} · ${m.runners.length} quoted runners</strong><div class="timeline-copy">${m.status}</div></div></div>`).join('')}</div></div>`;
}

function confidenceTag(c){if(c==='Medium') return tag(c,'green');if(c==='Low') return tag(c,'red');return tag(c,'gold');}
function weightStatus(x){return x.activeCupStatus?`<span class="tag red">${x.activeCupStatus}</span>`:'<span class="tag green">Modelled</span>';}
function officialWeightMap(){return new Map((officialWeights?.weights||[]).map(x=>[x.horse,x]));}
function weightAuditRows(preds){
  const map=officialWeightMap();
  return preds.map(x=>{
    const o=map.get(x.horse)||null;
    const official=o?Number(o.weightKg):null;
    const error=Number.isFinite(official)?official-Number(x.predictedKg):null;
    return {...x,official,error,officialRecord:o};
  });
}
function weightAuditStats(rows){
  const scored=rows.filter(x=>Number.isFinite(x.error));
  if(!scored.length)return {scored:0,mae:null,bias:null,withinHalf:0,withinOne:0,bigMisses:0};
  const mae=scored.reduce((s,x)=>s+Math.abs(x.error),0)/scored.length;
  const bias=scored.reduce((s,x)=>s+x.error,0)/scored.length;
  return {scored:scored.length,mae,bias,withinHalf:scored.filter(x=>Math.abs(x.error)<=0.5).length,withinOne:scored.filter(x=>Math.abs(x.error)<=1).length,bigMisses:scored.filter(x=>Math.abs(x.error)>=2).length};
}
function weightErrorCell(x){
  if(!Number.isFinite(x.error))return '<span class="muted">—</span>';
  const abs=Math.abs(x.error);const cls=abs<=0.5?'green':abs>=2?'red':'gold';
  return tag(`${x.error>0?'+':''}${x.error.toFixed(1)}kg`,cls);
}

function weightsView(){
  const w=weightRules;
  const p=weightPredictions;
  if(!w||!p) return '<div class="placeholder">Loading handicap framework…</div>';
  const preds=[...(p.predictions||[])].sort((a,b)=>b.predictedKg-a.predictedKg||a.horse.localeCompare(b.horse));
  const covered=p.coverage?.weightsModelled??preds.length;
  const universe=p.coverage?.officialNominees??101;
  const anchor=p.rules?.topweightAnchorHorse||'Researching';
  const auditRows=weightAuditRows(preds);
  const audit=weightAuditStats(auditRows);
  const officialReleased=officialWeights?.status==='OFFICIAL'&&audit.scored>0;
  return `<div class="section-header"><div><div class="kicker">Full-Field Pre-Handicap Model · ${p.snapshotDate}</div><h2>Weights & Handicap</h2><div class="section-copy">${officialReleased?'Official handicaps are loaded. Every pre-release Hub prediction is now frozen and scored against the declared weights.':'These are Hub estimates, not official weights. The pre-release board is frozen for later scoring against Racing Victoria.'}</div></div></div>
  <section class="metric-grid">
    ${metric('Coverage',`${covered}/${universe}`,'Original nominees modelled')}
    ${metric(officialReleased?'Official Loaded':'Topweight Anchor',officialReleased?`${audit.scored}/${universe}`:anchor,officialReleased?'Declared weights matched':'Provisional 59kg scale anchor')}
    ${metric(officialReleased?'Model MAE': 'Minimum Weight',officialReleased?`${audit.mae.toFixed(2)}kg`:'51.0kg',officialReleased?'Absolute prediction error':'Older horses')}
    ${metric(officialReleased?'Model Bias':'3YO Minimum',officialReleased?`${audit.bias>0?'+':''}${audit.bias.toFixed(2)}kg`:'49.0kg',officialReleased?'Official minus predicted':'Age-adjusted floor')}
    ${metric(officialReleased?'Within ±0.5kg':'Official Release',officialReleased?`${audit.withinHalf}/${audit.scored}`:'17 Sep',officialReleased?'Best calibrated calls':'Racing Victoria handicaps')}
  </section>
  <section class="profile-grid"><div class="panel"><h3>Handicap Model Rules</h3><div class="rule-list">${w.methodologyNotes.map((n,i)=>`<div class="rule-row"><span>${String(i+1).padStart(2,'0')}</span><p>${n}</p></div>`).join('')}</div></div><div class="panel"><h3>Model Discipline</h3><p class="analysis-copy">The pre-release board remains immutable after the freeze. Official weights are loaded into a separate ledger and compared; they never overwrite the model prediction.</p><p class="analysis-copy">Northern Hemisphere three-year-olds remain a separate calibration problem rather than being converted mechanically from older-horse overseas ratings.</p><p class="analysis-copy">Inactive original nominees stay in the audit universe so prediction accuracy cannot be improved by deleting difficult calls after the fact.</p><div class="audit-banner"><strong>Status</strong><span>${officialReleased?`${audit.scored} official weights scored · ${audit.bigMisses} misses of 2kg+`:`${covered}/${universe} modelled · official comparison armed for 17 Sep`}</span></div></div></section>
  <div class="panel"><div class="panel-head"><div><h3>Working Weight Board</h3><div class="panel-sub">Estimated range shows uncertainty before official declarations.</div></div><span class="tag gold">PRE-RELEASE FREEZE</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Rank</th><th>Horse</th><th>Pred.</th><th>Range</th><th>Tier</th><th>Confidence</th><th>Status</th><th>Reasoning</th></tr></thead><tbody>${preds.map((x,i)=>`<tr><td>${i+1}</td><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td><strong>${x.predictedKg.toFixed(1)}kg</strong></td><td>${x.rangeLow.toFixed(1)}–${x.rangeHigh.toFixed(1)}</td><td>${x.tier}</td><td>${confidenceTag(x.confidence)}</td><td>${weightStatus(x)}</td><td class="wrap-cell">${x.reason}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="panel spaced-panel"><div class="panel-head"><div><h3>Official Weight Audit</h3><div class="panel-sub">Predictions remain untouched. Official values and errors are joined from a separate dated ledger.</div></div><span class="tag ${officialReleased?'green':'gold'}">${officialReleased?'OFFICIAL LOADED':'ARMED · PENDING RELEASE'}</span></div>
  ${officialReleased?`<section class="metric-grid">${metric('Scored',audit.scored,'Matched official handicaps')}${metric('MAE',`${audit.mae.toFixed(2)}kg`,'Mean absolute error')}${metric('Bias',`${audit.bias>0?'+':''}${audit.bias.toFixed(2)}kg`,'Official minus predicted')}${metric('±0.5kg',audit.withinHalf,'Near-exact predictions')}${metric('2kg+ Misses',audit.bigMisses,'Priority review cases')}</section>`:''}
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Hub Prediction</th><th>Official</th><th>Error</th><th>Audit State</th></tr></thead><tbody>${auditRows.map(x=>`<tr><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>${x.predictedKg.toFixed(1)}kg</td><td>${Number.isFinite(x.official)?`${x.official.toFixed(1)}kg`:'—'}</td><td>${weightErrorCell(x)}</td><td>${x.activeCupStatus?`<span class="muted">${x.activeCupStatus}</span>`:(Number.isFinite(x.official)?tag('Scored','green'):'<span class="muted">Awaiting official weight</span>')}</td></tr>`).join('')}</tbody></table></div></div>`;
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
    const officialCount=(officialWeights?.weights||[]).length;
    if(label) label.textContent=`101 nominations · ${Object.keys(trainingBaseData?.bases??{}).length} bases verified · ${qualificationData?.qualified?.length??0} Golden Tickets known · ${weightPredictions?.predictions?.length??0} weights modelled${officialCount?` · ${officialCount} official weights loaded`:''}`;
  }
});
