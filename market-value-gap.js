function marketRankRows(){
  return (typeof bestPriceRows==='function'?bestPriceRows():[]).map((x,i)=>({...x,marketRank:i+1}));
}
function marketRankRec(name){return marketRankRows().find(x=>x.horse===name)||null;}
function projectionMarketGap(name){
  const m=marketRankRec(name);const p=typeof projectedRec==='function'?projectedRec(name):null;
  if(!m||!p)return null;
  return {marketRank:m.marketRank,projectedRank:p.rank,gap:m.marketRank-p.rank,best:m.best};
}
function gapLabel(g){
  if(!g)return '<span class="market-edge-flat">—</span>';
  if(g.gap>=5)return `<span class="market-edge-positive">Hub +${g.gap}</span>`;
  if(g.gap<=-5)return `<span class="market-edge-negative">Market ${Math.abs(g.gap)} higher</span>`;
  return `<span class="market-edge-flat">Aligned ${g.gap>0?'+':''}${g.gap}</span>`;
}
function marketGapBoard(){
  const rows=marketRankRows().map(x=>({x,g:projectionMarketGap(x.horse)})).filter(z=>z.g).sort((a,b)=>Math.abs(b.g.gap)-Math.abs(a.g.gap));
  const hubHigher=rows.filter(z=>z.g.gap>=5).length;
  const marketHigher=rows.filter(z=>z.g.gap<=-5).length;
  return `<section class="panel current-market-panel"><div class="panel-head"><div><div class="kicker">Model / Market Positioning</div><h3>Projection vs Market Rank</h3><div class="panel-sub">Compares our projected field position with current best-price market rank. This flags disagreement for research; it is not a calculated betting edge or fair-price model.</div></div><span class="tag gold">ATTENTION SIGNAL</span></div>
  <section class="metric-grid current-market-metrics">${metric('Comparable',rows.length,'Projected horses with current price')}${metric('Hub 5+ Higher',hubHigher,'Projection materially stronger')}${metric('Market 5+ Higher',marketHigher,'Market materially stronger')}${metric('Gap Threshold','5 ranks','Research trigger')}${metric('Betting Edge','NO','No fair-price claim')}</section>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Hub Proj.</th><th>Market Rank</th><th>Best Price</th><th>Signal</th><th>Stamina</th><th>Latest Prep</th></tr></thead><tbody>${rows.map(({x,g})=>`<tr><td class="horse">${horseLink(x.horse)}</td><td>#${g.projectedRank}</td><td>#${g.marketRank}</td><td><strong>$${g.best.odds.toFixed(2)}</strong><div class="muted">${g.best.bookmaker}</div></td><td>${gapLabel(g)}</td><td>${typeof staminaBand==='function'?staminaBand(x.horse):'—'}</td><td class="wrap-cell">${typeof currentCampaign==='function'?currentCampaign(x.horse):'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
}

const marketGapViewBase=marketsWorkbenchView;
marketsWorkbenchView=function(){return marketGapViewBase()+marketGapBoard();};

const marketGapHorseBase=horseDetailView;
horseDetailView=function(name){
  const base=marketGapHorseBase(name);const m=marketRankRec(name);const g=projectionMarketGap(name);
  if(!m)return base;
  const quotes=m.best.quotes.map(q=>`${q.bookmaker} $${q.odds.toFixed(2)}${q.placeOdds?` / place $${q.placeOdds.toFixed(2)}`:''}`).join(' · ');
  return base+`<section class="panel dossier-section"><div class="panel-head"><div><h3>Current Market Position</h3><div class="panel-sub">Current public-web bookmaker snapshots.</div></div><span class="tag gold">MARKET #${m.marketRank}</span></div><div class="dossier-facts"><div><span>Best stored win price</span><strong>$${m.best.odds.toFixed(2)} · ${m.best.bookmaker}</strong></div><div><span>Implied probability</span><strong>${m.best.implied.toFixed(1)}%</strong></div><div><span>Market rank</span><strong>#${m.marketRank}</strong></div><div><span>Projection vs market</span><strong>${g?`Hub #${g.projectedRank} · market #${g.marketRank}`:'Not in projected 24'}</strong></div></div><div class="dossier-callout"><span>Available stored quotes</span><strong>${quotes}</strong></div>${g?`<div class="dossier-callout"><span>Research signal</span><strong>${g.gap>=5?'Hub projection materially stronger than market position':g.gap<=-5?'Market materially stronger than Hub projection':'Projection and market broadly aligned'}</strong></div>`:''}</section>`;
};
