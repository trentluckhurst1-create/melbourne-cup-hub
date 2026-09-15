function dossierProjected(name){try{return typeof projectedRec==='function'?projectedRec(name):(projectedFieldData?.projected24||[]).find(x=>x.horse===name)||null;}catch(e){return null;}}
function dossierWeight(name){try{return typeof weightRec==='function'?weightRec(name):null;}catch(e){return null;}}
function dossierOfficialWeight(name){try{const map=typeof officialWeightMap==='function'?officialWeightMap():new Map();const r=map.get(name);return r?Number(r.weightKg):null;}catch(e){return null;}}
function dossierLeadup(name){try{return typeof latestLeadup==='function'?latestLeadup(name):null;}catch(e){return null;}}
function dossierForm(name){try{return typeof publicActualRuns==='function'?publicActualRuns(name):(formIntelData?.horses?.[name]?.runs||[]);}catch(e){return formIntelData?.horses?.[name]?.runs||[];}}
function dossierRatedRuns(name){try{return typeof publicRatedRuns==='function'?publicRatedRuns(name):dossierForm(name).map(r=>({...r,publicRating:null}));}catch(e){return dossierForm(name).map(r=>({...r,publicRating:null}));}}
function dossierPublicRating(name){try{return typeof publicFormRating==='function'?publicFormRating(name):null;}catch(e){return null;}}
function dossierFormState(name){try{return typeof formCompletionState==='function'?formCompletionState(name):{state:'RESEARCH_GAP',runs:dossierForm(name).length};}catch(e){return {state:'RESEARCH_GAP',runs:dossierForm(name).length};}}
function dossierTf(name){try{return typeof privateTfMatched==='function'&&privateTfMatched(name);}catch(e){return false;}}
function dossierQual(name){try{return typeof qualificationState==='function'?qualificationState(name):(GOLDEN_TICKETS.has(name)?'Golden Ticket':'No exemption');}catch(e){return GOLDEN_TICKETS.has(name)?'Golden Ticket':'No exemption';}}
function dossierStamina(name){try{return typeof staminaBand==='function'?staminaBand(name):'Researching';}catch(e){return 'Researching';}}
function dossierReady(name){try{return typeof readinessScore==='function'?readinessScore(name):null;}catch(e){return null;}}
function dossierMarketRec(name){try{return typeof marketUniverse==='function'?marketUniverse().find(x=>x.horse===name)||null:null;}catch(e){return null;}}
function dossierMarket(name){const m=dossierMarketRec(name);return m?`$${m.last.odds.toFixed(2)}`:'—';}
function dossierBase(name){const r=baseRecord(name);return {value:r?.trainingBase||'Researching',detail:r?`Verified ${r.verifiedDate}`:'Horse-specific base not yet verified',source:r?.source||null};}
function dossierRaceClass(r){const value=r?.classGroup||r?.raceClass||r?.class||'';return value?String(value).trim():'—';}
function dossierRunRows(name){const runs=dossierRatedRuns(name);if(!runs.length)return '<tr><td colspan="11" class="order-empty">No verified public race starts loaded yet.</td></tr>';return runs.map(r=>`<tr><td>${r.date||'—'}</td><td>${r.track||'—'}</td><td class="wrap-cell">${r.race||'—'}</td><td><strong>${dossierRaceClass(r)}</strong></td><td>${r.distanceM?`${r.distanceM}m`:'—'}</td><td>${r.going||'—'}</td><td>${r.weightKg?`${r.weightKg}kg`:r.weightCarried||r.weight||'—'}</td><td class="dossier-run-result">${r.finish||'—'}</td><td>${r.margin??'—'}</td><td><strong>${Number.isFinite(r.publicRating)?r.publicRating.toFixed(1):'—'}</strong></td><td>${r.performanceRating??'—'}</td></tr>`).join('');}
function dossierEvidence(name){
  const formState=dossierFormState(name);const formOk=formState.state==='COMPLETE'||formState.state==='CAREER_COMPLETE';const base=dossierBase(name);const w=dossierWeight(name);const m=dossierMarketRec(name);const tf=dossierTf(name);
  return [
    {label:'FORM',state:formOk?'VERIFIED':'GAP',detail:`${formState.runs}/8 actual starts · ${String(formState.state).replace(/_/g,' ')}`,ok:formOk},
    {label:'BASE',state:base.source?'VERIFIED':'GAP',detail:base.source||'Horse-specific source pending',ok:!!base.source},
    {label:'WEIGHT',state:w?'MODELLED':'GAP',detail:w?`${Number(w.predictedKg).toFixed(1)}kg frozen estimate`:'Estimate pending',ok:!!w},
    {label:'MARKET',state:m?'DATED':'GAP',detail:m?`${m.last.bookmaker} · ${m.last.date}`:'No stored bookmaker observation',ok:!!m},
    {label:'TIMEFORM',state:tf?'IDENTITY':'GAP',detail:tf?'Horse identity matched; numeric layer separate':'Identity unresolved',ok:tf}
  ];
}
function dossierEvidenceHtml(name){
  const e=dossierEvidence(name);const score=e.filter(x=>x.ok).length;
  return `<section class="panel dossier-section"><div class="panel-head"><div><h3>Evidence State</h3><div class="panel-sub">Verified facts, modelled estimates and dated observations are deliberately kept separate.</div></div><span class="tag ${score>=4?'green':score>=3?'gold':'red'}">${score}/5 MATURE</span></div><div class="dossier-facts">${e.map(x=>`<div><span>${x.label}</span><strong>${x.state}</strong><small>${x.detail}</small></div>`).join('')}</div></section>`;
}

const dossierBaseHorseDetail=horseDetailView;
horseDetailView=function(name){
  const h=horseByName(name);if(!h)return dossierBaseHorseDetail(name);
  const intel=typeof intelRecord==='function'?intelRecord(name):null;
  const base=dossierBase(name);const proj=dossierProjected(name);const w=dossierWeight(name);const official=dossierOfficialWeight(name);const lead=dossierLeadup(name);const runs=dossierForm(name);const formState=dossierFormState(name);const pub=dossierPublicRating(name);const tf=dossierTf(name);const qual=dossierQual(name);const stamina=dossierStamina(name);const ready=dossierReady(name);const market=dossierMarketRec(name);
  const predKg=w?Number(w.predictedKg):(h.predictedWeightKg?Number(h.predictedWeightKg):null);
  const predWeight=Number.isFinite(predKg)?`${predKg.toFixed(1)}kg`:'—';
  const weightDelta=Number.isFinite(official)&&Number.isFinite(predKg)?official-predKg:null;
  const weightDeltaText=Number.isFinite(weightDelta)?`${weightDelta>0?'+':''}${weightDelta.toFixed(1)}kg vs model`:'Official pending';
  const badges=[tag(h.status||'Nominated'),qual==='Golden Ticket'?tag('Golden Ticket','green'):null,proj?tag(`Projected #${proj.rank}`,proj.rank<=19?'green':'gold'):null,pub?tag(`PFR ${pub.current.toFixed(1)}`,pub.current>=98?'green':'gold'):null,tf?tag('TF identity matched','green'):tag('TF unresolved','red'),Number.isFinite(weightDelta)&&Math.abs(weightDelta)>=1.5?tag('Weight shock','red'):null].filter(Boolean).join('');
  const marketState=market&&typeof snapshotState==='function'?snapshotState({snapshotDate:market.last.date}):null;
  const formComplete=formState.state==='COMPLETE'||formState.state==='CAREER_COMPLETE';
  const traj=pub?.trajectory===null||pub?.trajectory===undefined?'Limited data':`${pub.trajectoryLabel} ${pub.trajectory>0?'+':''}${pub.trajectory.toFixed(1)}`;
  return `<button class="back-button" onclick="openView('horses')">← All horse profiles</button>
  <section class="dossier-hero"><div><div class="kicker">Nomination #${h.nominationNumber} · ${h.country}</div><h2>${h.horse}</h2><div class="dossier-hero-meta">${intel?.ageSex||'Age/sex researching'} · ${h.trainer} · ${base.value}</div></div><div class="dossier-badges">${badges}</div></section>
  <section class="metric-grid">
    ${metric('Projected Rank',proj?`#${proj.rank}`:'Outside current 24',proj?.band||'Current Hub projection')}
    ${metric('PFR Current',pub?pub.current.toFixed(1):'—',pub?`${publicFormBand(pub)} · Peak ${pub.peak.toFixed(1)}`:'Public form required')}
    ${metric('Trajectory',pub?traj:'—','Public recent-v-older form')}
    ${metric(Number.isFinite(official)?'Official Weight':'Predicted Weight',Number.isFinite(official)?`${official.toFixed(1)}kg`:predWeight,Number.isFinite(official)?weightDeltaText:(w?.rangeKg?`MODELLED · Range ${w.rangeKg}`:'MODELLED · Pre-release estimate'))}
    ${metric('Stamina',stamina,pub?.longStayPeak!==null&&pub?.longStayPeak!==undefined?`2800m+ peak PFR ${pub.longStayPeak.toFixed(1)}`:'Derived from loaded public form')}
    ${metric('Form Coverage',formComplete?'COMPLETE':`${runs.length}/8`,`${formState.state.replace(/_/g,' ')} · actual race starts`)}
    ${metric('Latest Market',market?`$${market.last.odds.toFixed(2)}`:'—',market?`${market.last.bookmaker} · ${market.last.date} · ${marketState?.label||'DATED'}`:'No stored observation')}
  </section>
  ${dossierEvidenceHtml(name)}
  <section class="dossier-grid">
    <div class="panel"><div class="panel-head"><div><h3>Cup Intelligence</h3><div class="panel-sub">Current evidence state for this nominee.</div></div></div><div class="dossier-facts">
      <div><span>Trainer</span><strong>${h.trainer}</strong></div><div><span>Current horse base</span><strong>${base.value}</strong></div>
      <div><span>Qualification</span><strong>${qual}</strong></div><div><span>Projection band</span><strong>${proj?.band||'Outside current 24'}</strong></div>
      <div><span>Public form rating</span><strong>${pub?`${pub.current.toFixed(1)} current · ${pub.peak.toFixed(1)} peak`:'Unrated'}</strong><small>PFR-1.0 · not Timeform</small></div><div><span>2800m+ rated peak</span><strong>${pub?.longStayPeak!==null&&pub?.longStayPeak!==undefined?pub.longStayPeak.toFixed(1):'No loaded 2800m+ run'}</strong></div>
      <div><span>Official weight</span><strong>${Number.isFinite(official)?`${official.toFixed(1)}kg`:'Pending 17 Sep'}</strong>${Number.isFinite(weightDelta)?`<small>${weightDeltaText}</small>`:''}</div><div><span>Frozen predicted weight</span><strong>${predWeight}</strong></div>
      <div><span>Market observation</span><strong>${dossierMarket(name)}</strong>${market?`<small>${market.last.bookmaker} · observed ${market.last.date} · not automatically live</small>`:''}</div><div><span>Timeform</span><strong>${tf?'Identity matched':'Identity unresolved'}</strong><small>${tf?'Numeric subscriber ratings remain separate/private':'No rating substituted'}</small></div>
    </div>${base.source?`<div class="dossier-source">Base source: ${base.source}</div>`:''}${proj?.reason?`<div class="dossier-callout"><span>Projection rationale</span><strong>${proj.reason}</strong></div>`:''}</div>
    <div class="panel"><div class="panel-head"><div><h3>Preparation & Campaign</h3><div class="panel-sub">Latest verified Cup-relevant activity.</div></div></div><div class="dossier-facts">
      <div><span>Latest lead-up</span><strong>${lead?.race||'Researching'}</strong></div><div><span>Latest result</span><strong>${lead?.result||lead?.status||'Researching'}</strong></div>
      <div><span>Campaign status</span><strong>${intel?.campaignStatus||'Researching'}</strong></div><div><span>Cup relevance</span><strong>${intel?.cupRelevance||'Assessment pending'}</strong></div>
    </div>${lead?`<div class="dossier-callout"><span>Latest campaign event</span><strong>${lead.date||''} · ${lead.race||''}${lead.result?` · ${lead.result}`:''}</strong></div>`:''}${intel?.latestNote?`<div class="dossier-callout"><span>Latest note</span><strong>${intel.latestNote}</strong></div>`:''}</div>
  </section>
  <section class="panel dossier-section"><div class="panel-head"><div><h3>Latest Public Form & Ratings</h3><div class="panel-sub">Race class belongs to the individual performance, so it is shown here against every verified start rather than as a horse-level ranking field.</div></div><span class="tag ${formComplete?'green':'gold'}">${formComplete?formState.state.replace(/_/g,' '):`${runs.length}/8 LOADED`}</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Track</th><th>Race</th><th>Class</th><th>Dist.</th><th>Going</th><th>Weight</th><th>Finish</th><th>Margin</th><th>PFR</th><th>TF</th></tr></thead><tbody>${dossierRunRows(name)}</tbody></table></div></section>
  <section class="panel dossier-section"><div class="panel-head"><div><h3>Decision Notes</h3><div class="panel-sub">Evidence gaps remain visible rather than being silently filled.</div></div></div><div class="dossier-facts"><div><span>Base verification</span><strong>${base.detail}</strong></div><div><span>Timeform numeric layer</span><strong>${tf?'Private import pending / separate':'Identity resolution pending'}</strong></div><div><span>Order of Entry</span><strong>${proj?`Projected #${proj.rank}`:'Outside current projected 24'}</strong></div><div><span>Staying evidence</span><strong>${stamina}</strong></div></div></section>`;
};
