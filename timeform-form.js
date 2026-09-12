let formIntelData=null;
let formIntelPromise=null;

function loadFormIntel(){
  if(formIntelPromise) return formIntelPromise;
  formIntelPromise=fetch('./data/form/2026-09-13-form-index.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null).then(d=>{formIntelData=d;return d;}).catch(()=>null);
  return formIntelPromise;
}

function formCoverage(){
  const total=(cupData?.horses||[]).length;
  const records=formIntelData?.horses||{};
  const withForm=Object.values(records).filter(x=>(x.runs||[]).length>0).length;
  const withTF=Object.values(records).filter(x=>Number.isFinite(x.currentMasterRating)).length;
  return {total,withForm,withTF};
}

function timeformView(){
  const c=formCoverage();
  return `<div class="section-header"><div><div class="kicker">Canonical Rating Scale</div><h2>Timeform Intelligence</h2><div class="section-copy">One rating language across Australia, New Zealand, Britain, Ireland, France, Japan and the United States. Timeform is the Hub's comparative class benchmark; Cup suitability remains a separate analytical layer.</div></div></div>
  <section class="metric-grid">${metric('Official Nominees',c.total,'Common comparison universe')}${metric('Timeform Loaded',c.withTF,`${c.total-c.withTF} awaiting authorised import`)}${metric('Rating Source','TIMEFORM','No mixed rating scales')}${metric('Run Window','Up to 8','Per horse')}${metric('Public Display','Restricted','Until publication rights confirmed')}</section>
  <section class="profile-grid"><div class="panel"><h3>Rating Architecture</h3><div class="rule-list"><div class="rule-row"><span>01</span><p>Current Timeform Master Rating is the common class benchmark.</p></div><div class="rule-row"><span>02</span><p>Store individual performance ratings for up to the latest eight runs where legitimately supplied.</p></div><div class="rule-row"><span>03</span><p>Calculate last-3, last-5, 12-month peak and trajectory from one consistent scale.</p></div><div class="rule-row"><span>04</span><p>Do not mix OR, RPR, local ratings or our own numbers into the Timeform column.</p></div><div class="rule-row"><span>05</span><p>Overlay Cup-specific factors separately: 3200m, weight, track, going, pace, preparation, travel and age.</p></div></div></div><div class="panel"><h3>Data Discipline</h3><p class="analysis-copy">Subscriber-only Timeform information will not be scraped or exposed publicly. The data structure is ready for authorised user-supplied imports. Until then, missing ratings remain explicitly Awaiting Timeform rather than being estimated from another source.</p><div class="audit-banner"><strong>CANONICAL SOURCE</strong><span>Timeform only for comparative ratings</span></div></div></section>
  <div class="panel"><div class="panel-head"><div><h3>101-Horse Timeform Board</h3><div class="panel-sub">Complete nomination universe; values populate only from authorised Timeform data.</div></div><span class="tag gold">CONTROLLED</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>TF Master</th><th>12m Peak</th><th>Last 3</th><th>Last 5</th><th>Trend</th><th>State</th></tr></thead><tbody>${(cupData?.horses||[]).map(h=>{const r=formIntelData?.horses?.[h.horse]||{};return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}</td><td>${h.trainer}</td><td>${r.currentMasterRating??'—'}</td><td>${r.peakRating12m??'—'}</td><td>${r.last3Average??'—'}</td><td>${r.last5Average??'—'}</td><td>${r.trend||'—'}</td><td>${Number.isFinite(r.currentMasterRating)?tag('Loaded','green'):'<span class="muted">Awaiting Timeform</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

function formGuideView(){
  const c=formCoverage();
  return `<div class="section-header"><div><div class="kicker">Every Nominee · Every Run</div><h2>Melbourne Cup Form Guide</h2><div class="section-copy">The form layer is built for all 101 official nominations. Each horse can hold its latest eight starts, race conditions, result and Timeform performance rating, creating a consistent international form history.</div></div></div>
  <section class="metric-grid">${metric('Nominees',c.total,'Official 1 Sep snapshot')}${metric('Form Loaded',c.withForm,'Horses with run histories')}${metric('Target Runs','8','Latest starts per horse')}${metric('Rating Scale','Timeform','When supplied')}${metric('Missing','Visible','Never silently imputed')}</section>
  <div class="horse-grid">${(cupData?.horses||[]).map(h=>{const r=formIntelData?.horses?.[h.horse]||{};const runs=r.runs||[];const last=runs[0];return `<article class="horse-card"><div class="horse-card-top"><div><div class="horse-number">NOM ${h.nominationNumber}</div><button class="horse-card-name" onclick="openHorse('${h.horse.replace(/'/g,"\\'")}')">${h.horse}</button><div class="horse-country">${h.country} · ${h.trainer}</div></div>${Number.isFinite(r.currentMasterRating)?tag(`TF ${r.currentMasterRating}`,'green'):tag('TF pending')}</div><div class="horse-card-grid"><div><span>LAST RUN</span><strong>${last?`${last.finish||'—'} · ${last.track||'—'}`:'Researching'}</strong></div><div><span>FORM RUNS</span><strong>${runs.length}/8</strong></div><div><span>12M PEAK</span><strong>${r.peakRating12m??'—'}</strong></div><div><span>TREND</span><strong>${r.trend||'—'}</strong></div></div></article>`}).join('')}</div>`;
}

const tfFormRenderBase=render;
render=function(view='dashboard'){
  if(view==='timeform'||view==='form'){
    document.getElementById('page-title').textContent=view==='timeform'?'Timeform':'Form Guide';
    const root=document.getElementById('app-content');
    if(!formIntelData){root.innerHTML='<div class="placeholder">Loading form intelligence…</div>';loadFormIntel().then(()=>render(view));return;}
    root.innerHTML=view==='timeform'?timeformView():formGuideView();return;
  }
  tfFormRenderBase(view);
};

loadFormIntel();
