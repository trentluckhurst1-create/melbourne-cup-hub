let formIntelData=null;
let formIntelPromise=null;
let timeformStatusData=null;

function mergeFormDatasets(primary,supplements=[]){
  const out=primary||{horses:{}};
  out.horses=out.horses||{};
  for(const supplement of supplements.filter(Boolean)){
    for(const [horse,rec] of Object.entries(supplement.horses||{})){
      const existing=out.horses[horse]||{runs:[]};
      const byKey=new Map((existing.runs||[]).map(r=>[`${r.date}|${r.race}|${r.track}`,r]));
      for(const run of (rec.runs||[])) byKey.set(`${run.date}|${run.race}|${run.track}`,run);
      existing.runs=[...byKey.values()].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,out.targetRunsPerHorse||8);
      out.horses[horse]={...existing,...rec,runs:existing.runs};
    }
  }
  return out;
}

function loadFormIntel(){
  if(formIntelPromise) return formIntelPromise;
  formIntelPromise=Promise.all([
    fetch('./data/form/2026-09-13-form-index.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/form/2026-09-13-form-supplement-2.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-3.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-4.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-5.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-6.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-7.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-8.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-9.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-10.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/form/2026-09-13-form-supplement-11.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/timeform/2026-09-13-public-status.json',{cache:'no-store'}).then(r=>r.ok?r.json():null)
  ]).then(([f,supp2,supp3,supp4,supp5,supp6,supp7,supp8,supp9,supp10,supp11,s])=>{formIntelData=mergeFormDatasets(f,[supp2,supp3,supp4,supp5,supp6,supp7,supp8,supp9,supp10,supp11]);timeformStatusData=s;return formIntelData;}).catch(()=>null);
  return formIntelPromise;
}

function publicActualRuns(horse){
  const runs=formIntelData?.horses?.[horse]?.runs||[];
  return runs.filter(r=>!String(r.classGroup||'').toLowerCase().includes('trial')&&!String(r.race||'').toLowerCase().includes('trial')&&!String(r.race||'').toLowerCase().includes('jump-out'));
}
function formCoverage(){
  const total=(cupData?.horses||[]).length;
  const withForm=(cupData?.horses||[]).filter(h=>publicActualRuns(h.horse).length>0).length;
  const audit=typeof formCompletionSummary==='function'?formCompletionSummary():null;
  const fullWindow=audit?audit.complete+audit.career:(cupData?.horses||[]).filter(h=>publicActualRuns(h.horse).length>=8).length;
  const matched=timeformStatusData?.profilesMatched??0;
  const unresolved=timeformStatusData?.profilesUnresolved??Math.max(0,total-matched);
  return {total,withForm,fullWindow,matched,unresolved,gaps:audit?.gaps??Math.max(0,total-fullWindow),flagged:audit?.flagged??0};
}

function privateTfMatched(horse){return timeformStatusData?!(timeformStatusData.unresolvedHorses||[]).includes(horse):false;}
function tfFormCount(horse){return publicActualRuns(horse).length;}
function tfStaminaEvidence(horse){
  const runs=publicActualRuns(horse);
  if(!runs.length)return 'Researching';
  const max=Math.max(...runs.map(r=>Number(r.distanceM)||0));
  const wins=runs.filter(r=>/^1st$/i.test(String(r.finish||'')));
  const maxWin=wins.length?Math.max(...wins.map(r=>Number(r.distanceM)||0)):0;
  if(maxWin>=3200)return '3200m winner';
  if(runs.some(r=>(Number(r.distanceM)||0)>=3200&&/^(2nd|3rd)$/i.test(String(r.finish||''))))return '3200m placed';
  if(max>=3200)return '3200m exposed';
  if(maxWin>=3000)return '3000m+ winner';
  if(max>=3000)return '3000m+ exposed';
  if(maxWin>=2800)return '2800m+ winner';
  if(max>=2800)return '2800m+ exposed';
  if(max>=2400)return '2400m+ evidence';
  return '<2400m loaded';
}
function formStateForCard(horse){
  if(typeof formCompletionState==='function')return formCompletionState(horse);
  const n=tfFormCount(horse);return {state:n>=8?'COMPLETE':'RESEARCH_GAP',runs:Math.min(n,8),label:`${Math.min(n,8)}/8`,className:n>=8?'green':n>=5?'gold':'red'};
}

function timeformView(){
  const c=formCoverage();
  const unresolved=(cupData?.horses||[]).filter(h=>!privateTfMatched(h.horse));
  return `<div class="section-header"><div><div class="kicker">Canonical Rating Scale · Values Pending Reload</div><h2>Timeform Intelligence</h2><div class="section-copy">The identity layer is preserved now; the numerical Timeform ratings will be reloaded later. Until then this workspace tracks profile matching, governed public-form depth and staying evidence without pretending missing ratings exist.</div></div></div>
  <section class="metric-grid">${metric('Official Nominees',c.total,'Common comparison universe')}${metric('Profiles Matched',c.matched,`${c.unresolved} unresolved identities`)}${metric('Form Complete',c.fullWindow,`${c.gaps} gaps · ${c.flagged} integrity flags`)}${metric('Rating Values','PENDING','Will be added later')}${metric('Rating Source','TIMEFORM','No substitute scales')}</section>
  <section class="profile-grid"><div class="panel"><h3>Rating Architecture</h3><div class="rule-list"><div class="rule-row"><span>01</span><p>Timeform remains the single comparative class scale once the private values are restored.</p></div><div class="rule-row"><span>02</span><p>Public race history is maintained independently, so form work can continue while ratings are pending.</p></div><div class="rule-row"><span>03</span><p>Run-level TFR and Timefigure fields stay empty until genuine Timeform values are available.</p></div><div class="rule-row"><span>04</span><p>OR, RPR and other scales are never substituted into a Timeform column.</p></div><div class="rule-row"><span>05</span><p>Cup-specific factors remain separate: 3200m, weight, track, going, pace, preparation, travel and age.</p></div></div></div><div class="panel"><h3>Current Recovery State</h3><p class="analysis-copy">${c.matched} of ${c.total} official nominees have a preserved Timeform identity match. The numerical rating layer is currently pending re-extraction, so no horse is shown with a fake or placeholder rating.</p><div class="audit-banner"><strong>STATUS</strong><span>Identity coverage preserved · ratings pending · governed form research continues</span></div>${unresolved.length?`<div class="panel-sub" style="margin-top:12px">Unresolved: ${unresolved.map(h=>h.horse).join(' · ')}</div>`:''}</div></section>
  <div class="panel"><div class="panel-head"><div><h3>101-Horse Timeform Readiness Board</h3><div class="panel-sub">Useful now: identity match, actual-race form depth and staying evidence. Numerical ratings can drop into this same board later.</div></div><span class="tag gold">RATINGS PENDING</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>TF Identity</th><th>Form State</th><th>Stamina Evidence</th><th>Rating State</th></tr></thead><tbody>${(cupData?.horses||[]).map(h=>{const matched=privateTfMatched(h.horse);const f=formStateForCard(h.horse);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}</td><td>${h.trainer}</td><td>${matched?tag('Matched','green'):'<span class="muted">Unresolved</span>'}</td><td><span class="tag ${f.className}">${f.label}</span></td><td>${tfStaminaEvidence(h.horse)}</td><td>${matched?'<span class="muted">Identity ready · rating pending</span>':'<span class="muted">Identity research required</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

function formGuideView(){
  const c=formCoverage();
  const projected=new Map((projectedFieldData?.projected24||[]).map(x=>[x.horse,x.rank]));
  return `<div class="section-header"><div><div class="kicker">Every Nominee · Actual Starts Only</div><h2>Melbourne Cup Form Guide</h2><div class="section-copy">The public form layer keeps evolving independently of the pending Timeform numbers. Completion is governed: eight actual starts, or an explicitly certified full career for a lightly raced horse. Trials and jump-outs do not inflate coverage.</div></div></div>
  <section class="metric-grid">${metric('Nominees',c.total,'Official 1 Sep snapshot')}${metric('Any Public Form',c.withForm,'Horses with actual race history')}${metric('Form Complete',c.fullWindow,'8/8 or certified full career')}${metric('Research Gaps',c.gaps,'Still incomplete')}${metric('Integrity Flags',c.flagged,'Source/run issues')}</section>
  <div class="horse-grid">${(cupData?.horses||[]).map(h=>{const runs=publicActualRuns(h.horse);const last=runs[0];const matched=privateTfMatched(h.horse);const f=formStateForCard(h.horse);const rank=projected.get(h.horse);return `<article class="horse-card"><div class="horse-card-top"><div><div class="horse-number">NOM ${h.nominationNumber}${rank?` · PROJ #${rank}`:''}</div><button class="horse-card-name" onclick="openHorse('${h.horse.replace(/'/g,"\\'")}')">${h.horse}</button><div class="horse-country">${h.country} · ${h.trainer}</div></div><span class="tag ${f.className}">${f.label}</span></div><div class="horse-card-grid"><div><span>LAST VERIFIED RUN</span><strong>${last?`${last.finish||'—'} · ${last.track||'—'}`:'Researching'}</strong></div><div><span>FORM STATE</span><strong>${f.state.replace(/_/g,' ')}</strong></div><div><span>STAMINA</span><strong>${tfStaminaEvidence(h.horse)}</strong></div><div><span>TIMEFORM</span><strong>${matched?'Identity ready · rating pending':'Identity unresolved'}</strong></div></div></article>`}).join('')}</div>`;
}

const tfFormRenderBase=render;
render=function(view='dashboard'){
  if(view==='timeform'||view==='form'){
    document.getElementById('page-title').textContent=view==='timeform'?'Timeform':'Form Guide';
    const root=document.getElementById('app-content');
    if(!formIntelData||!timeformStatusData){root.innerHTML='<div class="placeholder">Loading form intelligence…</div>';loadFormIntel().then(()=>render(view));return;}
    root.innerHTML=view==='timeform'?timeformView():formGuideView();return;
  }
  tfFormRenderBase(view);
};

loadFormIntel();
