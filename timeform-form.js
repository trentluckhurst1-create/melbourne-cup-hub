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
    fetch('./data/timeform/2026-09-13-public-status.json',{cache:'no-store'}).then(r=>r.ok?r.json():null)
  ]).then(([f,supp2,supp3,supp4,supp5,supp6,supp7,s])=>{formIntelData=mergeFormDatasets(f,[supp2,supp3,supp4,supp5,supp6,supp7]);timeformStatusData=s;return formIntelData;}).catch(()=>null);
  return formIntelPromise;
}

function formCoverage(){
  const total=(cupData?.horses||[]).length;
  const records=formIntelData?.horses||{};
  const withForm=Object.values(records).filter(x=>(x.runs||[]).length>0).length;
  const withTF=Object.values(records).filter(x=>Number.isFinite(x.currentMasterRating)).length;
  const matched=timeformStatusData?.profilesMatched??0;
  const unresolved=timeformStatusData?.profilesUnresolved??Math.max(0,total-matched);
  return {total,withForm,withTF,matched,unresolved};
}

function privateTfMatched(horse){return timeformStatusData?!(timeformStatusData.unresolvedHorses||[]).includes(horse):false;}

function timeformView(){
  const c=formCoverage();
  return `<div class="section-header"><div><div class="kicker">Canonical Rating Scale</div><h2>Timeform Intelligence</h2><div class="section-copy">Timeform is the Hub's single comparative class source. Subscriber-only values stay in the private analytical layer; the public Hub shows coverage, matching state and methodology without republishing protected ratings.</div></div></div>
  <section class="metric-grid">${metric('Official Nominees',c.total,'Common comparison universe')}${metric('Profiles Matched',c.matched,`${c.unresolved} unresolved`)}${metric('Public Ratings',c.withTF,'Protected values remain private')}${metric('Rating Source','TIMEFORM','No mixed rating scales')}${metric('Run Window','Up to 8','Private structured history')}</section>
  <section class="profile-grid"><div class="panel"><h3>Rating Architecture</h3><div class="rule-list"><div class="rule-row"><span>01</span><p>Current Timeform Master Rating is the common class benchmark.</p></div><div class="rule-row"><span>02</span><p>Store individual performance ratings for up to the latest eight runs in the private layer.</p></div><div class="rule-row"><span>03</span><p>Calculate last-3, last-5, 12-month peak and trajectory from the same rating scale.</p></div><div class="rule-row"><span>04</span><p>Do not mix OR, RPR, local ratings or our own numbers into the Timeform column.</p></div><div class="rule-row"><span>05</span><p>Overlay Cup-specific factors separately: 3200m, weight, track, going, pace, preparation, travel and age.</p></div></div></div><div class="panel"><h3>Private Extraction Audit</h3><p class="analysis-copy">The authenticated extraction matched ${c.matched} of ${c.total} official nominees. ${c.unresolved} remain unresolved and will not be forced to an incorrect Timeform identity. No subscriber rating value is exposed by this public page.</p><div class="audit-banner"><strong>CONTROL</strong><span>Private dataset git-ignored · public site exposes coverage only</span></div></div></section>
  <div class="panel"><div class="panel-head"><div><h3>101-Horse Timeform Coverage Board</h3><div class="panel-sub">Identity coverage across the official nomination universe. Rating values remain private.</div></div><span class="tag gold">CONTROLLED</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>Private Match</th><th>Public Rating</th><th>State</th></tr></thead><tbody>${(cupData?.horses||[]).map(h=>{const matched=privateTfMatched(h.horse);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}</td><td>${h.trainer}</td><td>${matched?tag('Matched','green'):'<span class="muted">Unresolved</span>'}</td><td>—</td><td>${matched?'<span class="muted">Private analytical data available</span>':'<span class="muted">Identity research required</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

function formGuideView(){
  const c=formCoverage();
  return `<div class="section-header"><div><div class="kicker">Every Nominee · Every Run</div><h2>Melbourne Cup Form Guide</h2><div class="section-copy">The public form layer is separate from protected Timeform data. It will hold factual race histories for all 101 nominees while the private Timeform layer supplies the consistent rating evidence used by our model.</div></div></div>
  <section class="metric-grid">${metric('Nominees',c.total,'Official 1 Sep snapshot')}${metric('Public Form Loaded',c.withForm,'Horses with public run histories')}${metric('Private TF Matches',c.matched,'Identity-confirmed profiles')}${metric('Target Runs','8','Latest starts per horse')}${metric('Missing','Visible','Never silently imputed')}</section>
  <div class="horse-grid">${(cupData?.horses||[]).map(h=>{const r=formIntelData?.horses?.[h.horse]||{};const runs=r.runs||[];const last=runs[0];const matched=privateTfMatched(h.horse);return `<article class="horse-card"><div class="horse-card-top"><div><div class="horse-number">NOM ${h.nominationNumber}</div><button class="horse-card-name" onclick="openHorse('${h.horse.replace(/'/g,"\\'")}')">${h.horse}</button><div class="horse-country">${h.country} · ${h.trainer}</div></div>${matched?tag('TF matched','green'):tag('TF unresolved')}</div><div class="horse-card-grid"><div><span>LAST PUBLIC RUN</span><strong>${last?`${last.finish||'—'} · ${last.track||'—'}`:'Researching'}</strong></div><div><span>FORM RUNS</span><strong>${runs.length}/8</strong></div><div><span>TF PROFILE</span><strong>${matched?'Private match':'Unresolved'}</strong></div><div><span>PUBLIC TF VALUE</span><strong>Restricted</strong></div></div></article>`}).join('')}</div>`;
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
