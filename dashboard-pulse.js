function dashboardMarketPulse(){
  const snaps=marketSnapshots||[];
  const latest=snaps[snaps.length-1]||null;
  const marketRows=typeof marketUniverse==='function'?marketUniverse():[];
  const feed=typeof newsItems==='function'?newsItems().slice(0,6):[];
  const projected=new Set((projectedFieldData?.projected24||[]).map(x=>x.horse));
  const projectedPriced=marketRows.filter(x=>projected.has(x.horse)).length;
  const latestAge=latest?Math.max(0,Math.floor((new Date('2026-09-13T00:00:00+10:00')-new Date(latest.snapshotDate+'T00:00:00+10:00'))/86400000)):null;
  return `<section class="cc-grid-main section-block">
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">MARKET CONTROL</span><h3>Stored Price Pulse</h3></div><button class="mini-button" onclick="openView('markets')">Markets</button></div>
      <div class="metric-grid">${metric('Snapshots',snaps.length,'Dated evidence')}${metric('Nominees Priced',marketRows.length,'Across stored snapshots')}${metric('Projected 24 Priced',projectedPriced,'Current field model')}${metric('Latest',latest?.snapshotDate||'—',latest?.bookmaker||'No snapshot')}${metric('Freshness',latestAge===null?'—':latestAge+'d','Historical, not live')}</div>
      <div class="market-warning">Current live market is still a research gap. Historical prices remain visible, but the Hub will never relabel them as current.</div>
    </div>
    <div class="panel cc-panel"><div class="cc-panel-head"><div><span class="cc-label">INTELLIGENCE PULSE</span><h3>Newest Horse-Linked Events</h3></div><button class="mini-button" onclick="openView('news')">News Centre</button></div>
      <div class="cc-feed">${feed.map(x=>`<div class="cc-feed-row"><div><span>${x.date?new Date(x.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'}):'—'}</span></div><div><strong>${x.horse&&horseByName(x.horse)?horseLink(x.horse):(x.horse||'Cup-wide')}</strong><em>${x.title||''}</em></div><div>${x.kind==='qualification'?'Ticket':'Update'}</div></div>`).join('')||'<div class="news-empty">No horse-linked events loaded.</div>'}</div>
    </div>
  </section>`;
}
const dashboardPulseBase=dashboard;
dashboard=function(){return dashboardPulseBase()+dashboardMarketPulse();};
