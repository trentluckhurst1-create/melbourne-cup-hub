function dossierProjected(name){try{return typeof projectedRec==='function'?projectedRec(name):(projectedFieldData?.projected24||[]).find(x=>x.horse===name)||null;}catch(e){return null;}}
function dossierWeight(name){try{return typeof weightRec==='function'?weightRec(name):null;}catch(e){return null;}}
function dossierLeadup(name){try{return typeof latestLeadup==='function'?latestLeadup(name):null;}catch(e){return null;}}
function dossierForm(name){return formIntelData?.horses?.[name]?.runs||[];}
function dossierTf(name){try{return typeof privateTfMatched==='function'&&privateTfMatched(name);}catch(e){return false;}}
function dossierQual(name){try{return typeof qualificationState==='function'?qualificationState(name):(GOLDEN_TICKETS.has(name)?'Golden Ticket':'No exemption');}catch(e){return GOLDEN_TICKETS.has(name)?'Golden Ticket':'No exemption';}}
function dossierStamina(name){try{return typeof staminaBand==='function'?staminaBand(name):'Researching';}catch(e){return 'Researching';}}
function dossierReady(name){try{return typeof readinessScore==='function'?readinessScore(name):null;}catch(e){return null;}}
function dossierMarketRec(name){try{return typeof marketUniverse==='function'?marketUniverse().find(x=>x.horse===name)||null:null;}catch(e){return null;}}
function dossierMarket(name){const m=dossierMarketRec(name);return m?`$${m.last.odds.toFixed(2)}`:'—';}
function dossierBase(name){const r=baseRecord(name);return {value:r?.trainingBase||'Researching',detail:r?`Verified ${r.verifiedDate}`:'Horse-specific base not yet verified',source:r?.source||null};}
function dossierRunRows(name){const runs=dossierForm(name);if(!runs.length)return '<tr><td colspan="9" class="order-empty">No verified public race starts loaded yet.</td></tr>';return runs.map(r=>`<tr><td>${r.date||'—'}</td><td>${r.track||'—'}</td><td class="wrap-cell">${r.race||'—'}</td><td>${r.distanceM?`${r.distanceM}m`:'—'}</td><td>${r.going||'—'}</td><td>${r.weightKg?`${r.weightKg}kg`:r.weight||'—'}</td><td class="dossier-run-result">${r.finish||'—'}</td><td>${r.margin??'—'}</td><td>${r.performanceRating??'Pending'}</td></tr>`).join('');}
function dossierEvidence(name){
  const form=dossierForm(name);const base=dossierBase(name);const w=dossierWeight(name);const m=dossierMarketRec(name);const tf=dossierTf(name);
  return [
    {label:'FORM',state:form.length>=3?'VERIFIED':'GAP',detail:`${form.length}/8 starts loaded`,ok:form.length>=3},
    {label:'BASE',state:base.source?'VERIFIED':'GAP',detail:base.source||'Horse-specific source pending',ok:!!base.source},
    {label:'WEIGHT',state:w?'MODELLED':'GAP',detail:w?`${Number(w.predictedKg).toFixed(1)}kg estimate`:'Estimate pending',ok:!!w},
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
  const base=dossierBase(name);const proj=dossierProjected(name);const w=dossierWeight(name);const lead=dossierLeadup(name);const runs=dossierForm(name);const tf=dossierTf(name);const qual=dossierQual(name);const stamina=dossierStamina(name);const ready=dossierReady(name);const market=dossierMarketRec(name);
  const predWeight=w?`${Number(w.predictedKg).toFixed(1)}kg`:(h.predictedWeightKg?`${Number(h.predictedWeightKg).toFixed(1)}kg`:'—');
  const badges=[tag(h.status||'Nominated'),qual==='Golden Ticket'?tag('Golden Ticket','green'):null,proj?tag(`Projected #${proj.rank}`,proj.rank<=19?'green':'gold'):null,tf?tag('TF identity matched','green'):tag('TF unresolved','red')].filter(Boolean).join('');
  const marketState=market&&typeof snapshotState==='function'?snapshotState({snapshotDate:market.last.date}):null;
  return `<button class="back-button" onclick="openView('horses')">← All horse profiles</button>
  <section class="dossier-hero"><div><div class="kicker">Nomination #${h.nominationNumber} · ${h.country}</div><h2>${h.horse}</h2><div class="dossier-hero-meta">${intel?.ageSex||'Age/sex researching'} · ${h.trainer} · ${base.value}</div></div><div class="dossier-badges">${badges}</div></section>
  <section class="metric-grid">
    ${metric('Projected Rank',proj?`#${proj.rank}`:'Outside current 24',proj?.band||'Current Hub projection')}
    ${metric('Predicted Weight',predWeight,w?.rangeKg?`MODELLED · Range ${w.rangeKg}`:'MODELLED · Pre-release estimate')}
    ${metric('Stamina',stamina,'Derived from loaded public form')}
    ${metric('Form Depth',`${runs.length}/8`,'VERIFIED race starts only')}
    ${metric('Latest Market',market?`$${market.last.odds.toFixed(2)}`:'—',market?`${market.last.bookmaker} · ${market.last.date} · ${marketState?.label||'DATED'}`:'No stored observation')}
    ${metric('Research Ready',ready!==null?`${ready}/6`:'—','Coverage measure, not a rating')}
  </section>
  ${dossierEvidenceHtml(name)}
  <section class="dossier-grid">
    <div class="panel"><div class="panel-head"><div><h3>Cup Intelligence</h3><div class="panel-sub">Current evidence state for this nominee.</div></div></div><div class="dossier-facts">
      <div><span>Trainer</span><strong>${h.trainer}</strong></div><div><span>Current horse base</span><strong>${base.value}</strong></div>
      <div><span>Qualification</span><strong>${qual}</strong></div><div><span>Projection band</span><strong>${proj?.band||'Outside current 24'}</strong></div>
      <div><span>Official weight</span><strong>${h.officialWeightKg?`${h.officialWeightKg}kg`:'Pending 17 Sep'}</strong></div><div><span>Predicted weight</span><strong>${predWeight}</strong></div>
      <div><span>Market observation</span><strong>${dossierMarket(name)}</strong>${market?`<small>${market.last.bookmaker} · observed ${market.last.date} · not automatically live</small>`:''}</div><div><span>Timeform</span><strong>${tf?'Identity matched':'Identity unresolved'}</strong><small>${tf?'Numeric subscriber ratings remain separate/private':'No rating substituted'}</small></div>
    </div>${base.source?`<div class="dossier-source">Base source: ${base.source}</div>`:''}${proj?.reason?`<div class="dossier-callout"><span>Projection rationale</span><strong>${proj.reason}</strong></div>`:''}</div>
    <div class="panel"><div class="panel-head"><div><h3>Preparation & Campaign</h3><div class="panel-sub">Latest verified Cup-relevant activity.</div></div></div><div class="dossier-facts">
      <div><span>Latest lead-up</span><strong>${lead?.race||'Researching'}</strong></div><div><span>Latest result</span><strong>${lead?.result||lead?.status||'Researching'}</strong></div>
      <div><span>Campaign status</span><strong>${intel?.campaignStatus||'Researching'}</strong></div><div><span>Cup relevance</span><strong>${intel?.cupRelevance||'Assessment pending'}</strong></div>
    </div>${lead?`<div class="dossier-callout"><span>Latest campaign event</span><strong>${lead.date||''} · ${lead.race||''}${lead.result?` · ${lead.result}`:''}</strong></div>`:''}${intel?.latestNote?`<div class="dossier-callout"><span>Latest note</span><strong>${intel.latestNote}</strong></div>`:''}</div>
  </section>
  <section class="panel dossier-section"><div class="panel-head"><div><h3>Latest Public Form</h3><div class="panel-sub">Up to eight verified race starts. Subscriber ratings can be joined privately without altering these factual rows.</div></div><span class="tag gold">${runs.length}/8 LOADED</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Track</th><th>Race</th><th>Dist.</th><th>Going</th><th>Weight</th><th>Finish</th><th>Margin</th><th>Rating</th></tr></thead><tbody>${dossierRunRows(name)}</tbody></table></div></section>
  <section class="panel dossier-section"><div class="panel-head"><div><h3>Decision Notes</h3><div class="panel-sub">Evidence gaps remain visible rather than being silently filled.</div></div></div><div class="dossier-facts"><div><span>Base verification</span><strong>${base.detail}</strong></div><div><span>Timeform numeric layer</span><strong>${tf?'Private import pending / separate':'Identity resolution pending'}</strong></div><div><span>Order of Entry</span><strong>${proj?`Projected #${proj.rank}`:'Outside current projected 24'}</strong></div><div><span>Staying evidence</span><strong>${stamina}</strong></div></div></section>`;
};
