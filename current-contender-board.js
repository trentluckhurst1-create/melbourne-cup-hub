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
    return {horse:h.horse,trainer:h.trainer,p,m,w,s,prep,ready,gap:p&&m?m.marketRank-p.rank:null};
  }).filter(x=>x.p||x.m).sort((a,b)=>(a.p?.rank??99)-(b.p?.rank??99)||(a.m?.marketRank??999)-(b.m?.marketRank??999));
}
function contenderGapHtml(x){
  if(x.gap===null)return '<span class="muted">—</span>';
  if(x.gap>=5)return `<span class="market-edge-positive">Hub +${x.gap}</span>`;
  if(x.gap<=-5)return `<span class="market-edge-negative">Market ${Math.abs(x.gap)} higher</span>`;
  return `<span class="market-edge-flat">Aligned ${x.gap>0?'+':''}${x.gap}</span>`;
}
function currentContenderBoard(){
  const rows=contenderPositionRows();
  const projected=rows.filter(x=>x.p).length;
  const priced=rows.filter(x=>x.m).length;
  const disagreements=rows.filter(x=>x.gap!==null&&Math.abs(x.gap)>=5).length;
  return `<section class="panel current-market-panel"><div class="panel-head"><div><div class="kicker">Current Positioning · No Synthetic Rating</div><h3>Contender Intelligence Board</h3><div class="panel-sub">A joined decision surface using only populated evidence. It deliberately does not create a pseudo-Timeform or synthetic Cup score.</div></div><span class="tag green">EVIDENCE ONLY</span></div>
  <section class="metric-grid current-market-metrics">${metric('Projected',projected,'Hub top-24 model')}${metric('Current Priced',priced,'Public bookmaker coverage')}${metric('5+ Rank Gaps',disagreements,'Model/market research flags')}${metric('Timeform Score','PENDING','No substitution')}${metric('Use','RESEARCH','Not a betting recommendation')}</section>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Hub Proj.</th><th>Market</th><th>Best Price</th><th>Gap</th><th>Pred. Wt</th><th>Stamina</th><th>Latest Prep</th><th>Ready</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="horse">${horseLink(x.horse)}</td><td>${x.p?`#${x.p.rank}`:'—'}</td><td>${x.m?`#${x.m.marketRank}`:'—'}</td><td>${x.m?`$${x.m.best.odds.toFixed(2)} · ${x.m.best.bookmaker}`:'—'}</td><td>${contenderGapHtml(x)}</td><td>${x.w?`${Number(x.w.predictedKg).toFixed(1)}kg`:'—'}</td><td>${x.s}</td><td class="wrap-cell">${x.prep}</td><td>${x.ready!==null?`${x.ready}/6`:'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
}

const currentContenderRatingsBase=ratingsView;
ratingsView=function(){return currentContenderBoard()+currentContenderRatingsBase();};
