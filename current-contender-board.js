function contenderPositionRows(){
  const market=typeof marketRankRows==='function'?marketRankRows():[];
  const byMarket=new Map(market.map(x=>[x.horse,x]));
  return (cupData?.horses||[]).map(h=>{
    const p=typeof projectedRec==='function'?projectedRec(h.horse):null;
    const m=byMarket.get(h.horse)||null;
    const w=typeof weightRec==='function'?weightRec(h.horse):null;
    const s=typeof staminaBand==='function'?staminaBand(h.horse):'Researching';
    const prep=typeof currentCampaign==='function'?currentCampaign(h.horse):'Researching';
    const ready=typeof readinessScore==='function'?readinessScore(h.horse):null;
    const pfr=typeof publicFormRating==='function'?publicFormRating(h.horse):null;
    const lens=typeof cupPublicLens==='function'?cupPublicLens(h.horse):null;
    return {horse:h.horse,trainer:h.trainer,p,m,w,s,prep,ready,pfr,lens,gap:p&&m?m.marketRank-p.rank:null};
  }).filter(x=>x.p||x.m||x.pfr).sort((a,b)=>(a.p?.rank??99)-(b.p?.rank??99)||(a.m?.marketRank??999)-(b.m?.marketRank??999)||(b.pfr?.current??-999)-(a.pfr?.current??-999));
}
function contenderGapHtml(x){
  if(x.gap===null)return '<span class="muted">—</span>';
  if(x.gap>=5)return `<span class="market-edge-positive">Hub +${x.gap}</span>`;
  if(x.gap<=-5)return `<span class="market-edge-negative">Market ${Math.abs(x.gap)} higher</span>`;
  return `<span class="market-edge-flat">Aligned ${x.gap>0?'+':''}${x.gap}</span>`;
}
function contenderTrajectory(x){
  if(!x.pfr)return '—';
  if(x.pfr.trajectory===null)return 'Limited';
  const sign=x.pfr.trajectory>0?'+':'';
  return `${x.pfr.trajectoryLabel} ${sign}${x.pfr.trajectory.toFixed(1)}`;
}
function currentContenderBoard(){
  const rows=contenderPositionRows();
  const projected=rows.filter(x=>x.p).length;
  const priced=rows.filter(x=>x.m).length;
  const rated=rows.filter(x=>x.pfr).length;
  const disagreements=rows.filter(x=>x.gap!==null&&Math.abs(x.gap)>=5).length;
  const topLens=[...rows].filter(x=>x.lens).sort((a,b)=>b.lens.score-a.lens.score)[0]||null;
  return `<section class="panel current-market-panel"><div class="panel-head"><div><div class="kicker">Race Shape Through Evidence</div><h3>Contender Intelligence Board</h3><div class="panel-sub">One line per contender: projected position, public form rating, staying-rated peak, trajectory, handicap and market. PFR is a Hub public-form scale and is not Timeform.</div></div><span class="tag green">FORM + MARKET + WEIGHT</span></div>
  <section class="metric-grid current-market-metrics">${metric('Projected',projected,'Hub top-24 model')}${metric('Public Rated',rated,'PFR-1.0 coverage')}${metric('Current Priced',priced,'Public bookmaker coverage')}${metric('5+ Rank Gaps',disagreements,'Model/market research flags')}${metric('Cup Lens Leader',topLens?topLens.horse:'—',topLens?topLens.lens.score.toFixed(1):'No score')}</section>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Hub Proj.</th><th>PFR</th><th>Peak</th><th>2800m+</th><th>Trajectory</th><th>Market</th><th>Best Price</th><th>Gap</th><th>Wt</th><th>Stamina</th><th>Cup Lens</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="horse">${horseLink(x.horse)}</td><td>${x.p?`#${x.p.rank}`:'—'}</td><td><strong>${x.pfr?x.pfr.current.toFixed(1):'—'}</strong></td><td>${x.pfr?x.pfr.peak.toFixed(1):'—'}</td><td>${x.pfr?.longStayPeak!==null&&x.pfr?.longStayPeak!==undefined?x.pfr.longStayPeak.toFixed(1):'—'}</td><td>${contenderTrajectory(x)}</td><td>${x.m?`#${x.m.marketRank}`:'—'}</td><td>${x.m?`$${x.m.best.odds.toFixed(2)} · ${x.m.best.bookmaker}`:'—'}</td><td>${contenderGapHtml(x)}</td><td>${x.w?`${Number(x.w.predictedKg).toFixed(1)}kg`:'—'}</td><td>${x.s}</td><td><strong>${x.lens?x.lens.score.toFixed(1):'—'}</strong></td></tr>`).join('')}</tbody></table></div></section>`;
}

const currentContenderRatingsBase=ratingsView;
ratingsView=function(){return currentContenderBoard()+currentContenderRatingsBase();};
