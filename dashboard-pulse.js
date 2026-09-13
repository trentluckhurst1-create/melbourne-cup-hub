function dashboardMarketPulse(){
  const snaps=marketSnapshots||[];
  const latest=snaps[snaps.length-1]||null;
  const marketRows=typeof marketUniverse==='function'?marketUniverse():[];
  const feed=typeof newsItems==='function'?newsItems().slice(0,6):[];
  const projected=new Set((projectedFieldData?.projected24||[]).map(x=>x.horse));
  const projectedPriced=marketRows.filter(x=>projected.has(x.horse)).length;
  const liveOn=typeof ladbrokesIsLive==='function'&&ladbrokesIsLive();
  const liveCount=liveOn?(ladbrokesLiveData?.runners||[]).filter(x=>Number.isFinite(Number(x.odds))).length:0;
  const liveProjected=liveOn?(ladbrokesLiveData?.runners||[]).filter(x=>projected.has(x.horse)&&Number.isFinite(Number(x.odds))).length:0;
  const freshness=typeof ladbrokesFreshness==='function'?ladbrokesFreshness():{state:'offline',label:'Not connected'};
  const pulseClass=freshness.state==='live'?'ladbrokes-pulse-live':freshness.state==='stale'?'ladbrokes-pulse-stale':'ladbrokes-pulse-offline';
  const fetched=ladbrokesLiveData?.fetchedAt?new Date(ladbrokesLiveData.fetchedAt).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}):'—';
  return `<section class="cc-grid-main section-block">
    <div class="panel cc-panel ${pulseClass}"><div class="cc-panel-head"><div><span class="cc-label">MARKET CONTROL</span><h3>Ladbrokes Price Pulse</h3></div><button class="mini-button" onclick="openView('markets')">Markets</button></div>
      <div class="metric-grid">${metric('Ladbrokes',liveOn?'LIVE':'OFF',ladbrokesLiveData?.status||'Feed unavailable')}${metric('Live Nominees',liveCount,'Fixed-win prices')}${metric('Projected 24',liveProjected,'Live-priced contenders')}${metric('Last API',fetched,freshness.label)}${metric('Historical',snaps.length,latest?`${latest.bookmaker} · ${latest.snapshotDate}`:'No stored snapshot')}</div>
      <div class="market-warning ${liveOn?'market-live-ok':''}">${liveOn?`Live Ladbrokes futures feed active · ${freshness.label}. Historical snapshots remain preserved separately.`:(ladbrokesLiveData?.reason||'Ladbrokes live adapter is installed but the feed is not active yet.')}</div>
    </div>
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">INTELLIGENCE PULSE</span><h3>Newest Horse-Linked Events</h3></div><button class="mini-button" onclick="openView('news')">News Centre</button></div>
      <div class="cc-feed">${feed.map(x=>`<div class="cc-feed-row"><div><span>${x.date?new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'}):'—'}</span></div><div><strong>${x.horse&&horseByName(x.horse)?horseLink(x.horse):(x.horse||'Cup-wide')}</strong><em>${x.title||''}</em></div><div>${x.kind==='qualification'?'Ticket':'Update'}</div></div>`).join('')||'<div class="news-empty">No horse-linked events loaded.</div>'}</div>
    </div>
  </section>`;
}
const dashboardPulseBase=dashboard;
dashboard=function(){return dashboardPulseBase()+dashboardMarketPulse();};
