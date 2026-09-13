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
function commandCentreDashboard(){
  const projected=commandProjected();
  const latest=commandLatestEvents();
  const topWeights=commandTopWeights();
  const gaps=commandResearchGaps();
  const internationals=commandInternational();
  const qualified=qualificationData?.qualified||[];
  const verifiedBases=Object.keys(trainingBaseData?.bases||{}).length;
  const tfMatched=timeformStatusData?.profilesMatched||0;
  const formLoaded=Object.values(formIntelData?.horses||{}).filter(x=>(x.runs||[]).length>0).length;
  const cutIn=projected.find(x=>x.rank===24)?.horse||'—';
  const firstOut=projectedFieldData?.nextSix?.[0]||'—';
  const topweight=topWeights[0];
  const c=daysToCup();
  return `
  <section class="cc-statusbar">
    <div><span class="cc-live-dot"></span><strong>2026 MELBOURNE CUP WORKSPACE</strong></div>
    <div class="cc-status-items"><span>${cupData?.snapshot?.totalEntries||101} nominees</span><span>${projected.length}/24 projected</span><span>${qualified.length} qualified</span><span>${c.days}d ${c.hours}h to race</span></div>
  </section>

  <section class="cc-metrics">
    <button class="cc-metric" onclick="openView('order')"><span>PROJECTED CUT</span><strong>${cutIn}</strong><em>#24 · first out ${firstOut}</em></button>
    <button class="cc-metric" onclick="openView('weights')"><span>TOP WEIGHT MODEL</span><strong>${topweight?topweight.predictedKg.toFixed(1)+'kg':'—'}</strong><em>${topweight?.horse||'Awaiting model'}</em></button>
    <button class="cc-metric" onclick="openView('timeform')"><span>TIMEFORM MATCHED</span><strong>${tfMatched}/101</strong><em>${101-tfMatched} identity gaps</em></button>
    <button class="cc-metric" onclick="openView('form')"><span>PUBLIC FORM</span><strong>${formLoaded}/101</strong><em>horses with verified runs</em></button>
    <button class="cc-metric" onclick="openView('horses')"><span>CURRENT BASES</span><strong>${verifiedBases}/101</strong><em>horse-specific verified</em></button>
    <button class="cc-metric" onclick="openView('leadups')"><span>LATEST EVENT</span><strong>${latest[0]?.horse||'—'}</strong><em>${latest[0]?.race||'No event'}</em></button>
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
      <div class="cc-mini-table">${topWeights.map((x,i)=>`<div><span>${i+1}</span><strong>${horseLink(x.horse)}</strong><b>${Number(x.predictedKg).toFixed(1)}kg</b><em>${x.confidence}</em></div>`).join('')}</div>
    </div>
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">INTERNATIONAL</span><h3>Campaign Monitor</h3></div><button class="mini-button" onclick="openView('international')">Raiders</button></div>
      <div class="cc-mini-table">${internationals.map(x=>`<div><span>${x.projected?'#'+x.projected.rank:'—'}</span><strong>${horseLink(x.horse)}</strong><b>${x.prep?.campaignStatus||x.projected?.band||'Researching'}</b><em>${x.prep?.nextRun||x.trainer}</em></div>`).join('')}</div>
    </div>
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">DATA CONTROL</span><h3>Research Queue</h3></div><button class="mini-button" onclick="openView('analysis')">Matrix</button></div>
      <div class="cc-gap-list">${gaps.map(x=>`<button onclick="openHorse('${x.horse.replace(/'/g,"\\'")}')"><div><strong>${x.horse}</strong><span>${x.trainer}</span></div><div class="cc-gap-badges"><i class="${x.runs>=3?'ok':''}">F ${x.runs}</i><i class="${x.base?'ok':''}">B</i><i class="${x.tf?'ok':''}">TF</i><i class="${x.weight?'ok':''}">W</i></div></button>`).join('')}</div>
    </div>
  </section>

  <section class="panel cc-panel cc-qualified"><div class="cc-panel-head"><div><span class="cc-label">BALLOT EXEMPTIONS</span><h3>Golden Ticket Control</h3></div><button class="mini-button" onclick="openView('order')">Qualification</button></div>
    <div class="cc-ticket-row">${qualified.map(x=>`<button onclick="${horseByName(x.horse)?`openHorse('${x.horse.replace(/'/g,"\\'")}')`:'void 0'}"><span>QUALIFIED</span><strong>${x.horse}</strong><em>${x.race}</em></button>`).join('')}</div>
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
    if(pending.length){root.innerHTML='<div class="placeholder">Loading command centre intelligence…</div>';Promise.all(pending).then(()=>render('dashboard'));return;}
  }
  commandRenderBase(view);
};
