function dashboardMarketPulse(){
  const snaps=marketSnapshots||[];
  const latest=snaps[snaps.length-1]||null;
  const marketRows=typeof marketUniverse==='function'?marketUniverse():[];
  const currentRows=typeof bestPriceRows==='function'?bestPriceRows():[];
  const feed=typeof newsItems==='function'?newsItems().slice(0,6):[];
  const projected=new Set((projectedFieldData?.projected24||[]).map(x=>x.horse));
  const projectedPriced=currentRows.filter(x=>projected.has(x.horse)).length;
  const favourite=currentRows[0]||null;
  const twoBook=currentRows.filter(x=>x.best?.quotes?.length>1).length;
  const liveOn=typeof ladbrokesIsLive==='function'&&ladbrokesIsLive();
  const liveCount=liveOn?(ladbrokesLiveData?.runners||[]).filter(x=>Number.isFinite(Number(x.odds))).length:0;
  const freshness=typeof ladbrokesFreshness==='function'?ladbrokesFreshness():{state:'offline',label:'Not connected'};
  const fetched=ladbrokesLiveData?.fetchedAt?new Date(ladbrokesLiveData.fetchedAt).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}):'—';
  return `<section class="cc-grid-main section-block">
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">MARKET CONTROL</span><h3>Current Public Price Pulse</h3></div><button class="mini-button" onclick="openView('markets')">Markets</button></div>
      <div class="metric-grid">${metric('Current Sources',`${bet365Snapshot?1:0+betGoldSnapshot?1:0}`,'Bet365 + BetGold snapshots')}${metric('Priced Nominees',currentRows.length,'Current public-web coverage')}${metric('Two-Book Quotes',twoBook,'Direct comparison available')}${metric('Projected 24',projectedPriced,'Current-priced contenders')}${metric('Market Leader',favourite?`$${favourite.best.odds.toFixed(2)}`:'—',favourite?`${favourite.horse} · ${favourite.best.bookmaker}`:'No current price')}</div>
      <div class="market-warning market-live-ok">Current public bookmaker snapshots are active in the Hub. These are dated observations, not guaranteed executable live prices; verify with the bookmaker before betting.</div>
      <div class="cc-mini-table">${currentRows.slice(0,7).map((x,i)=>`<div><span>${i+1}</span><strong>${horseLink(x.horse)}</strong><b>$${x.best.odds.toFixed(2)}</b><em>${x.best.bookmaker}${x.projected?` · #${x.projected.rank}`:''}</em></div>`).join('')}</div>
    </div>
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">API STATUS</span><h3>Ladbrokes Adapter</h3></div><button class="mini-button" onclick="openView('markets')">Price sources</button></div>
      <div class="metric-grid">${metric('Ladbrokes',liveOn?'LIVE':'OFF',ladbrokesLiveData?.status||'Approval gate')}${metric('API Nominees',liveCount,'Fixed-win prices')}${metric('Last API',fetched,freshness.label)}${metric('Stored Snapshots',snaps.length,'Historical + current')}${metric('Latest Stored',latest?.snapshotDate||'—',latest?.bookmaker||'No snapshot')}</div>
      <div class="market-warning">${liveOn?'Ladbrokes API feed active.':(ladbrokesLiveData?.reason||'Ladbrokes adapter remains installed but inactive; public market snapshots are supplying current price intelligence meanwhile.')}</div>
    </div>
  </section>
  <section class="panel cc-panel section-block"><div class="cc-panel-head"><div><span class="cc-label">INTELLIGENCE PULSE</span><h3>Newest Horse-Linked Events</h3></div><button class="mini-button" onclick="openView('news')">News Centre</button></div>
      <div class="cc-feed">${feed.map(x=>`<div class="cc-feed-row"><div><span>${x.date?new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'}):'—'}</span></div><div><strong>${x.horse&&horseByName(x.horse)?horseLink(x.horse):(x.horse||'Cup-wide')}</strong><em>${x.title||''}</em></div><div>${x.kind==='qualification'?'Ticket':'Update'}</div></div>`).join('')||'<div class="news-empty">No horse-linked events loaded.</div>'}</div>
  </section>`;
}
const dashboardPulseBase=dashboard;
dashboard=function(){return dashboardPulseBase()+dashboardMarketPulse();};
