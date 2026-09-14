function commandLatestEvents(){
  return [...(leadupData?.events||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,7);
}
function commandTopWeights(){
  return [...(weightPredictions?.predictions||[])].sort((a,b)=>Number(b.predictedKg)-Number(a.predictedKg)).slice(0,8);
}
function commandProjected(){return projectedFieldData?.projected24||[];}
function commandResearchGaps(){
  const unresolvedTf=new Set(timeformStatusData?.unresolvedHorses||[]);
  return (cupData?.horses||[]).map(h=>{
    const runs=(formIntelData?.horses?.[h.horse]?.runs||[]).length;
    let missing=0;
    if(runs<3)missing++;
    if(!baseRecord(h.horse))missing++;
    if(unresolvedTf.has(h.horse))missing++;
    if(!weightRec(h.horse))missing++;
    return {horse:h.horse,trainer:h.trainer,runs,missing,tf:!unresolvedTf.has(h.horse),base:!!baseRecord(h.horse),weight:!!weightRec(h.horse)};
  }).sort((a,b)=>b.missing-a.missing||a.runs-b.runs||a.horse.localeCompare(b.horse)).slice(0,8);
}
function commandInternational(){
  return (cupData?.horses||[]).filter(h=>h.trainingRegion==='International').map(h=>({
    ...h,
    prep:typeof prepRecord==='function'?prepRecord(h.horse):null,
    projected:typeof projectedRec==='function'?projectedRec(h.horse):null
  })).filter(x=>x.prep||x.projected).sort((a,b)=>(a.projected?.rank||99)-(b.projected?.rank||99)).slice(0,7);
}
function commandChangeFeed(){
  const out=[];
  const market=typeof marketUniverse==='function'?marketUniverse():[];
  for(const m of market.filter(x=>x.material).sort((a,b)=>Math.abs(b.impliedMovePct)-Math.abs(a.impliedMovePct)).slice(0,5)){
    out.push({date:m.last.date,type:'MARKET',horse:m.horse,title:`${m.previousSameBook?`$${m.previousSameBook.odds.toFixed(2)} → `:''}$${m.last.odds.toFixed(2)} · ${m.last.bookmaker}`,detail:`${m.change<0?'SHORTENED':'DRIFTED'} · ${Math.abs(m.impliedMovePct).toFixed(0)}% implied-probability move`,view:'markets'});
  }
  for(const e of [...(leadupData?.events||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8)){
    out.push({date:e.date,type:e.status==='Golden Ticket'?'FIELD':'FORM',horse:e.horse,title:e.race,detail:e.result&&e.result!=='Pending'?e.result:(e.status||e.note||'Campaign update'),view:e.status==='Golden Ticket'?'order':'leadups'});
  }
  return out.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
}
function commandEvidenceState(){
  const tf=timeformStatusData?.profilesMatched||0;
  const form=Object.values(formIntelData?.horses||{}).filter(x=>(x.runs||[]).length>0).length;
  const bases=Object.keys(trainingBaseData?.bases||{}).length;
  const weights=weightPredictions?.predictions?.length||0;
  const market=typeof marketUniverse==='function'?marketUniverse().length:0;
  return {tf,form,bases,weights,market};
}
function commandCentreDashboard(){
  const projected=commandProjected();
  const latest=commandLatestEvents();
  const topWeights=commandTopWeights();
  const gaps=commandResearchGaps();
  const internationals=commandInternational();
  const changes=commandChangeFeed();
  const evidence=commandEvidenceState();
  const knownTickets=qualificationData?.qualified||[];
  const nominatedTickets=knownTickets.filter(x=>horseByName(x.horse));
  const cutIn=projected.find(x=>x.rank===24)?.horse||'—';
  const firstOut=projectedFieldData?.nextSix?.[0]||'—';
  const topweight=topWeights[0];
  const c=daysToCup();
  const marketState=typeof snapshotState==='function'?snapshotState(marketSnapshots?.[marketSnapshots.length-1]):{label:'NO LIVE CLAIM'};
  return `
  <section class="cc-statusbar">
    <div><span class="cc-workspace-dot"></span><strong>2026 MELBOURNE CUP WORKSPACE</strong></div>
    <div class="cc-status-items"><span>${cupData?.snapshot?.totalEntries||101} nominees</span><span>${projected.length}/24 projected</span><span>${nominatedTickets.length} nominated tickets</span><span>Market: ${marketState.label}</span><span>${c.days}d ${c.hours}h to race</span></div>
  </section>

  <section class="panel cc-panel cc-changes"><div class="cc-panel-head"><div><span class="cc-label">DELTA INTELLIGENCE</span><h3>What Changed?</h3><div class="panel-sub">Newest material market, field and campaign changes. Static facts are deliberately suppressed.</div></div><span class="tag gold">DATED EVIDENCE</span></div>
    <div class="cc-change-feed">${changes.length?changes.map(x=>`<button onclick="${x.horse&&horseByName(x.horse)?`openHorse('${x.horse.replace(/'/g,"\\'")}')`:`openView('${x.view}')`}"><span class="cc-change-type">${x.type}</span><span class="cc-change-date">${x.date||'—'}</span><span class="cc-change-main"><strong>${x.horse||'Cup-wide'} · ${x.title}</strong><em>${x.detail}</em></span></button>`).join(''):'<div class="cc-no-change">No new material changes in the loaded evidence.</div>'}</div>
  </section>

  <section class="cc-metrics">
    <button class="cc-metric" onclick="openView('order')"><span>PROJECTED CUT</span><strong>${cutIn}</strong><em>#24 · first out ${firstOut}</em></button>
    <button class="cc-metric" onclick="openView('weights')"><span>TOP WEIGHT MODEL</span><strong>${topweight?topweight.predictedKg.toFixed(1)+'kg':'—'}</strong><em>${topweight?.horse||'Awaiting model'}</em></button>
    <button class="cc-metric" onclick="openView('timeform')"><span>TIMEFORM IDENTITY</span><strong>${evidence.tf}/101</strong><em>numeric ratings remain separate</em></button>
    <button class="cc-metric" onclick="openView('form')"><span>PUBLIC FORM</span><strong>${evidence.form}/101</strong><em>horses with verified runs</em></button>
    <button class="cc-metric" onclick="openView('horses')"><span>CURRENT BASES</span><strong>${evidence.bases}/101</strong><em>horse-specific verified</em></button>
    <button class="cc-metric" onclick="openView('markets')"><span>MARKET COVERAGE</span><strong>${evidence.market}/101</strong><em>stored bookmaker evidence</em></button>
  </section>

  <section class="cc-grid-main">
    <div class="panel cc-panel cc-projected"><div class="cc-panel-head"><div><span class="cc-label">FIELD MODEL</span><h3>Projected 24</h3></div><button class="mini-button" onclick="openView('order')">Open field</button></div>
      <div class="cc-runner-list">${projected.slice(0,12).map(x=>`<button onclick="openHorse('${x.horse.replace(/'/g,"\\'")}')"><span class="cc-rank">${String(x.rank).padStart(2,'0')}</span><span class="cc-runner"><strong>${x.horse}</strong><em>${x.band}</em></span><span>${weightRec(x.horse)?weightRec(x.horse).predictedKg.toFixed(1)+'kg':'—'}</span></button>`).join('')}</div>
      <div class="cc-cut"><span>IN #24 <strong>${cutIn}</strong></span><i>CUT</i><span>OUT #25 <strong>${firstOut}</strong></span></div>
    </div>

    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">CAMPAIGN FEED</span><h3>Latest Lead-ups</h3></div><button class="mini-button" onclick="openView('leadups')">All events</button></div>
      <div class="cc-feed">${latest.map(x=>`<div class="cc-feed-row"><div><span>${new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</span></div><div><strong>${horseByName(x.horse)?horseLink(x.horse):x.horse}</strong><em>${x.race}${x.track?' · '+x.track:''}</em></div><div>${x.result&&x.result!=='Pending'?x.result:(x.status||'Pending')}</div></div>`).join('')}</div>
    </div>
  </section>

  <section class="cc-grid-secondary">
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">HANDICAP</span><h3>Weight Leaders</h3></div><button class="mini-button" onclick="openView('weights')">Full board</button></div>
      <div class="cc-mini-table">${topWeights.map((x,i)=>`<div><span>${i+1}</span><strong>${horseLink(x.horse)}</strong><b>${Number(x.predictedKg).toFixed(1)}kg</b><em>MODELLED · ${x.confidence}</em></div>`).join('')}</div>
    </div>
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">INTERNATIONAL</span><h3>Campaign Monitor</h3></div><button class="mini-button" onclick="openView('international')">Raiders</button></div>
      <div class="cc-mini-table">${internationals.map(x=>`<div><span>${x.projected?'#'+x.projected.rank:'—'}</span><strong>${horseLink(x.horse)}</strong><b>${x.prep?.campaignStatus||x.projected?.band||'Researching'}</b><em>${x.prep?.nextRun||x.trainer}</em></div>`).join('')}</div>
    </div>
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">DATA CONTROL</span><h3>Research Queue</h3></div><button class="mini-button" onclick="openView('analysis')">Matrix</button></div>
      <div class="cc-gap-list">${gaps.map(x=>`<button onclick="openHorse('${x.horse.replace(/'/g,"\\'")}')"><div><strong>${x.horse}</strong><span>${x.trainer}</span></div><div class="cc-gap-badges"><i class="${x.runs>=3?'ok':''}">F ${x.runs}</i><i class="${x.base?'ok':''}">B</i><i class="${x.tf?'ok':''}">TF</i><i class="${x.weight?'ok':''}">W</i></div></button>`).join('')}</div>
    </div>
  </section>

  <section class="panel cc-panel cc-qualified"><div class="cc-panel-head"><div><span class="cc-label">BALLOT EXEMPTIONS</span><h3>Golden Ticket Control</h3></div><button class="mini-button" onclick="openView('order')">Qualification</button></div>
    <div class="cc-ticket-summary"><span>${nominatedTickets.length} official nominees with tickets</span><span>${knownTickets.length} known tickets overall</span></div>
    <div class="cc-ticket-row">${knownTickets.map(x=>`<button class="${horseByName(x.horse)?'':'cc-ticket-nonmember'}" onclick="${horseByName(x.horse)?`openHorse('${x.horse.replace(/'/g,"\\'")}')`:'void 0'}"><span>${horseByName(x.horse)?'NOMINATED · QUALIFIED':'TICKET · NOT IN ORIGINAL 101'}</span><strong>${x.horse}</strong><em>${x.race}</em></button>`).join('')}</div>
  </section>`;
}

const commandDashboardBase=dashboard;
dashboard=function(){
  if(!cupData)return commandDashboardBase();
  return commandCentreDashboard();
};

const commandRenderBase=render;
render=function(view='dashboard'){
  if(view==='dashboard'){
    document.getElementById('page-title').textContent='Cup Command Centre';
    const root=document.getElementById('app-content');
    const pending=[];
    if(!qualificationData||!weightPredictions)pending.push(loadExtras());
    if(!projectedFieldData)pending.push(loadProjectedField());
    if(!leadupData)pending.push(loadLeadups());
    if(!formIntelData||!timeformStatusData)pending.push(loadFormIntel());
    if(typeof loadInternationalPrep==='function'&&!internationalPrepData)pending.push(loadInternationalPrep());
    if(typeof loadMarketWorkbench==='function'&&!marketSnapshots.length)pending.push(loadMarketWorkbench());
    if(pending.length){root.innerHTML='<div class="placeholder">Loading command centre intelligence…</div>';Promise.all(pending).then(()=>render('dashboard'));return;}
  }
  commandRenderBase(view);
};
