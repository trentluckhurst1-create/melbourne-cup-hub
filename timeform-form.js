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

function formCoverage(){
  const total=(cupData?.horses||[]).length;
  const records=formIntelData?.horses||{};
  const withForm=(cupData?.horses||[]).filter(h=>(records[h.horse]?.runs||[]).length>0).length;
  const fullWindow=(cupData?.horses||[]).filter(h=>(records[h.horse]?.runs||[]).length>=8).length;
  const matched=timeformStatusData?.profilesMatched??0;
  const unresolved=timeformStatusData?.profilesUnresolved??Math.max(0,total-matched);
  return {total,withForm,fullWindow,matched,unresolved};
}

function privateTfMatched(horse){return timeformStatusData?!(timeformStatusData.unresolvedHorses||[]).includes(horse):false;}
function tfFormCount(horse){return (formIntelData?.horses?.[horse]?.runs||[]).length;}
function tfStaminaEvidence(horse){
  const runs=formIntelData?.horses?.[horse]?.runs||[];
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

function timeformView(){
  const c=formCoverage();
  const unresolved=(cupData?.horses||[]).filter(h=>!privateTfMatched(h.horse));
  return `<div class="section-header"><div><div class="kicker">Canonical Rating Scale · Values Pending Reload</div><h2>Timeform Intelligence</h2><div class="section-copy">The identity layer is preserved now; the numerical Timeform ratings will be reloaded later. Until then this workspace tracks profile matching, public form depth and staying evidence without pretending missing ratings exist.</div></div></div>
  <section class="metric-grid">${metric('Official Nominees',c.total,'Common comparison universe')}${metric('Profiles Matched',c.matched,`${c.unresolved} unresolved identities`)}${metric('Form Coverage',c.withForm,`${c.fullWindow} with full 8-run windows`)}${metric('Rating Values','PENDING','Will be added later')}${metric('Rating Source','TIMEFORM','No substitute scales')}</section>
  <section class="profile-grid"><div class="panel"><h3>Rating Architecture</h3><div class="rule-list"><div class="rule-row"><span>01</span><p>Timeform remains the single comparative class scale once the private values are restored.</p></div><div class="rule-row"><span>02</span><p>Public race history is maintained independently, so form work can continue while ratings are pending.</p></div><div class="rule-row"><span>03</span><p>Run-level TFR and Timefigure fields stay empty until genuine Timeform values are available.</p></div><div class="rule-row"><span>04</span><p>OR, RPR and other scales are never substituted into a Timeform column.</p></div><div class="rule-row"><span>05</span><p>Cup-specific factors remain separate: 3200m, weight, track, going, pace, preparation, travel and age.</p></div></div></div><div class="panel"><h3>Current Recovery State</h3><p class="analysis-copy">${c.matched} of ${c.total} official nominees have a preserved Timeform identity match. The numerical rating layer is currently pending re-extraction, so no horse is shown with a fake or placeholder rating.</p><div class="audit-banner"><strong>STATUS</strong><span>Identity coverage preserved · ratings pending · form research continues</span></div>${unresolved.length?`<div class="panel-sub" style="margin-top:12px">Unresolved: ${unresolved.map(h=>h.horse).join(' · ')}</div>`:''}</div></section>
  <div class="panel"><div class="panel-head"><div><h3>101-Horse Timeform Readiness Board</h3><div class="panel-sub">Useful now: identity match, public form depth and staying evidence. Numerical ratings can drop into this same board later.</div></div><span class="tag gold">RATINGS PENDING</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>TF Identity</th><th>Form Runs</th><th>Stamina Evidence</th><th>Rating State</th></tr></thead><tbody>${(cupData?.horses||[]).map(h=>{const matched=privateTfMatched(h.horse);const n=tfFormCount(h.horse);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}</td><td>${h.trainer}</td><td>${matched?tag('Matched','green'):'<span class="muted">Unresolved</span>'}</td><td>${n?`${n}/8`:'—'}</td><td>${tfStaminaEvidence(h.horse)}</td><td>${matched?'<span class="muted">Identity ready · rating pending</span>':'<span class="muted">Identity research required</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

function formGuideView(){
  const c=formCoverage();
  return `<div class="section-header"><div><div class="kicker">Every Nominee · Every Run</div><h2>Melbourne Cup Form Guide</h2><div class="section-copy">The public form layer keeps evolving independently of the pending Timeform numbers. Every verified race start improves the Cup analysis now and will become an exact join point for Timeform ratings later.</div></div></div>
  <section class="metric-grid">${metric('Nominees',c.total,'Official 1 Sep snapshot')}${metric('Public Form Loaded',c.withForm,'Horses with race histories')}${metric('Full Windows',c.fullWindow,'8 verified starts loaded')}${metric('TF Identity Matches',c.matched,'Ready for later rating join')}${metric('Missing','VISIBLE','Never silently imputed')}</section>
  <div class="horse-grid">${(cupData?.horses||[]).map(h=>{const r=formIntelData?.horses?.[h.horse]||{};const runs=r.runs||[];const last=runs[0];const matched=privateTfMatched(h.horse);return `<article class="horse-card"><div class="horse-card-top"><div><div class="horse-number">NOM ${h.nominationNumber}</div><button class="horse-card-name" onclick="openHorse('${h.horse.replace(/'/g,"\\'")}')">${h.horse}</button><div class="horse-country">${h.country} · ${h.trainer}</div></div>${matched?tag('TF identity','green'):tag('TF unresolved')}</div><div class="horse-card-grid"><div><span>LAST PUBLIC RUN</span><strong>${last?`${last.finish||'—'} · ${last.track||'—'}`:'Researching'}</strong></div><div><span>FORM RUNS</span><strong>${runs.length}/8</strong></div><div><span>STAMINA</span><strong>${tfStaminaEvidence(h.horse)}</strong></div><div><span>TF RATING</span><strong>Pending</strong></div></div></article>`}).join('')}</div>`;
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
