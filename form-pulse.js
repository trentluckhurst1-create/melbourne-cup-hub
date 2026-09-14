// Projected-field form pulse. Uses public PFR + factual form only; never substitutes Timeform.
let formPulseFilter='all';

function formPulseRows(){
  const projected=projectedFieldData?.projected24||[];
  return projected.map(p=>{
    const r=typeof publicFormRating==='function'?publicFormRating(p.horse):null;
    const runs=typeof publicRatedRuns==='function'?publicRatedRuns(p.horse):[];
    const lens=typeof cupPublicLens==='function'?cupPublicLens(p.horse):null;
    const ras=typeof publicRasPeak==='function'?publicRasPeak(p.horse):null;
    const market=typeof marketUniverse==='function'?marketUniverse().find(x=>x.horse===p.horse)||null:null;
    const form=typeof formCompletionState==='function'?formCompletionState(p.horse):{state:r?.runs>=8?'COMPLETE':'RESEARCH_GAP',runs:r?.runs||0};
    const weight=typeof weightRec==='function'?weightRec(p.horse):null;
    const official=typeof orderOfficialWeight==='function'?orderOfficialWeight(p.horse):null;
    const kg=Number.isFinite(official)?official:(weight?Number(weight.predictedKg):null);
    const latest=runs[0]||null;
    const recent=runs.slice(0,3);
    return {p,r,runs,lens,ras,market,form,kg,latest,recent};
  });
}
function formPulseProfile(x){
  if(!x.r)return {label:'UNRATED',cls:'red'};
  if(x.r.trajectory!==null&&x.r.trajectory>=4&&x.r.longStayPeak!==null)return {label:'SURGING STAYER',cls:'green'};
  if(x.r.trajectory!==null&&x.r.trajectory>=4)return {label:'IMPROVING',cls:'green'};
  if(x.r.longStayPeak!==null&&x.r.current>=98)return {label:'CLASS + STAMINA',cls:'green'};
  if(x.r.longStayPeak!==null)return {label:'STAYER',cls:'gold'};
  if(x.r.current>=98)return {label:'CLASS / STAMINA ?',cls:'gold'};
  if(x.r.trajectory!==null&&x.r.trajectory<=-4)return {label:'REGRESSING',cls:'red'};
  return {label:'BUILDING',cls:'gold'};
}
function formPulseFreshness(x){
  const d=x.latest?.date;if(!d)return {label:'NO RUN',cls:'red',days:null};
  const ms=new Date('2026-09-14T23:59:59+10:00').getTime()-new Date(`${d}T00:00:00+10:00`).getTime();
  const days=Math.max(0,Math.floor(ms/86400000));
  if(days<=21)return {label:`${days}D`,cls:'green',days};
  if(days<=60)return {label:`${days}D`,cls:'gold',days};
  return {label:`${days}D`,cls:'red',days};
}
function formPulseLatestThree(x){
  if(!x.recent.length)return '<span class="muted">No rated runs</span>';
  return `<div class="fp-three">${x.recent.map((r,i)=>`<span title="${r.date||''} · ${r.race||''} · ${r.finish||'—'}"><b>${r.publicRating.toFixed(1)}</b><em>${i===0?'L1':i===1?'L2':'L3'}</em></span>`).join('')}</div>`;
}
function formPulseTrajectory(x){
  if(!x.r||x.r.trajectory===null)return '<span class="muted">Limited</span>';
  const cls=x.r.trajectory>=4?'green':x.r.trajectory<=-4?'red':'gold';
  const sign=x.r.trajectory>0?'+':'';
  return `<span class="tag ${cls}">${x.r.trajectoryLabel} ${sign}${x.r.trajectory.toFixed(1)}</span>`;
}
function formPulseMarket(x){
  if(!x.market)return '—';
  return `$${x.market.last.odds.toFixed(2)}<small>${x.market.last.bookmaker}</small>`;
}
function formPulseFiltered(){
  return formPulseRows().filter(x=>{
    if(formPulseFilter==='improving')return x.r?.trajectory!==null&&x.r.trajectory>=4;
    if(formPulseFilter==='stayers')return x.r?.longStayPeak!==null;
    if(formPulseFilter==='fresh')return formPulseFreshness(x).days!==null&&formPulseFreshness(x).days<=21;
    if(formPulseFilter==='gaps')return !['COMPLETE','CAREER_COMPLETE'].includes(x.form.state);
    return true;
  }).sort((a,b)=>(a.p.rank-b.p.rank));
}
function formPulseControls(){
  const opts=[['all','Projected 24'],['improving','Improving'],['stayers','2800m+'],['fresh','Ran ≤21d'],['gaps','Form gaps']];
  return `<div class="fp-controls">${opts.map(([k,l])=>`<button class="${formPulseFilter===k?'active':''}" onclick="setFormPulseFilter('${k}')">${l}</button>`).join('')}</div>`;
}
function setFormPulseFilter(v){formPulseFilter=v;if(currentView==='dashboard')render('dashboard');else if(currentView==='ratings')render('ratings');}
window.setFormPulseFilter=setFormPulseFilter;

function formPulseLeaders(all){
  const current=[...all].filter(x=>x.r).sort((a,b)=>b.r.current-a.r.current)[0]||null;
  const staying=[...all].filter(x=>x.r?.longStayPeak!==null&&x.r?.longStayPeak!==undefined).sort((a,b)=>b.r.longStayPeak-a.r.longStayPeak)[0]||null;
  const improver=[...all].filter(x=>x.r?.trajectory!==null&&x.r?.trajectory!==undefined).sort((a,b)=>b.r.trajectory-a.r.trajectory)[0]||null;
  const fresh=[...all].filter(x=>formPulseFreshness(x).days!==null).sort((a,b)=>formPulseFreshness(a).days-formPulseFreshness(b).days)[0]||null;
  const lens=[...all].filter(x=>x.lens).sort((a,b)=>b.lens.score-a.lens.score)[0]||null;
  return {current,staying,improver,fresh,lens};
}
function formPulseLeaderStrip(all){
  const l=formPulseLeaders(all);
  const card=(label,x,value,detail)=>`<button onclick="${x?`openHorse('${x.p.horse.replace(/'/g,"\\'")}')`:'void 0'}"><span>${label}</span><strong>${x?x.p.horse:'—'}</strong><b>${x?value:'—'}</b><em>${x?detail:'No evidence'}</em></button>`;
  return `<div class="fp-leaders">
    ${card('CURRENT PFR',l.current,l.current?.r.current.toFixed(1),'Best recent three-run rating')}
    ${card('2800M+ PEAK',l.staying,l.staying?.r.longStayPeak.toFixed(1),'Best loaded long-staying performance')}
    ${card('FASTEST IMPROVER',l.improver,l.improver?.r.trajectory!==null?`${l.improver.r.trajectory>0?'+':''}${l.improver.r.trajectory.toFixed(1)}`:'—','Current vs older loaded form')}
    ${card('FRESHEST CAMPAIGN',l.fresh,l.fresh?formPulseFreshness(l.fresh).label:'—',l.fresh?.latest?`${l.fresh.latest.finish||'—'} · ${l.fresh.latest.race||'—'}`:'No run')}
    ${card('CUP LENS',l.lens,l.lens?.lens.score.toFixed(1),'PFR + stamina + depth + trend + handicap')}
  </div>`;
}
function formPulsePanel(){
  const all=formPulseRows();
  const rows=formPulseFiltered();
  const rated=all.filter(x=>x.r).length;
  const complete=all.filter(x=>['COMPLETE','CAREER_COMPLETE'].includes(x.form.state)).length;
  const improving=all.filter(x=>x.r?.trajectory!==null&&x.r.trajectory>=4).length;
  const stayers=all.filter(x=>x.r?.longStayPeak!==null).length;
  const fresh=all.filter(x=>{const f=formPulseFreshness(x);return f.days!==null&&f.days<=21;}).length;
  const best=[...all].filter(x=>x.lens).sort((a,b)=>b.lens.score-a.lens.score)[0]||null;
  return `<section class="panel cc-panel fp-panel"><div class="cc-panel-head"><div><span class="cc-label">FORM + CLASS + STAMINA</span><h3>Projected 24 · Form Pulse</h3><div class="panel-sub">Recent public performance ratings, trajectory, staying peak and market context. PFR is a Hub public-form scale; RAS and Timeform remain separate external/private benchmarks.</div></div><button class="mini-button" onclick="openView('ratings')">Full ratings →</button></div>
    <section class="fp-metrics"><div><span>RATED</span><strong>${rated}/24</strong></div><div><span>FORM COMPLETE</span><strong>${complete}/24</strong></div><div><span>IMPROVING</span><strong>${improving}</strong></div><div><span>2800M+ RATED</span><strong>${stayers}</strong></div><div><span>RAN ≤21D</span><strong>${fresh}</strong></div><div><span>CUP LENS</span><strong>${best?best.p.horse:'—'}</strong><em>${best?best.lens.score.toFixed(1):'—'}</em></div></section>
    ${formPulseLeaderStrip(all)}
    ${formPulseControls()}
    <div class="table-wrap"><table class="data-table fp-table"><thead><tr><th>#</th><th>Horse</th><th>Profile</th><th>Latest 3 PFR</th><th>Current</th><th>Peak</th><th>RAS</th><th>2800m+</th><th>Trajectory</th><th>Last Run</th><th>Fresh</th><th>Wt</th><th>Market</th><th>Cup Lens</th></tr></thead><tbody>${rows.length?rows.map(x=>{const profile=formPulseProfile(x),freshness=formPulseFreshness(x);return `<tr><td>#${x.p.rank}</td><td class="horse">${horseLink(x.p.horse)}</td><td><span class="tag ${profile.cls}">${profile.label}</span></td><td>${formPulseLatestThree(x)}</td><td><strong>${x.r?x.r.current.toFixed(1):'—'}</strong></td><td>${x.r?x.r.peak.toFixed(1):'—'}</td><td>${x.ras??'—'}</td><td>${x.r?.longStayPeak!==null&&x.r?.longStayPeak!==undefined?x.r.longStayPeak.toFixed(1):'—'}</td><td>${formPulseTrajectory(x)}</td><td class="wrap-cell">${x.latest?`${x.latest.finish||'—'} · ${x.latest.race||'—'}`:'—'}</td><td><span class="tag ${freshness.cls}">${freshness.label}</span></td><td>${Number.isFinite(x.kg)?`${x.kg.toFixed(1)}kg`:'—'}</td><td class="fp-market">${formPulseMarket(x)}</td><td><strong>${x.lens?x.lens.score.toFixed(1):'—'}</strong></td></tr>`;}).join(''):'<tr><td colspan="14" class="order-empty">No projected runners match this filter.</td></tr>'}</tbody></table></div>
  </section>`;
}

const formPulseDashboardBase=dashboard;
dashboard=function(){return formPulseDashboardBase()+formPulsePanel();};

const formPulseRatingsBase=ratingsView;
ratingsView=function(){return formPulsePanel()+formPulseRatingsBase();};
