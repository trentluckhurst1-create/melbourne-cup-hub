function commandLatestEvents(){
  return [...(leadupData?.events||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,7);
}
function commandTopWeights(){
  return [...(weightPredictions?.predictions||[])].sort((a,b)=>Number(b.predictedKg)-Number(a.predictedKg)).slice(0,8);
}
function commandProjected(){return projectedFieldData?.projected24||[];}
function commandResearchGaps(){
  const unresolvedTf=new Set(timeformStatusData?.unresolvedHorses||[]);
  const projected=new Map((projectedFieldData?.projected24||[]).map(x=>[x.horse,x.rank]));
  return (cupData?.horses||[]).map(h=>{
    const form=typeof formCompletionState==='function'?formCompletionState(h.horse):{state:'RESEARCH_GAP',runs:(formIntelData?.horses?.[h.horse]?.runs||[]).length};
    const formOk=form.state==='COMPLETE'||form.state==='CAREER_COMPLETE';
    let missing=0;
    if(!formOk)missing++;
    if(!baseRecord(h.horse))missing++;
    if(unresolvedTf.has(h.horse))missing++;
    if(!weightRec(h.horse))missing++;
    return {horse:h.horse,trainer:h.trainer,runs:form.runs,formState:form.state,formOk,missing,tf:!unresolvedTf.has(h.horse),base:!!baseRecord(h.horse),weight:!!weightRec(h.horse),projectedRank:projected.get(h.horse)||null};
  }).filter(x=>x.missing>0).sort((a,b)=>(a.projectedRank?0:1)-(b.projectedRank?0:1)||(a.projectedRank||99)-(b.projectedRank||99)||b.missing-a.missing||a.runs-b.runs||a.horse.localeCompare(b.horse)).slice(0,8);
}
function commandInternational(){
  return (cupData?.horses||[]).filter(h=>h.trainingRegion==='International').map(h=>({...h,prep:typeof prepRecord==='function'?prepRecord(h.horse):null,projected:typeof projectedRec==='function'?projectedRec(h.horse):null})).filter(x=>x.prep||x.projected).sort((a,b)=>(a.projected?.rank||99)-(b.projected?.rank||99)).slice(0,7);
}
function commandWeightChanges(){
  if(!(officialWeights?.weights||[]).length||typeof orderWeightDelta!=='function')return [];
  const projected=new Set((projectedFieldData?.projected24||[]).map(x=>x.horse));
  return (officialWeights.weights||[]).map(x=>({horse:x.horse,official:Number(x.weightKg),delta:orderWeightDelta(x.horse)})).filter(x=>projected.has(x.horse)&&Number.isFinite(x.delta)&&Math.abs(x.delta)>=1.5).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,5).map(x=>({date:officialWeights.observedAt?.slice(0,10)||officialWeights.expectedReleaseDate||'2026-09-17',type:'WEIGHT',horse:x.horse,title:`Official ${x.official.toFixed(1)}kg`,detail:`${x.delta>0?'+':''}${x.delta.toFixed(1)}kg vs frozen Hub prediction`,view:'weights'}));
}
function commandChangeFeed(){
  const out=[]; const market=typeof marketUniverse==='function'?marketUniverse():[];
  for(const m of market.filter(x=>x.material).sort((a,b)=>Math.abs(b.impliedMovePct)-Math.abs(a.impliedMovePct)).slice(0,5))out.push({date:m.last.date,type:'MARKET',horse:m.horse,title:`${m.previousSameBook?`$${m.previousSameBook.odds.toFixed(2)} → `:''}$${m.last.odds.toFixed(2)} · ${m.last.bookmaker}`,detail:`${m.change<0?'SHORTENED':'DRIFTED'} · ${Math.abs(m.impliedMovePct).toFixed(0)}% implied-probability move`,view:'markets'});
  out.push(...commandWeightChanges());
  for(const e of [...(leadupData?.events||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8))out.push({date:e.date,type:e.status==='Golden Ticket'?'FIELD':'FORM',horse:e.horse,title:e.race,detail:e.result&&e.result!=='Pending'?e.result:(e.status||e.note||'Campaign update'),view:e.status==='Golden Ticket'?'order':'leadups'});
  return out.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
}
function commandEvidenceState(){
  const tf=timeformStatusData?.profilesMatched||0; const audit=typeof formCompletionSummary==='function'?formCompletionSummary():null;
  const formAny=(cupData?.horses||[]).filter(h=>(typeof publicActualRuns==='function'?publicActualRuns(h.horse):(formIntelData?.horses?.[h.horse]?.runs||[])).length>0).length;
  return {tf,formAny,formComplete:audit?audit.complete+audit.career:0,formFlags:audit?.flagged||0,bases:Object.keys(trainingBaseData?.bases||{}).length,weights:weightPredictions?.predictions?.length||0,market:typeof marketUniverse==='function'?marketUniverse().length:0,officialWeightCount:(officialWeights?.weights||[]).length};
}
function commandCentreDashboard(){
  const projected=commandProjected(),latest=commandLatestEvents(),topWeights=commandTopWeights(),gaps=commandResearchGaps(),internationals=commandInternational(),changes=commandChangeFeed(),evidence=commandEvidenceState();
  const knownTickets=qualificationData?.qualified||[],nominatedTickets=knownTickets.filter(x=>horseByName(x.horse)),cutIn=projected.find(x=>x.rank===24)?.horse||'—',firstOut=projectedFieldData?.nextSix?.[0]||'—',topweight=topWeights[0],c=daysToCup();
  const marketState=typeof snapshotState==='function'?snapshotState(marketSnapshots?.[marketSnapshots.length-1]):{label:'NO LIVE CLAIM'};
  return `<section class="cc-statusbar"><div><span class="cc-workspace-dot"></span><strong>2026 MELBOURNE CUP WORKSPACE</strong></div><div class="cc-status-items"><span>${cupData?.snapshot?.totalEntries||101} nominees</span><span>${projected.length}/24 projected</span><span>${nominatedTickets.length} nominated tickets</span><span>Market: ${marketState.label}</span><span>${c.days}d ${c.hours}h to race</span></div></section>
  <section class="panel cc-panel cc-changes"><div class="cc-panel-head"><div><span class="cc-label">DELTA INTELLIGENCE</span><h3>What Changed?</h3><div class="panel-sub">Newest material market, field, handicap and campaign changes. Static facts are deliberately suppressed.</div></div><span class="tag gold">DATED EVIDENCE</span></div><div class="cc-change-feed">${changes.length?changes.map(x=>`<button onclick="${x.horse&&horseByName(x.horse)?`openHorse('${x.horse.replace(/'/g,"\\'")}')`:`openView('${x.view}')`}"><span class="cc-change-type">${x.type}</span><span class="cc-change-date">${x.date||'—'}</span><span class="cc-change-main"><strong>${x.horse||'Cup-wide'} · ${x.title}</strong><em>${x.detail}</em></span></button>`).join(''):'<div class="cc-no-change">No new material changes in the loaded evidence.</div>'}</div></section>
  <section class="cc-grid-main"><div class="panel cc-panel cc-projected"><div class="cc-panel-head"><div><span class="cc-label">FIELD MODEL</span><h3>Projected 24</h3></div><button class="mini-button" onclick="openView('order')">Open field</button></div><div class="cc-runner-list">${projected.slice(0,12).map(x=>`<button onclick="openHorse('${x.horse.replace(/'/g,"\\'")}')"><span class="cc-rank">${String(x.rank).padStart(2,'0')}</span><span class="cc-runner"><strong>${x.horse}</strong><em>${x.band}</em></span><span>${typeof orderWeight==='function'?orderWeight(x.horse):(weightRec(x.horse)?weightRec(x.horse).predictedKg.toFixed(1)+'kg':'—')}</span></button>`).join('')}</div><div class="cc-cut"><span>IN #24 <strong>${cutIn}</strong></span><i>CUT</i><span>OUT #25 <strong>${firstOut}</strong></span></div></div>
  <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">CAMPAIGN FEED</span><h3>Latest Lead-ups</h3></div><button class="mini-button" onclick="openView('leadups')">All events</button></div><div class="cc-feed">${latest.map(x=>`<div class="cc-feed-row"><div><span>${new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</span></div><div><strong>${horseByName(x.horse)?horseLink(x.horse):x.horse}</strong><em>${x.race}${x.track?' · '+x.track:''}</em></div><div>${x.result&&x.result!=='Pending'?x.result:(x.status||'Pending')}</div></div>`).join('')}</div></div></section>
  <section class="cc-grid-secondary"><div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">HANDICAP</span><h3>Weight Leaders</h3></div></div><div class="cc-mini-table">${topWeights.map((x,i)=>`<div><span>${i+1}</span><strong>${horseLink(x.horse)}</strong><b>${Number(x.predictedKg).toFixed(1)}kg</b></div>`).join('')}</div></div><div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">INTERNATIONAL</span><h3>Campaign Monitor</h3></div></div><div class="cc-mini-table">${internationals.map(x=>`<div><span>${x.projected?'#'+x.projected.rank:'—'}</span><strong>${horseLink(x.horse)}</strong><b>${x.prep?.campaignStatus||x.projected?.band||'Researching'}</b></div>`).join('')}</div></div><div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">DATA CONTROL</span><h3>Research Queue</h3></div></div><div class="cc-gap-list">${gaps.map(x=>`<button onclick="openHorse('${x.horse.replace(/'/g,"\\'")}')"><div><strong>${x.horse}</strong></div></button>`).join('')}</div></div></section>
  <section class="panel cc-panel cc-qualified"><div class="cc-panel-head"><div><span class="cc-label">BALLOT EXEMPTIONS</span><h3>Golden Ticket Control</h3></div></div><div class="cc-ticket-summary"><span>${nominatedTickets.length} official nominees with tickets</span><span>${knownTickets.length} known tickets overall</span></div></section>`;
}
const commandDashboardBase=dashboard;
dashboard=function(){if(!cupData)return commandDashboardBase();return commandCentreDashboard();};
const commandRenderBase=render;
let commandDashboardLoading=false;
render=function(view='dashboard'){
  if(view==='dashboard'){
    document.getElementById('page-title').textContent='Cup Command Centre';
    const root=document.getElementById('app-content');
    const pending=[];
    if(!qualificationData||!weightPredictions)pending.push(Promise.resolve().then(()=>loadExtras()));
    if(!projectedFieldData)pending.push(Promise.resolve().then(()=>loadProjectedField()));
    if(!leadupData)pending.push(Promise.resolve().then(()=>loadLeadups()));
    if(!formIntelData||!timeformStatusData)pending.push(Promise.resolve().then(()=>loadFormIntel()));
    if(typeof loadInternationalPrep==='function'&&!internationalPrepData)pending.push(Promise.resolve().then(()=>loadInternationalPrep()));
    if(typeof loadMarketWorkbench==='function'&&!marketSnapshots.length)pending.push(Promise.resolve().then(()=>loadMarketWorkbench()));
    if(pending.length&&!commandDashboardLoading){
      commandDashboardLoading=true;
      root.innerHTML='<div class="placeholder">Loading command centre intelligence…</div>';
      Promise.allSettled(pending).finally(()=>{commandDashboardLoading=false;commandRenderBase('dashboard');});
      return;
    }
    if(commandDashboardLoading)return;
  }
  commandRenderBase(view);
};
