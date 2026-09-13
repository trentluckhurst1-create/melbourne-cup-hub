let bet365Snapshot=null;
let betGoldSnapshot=null;
let currentMarketPromise=null;
let currentMarketLoaded=false;

function xDate(x){return String(x?.snapshotDate||'');}
function normMarketHorse(v){return String(v||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();}

function addMarketSnapshot(snapshot){
  if(!snapshot)return;
  if(!marketSnapshots.some(x=>x.bookmaker===snapshot.bookmaker&&x.snapshotDate===snapshot.snapshotDate)){
    marketSnapshots.push(snapshot);
    marketSnapshots.sort((a,b)=>xDate(a).localeCompare(xDate(b)));
  }
}

async function loadCurrentMarketSnapshots(){
  if(currentMarketPromise)return currentMarketPromise;
  currentMarketPromise=Promise.all([
    fetch('./data/markets/2026-09-13-bet365.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('./data/markets/2026-09-13-betgold.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([b365,bg])=>{
    bet365Snapshot=b365;betGoldSnapshot=bg;currentMarketLoaded=true;
    addMarketSnapshot(b365);addMarketSnapshot(bg);
    return [b365,bg].filter(Boolean);
  }).catch(err=>{currentMarketLoaded=true;console.warn('Current market snapshots unavailable',err);return [];});
  return currentMarketPromise;
}

function currentBookQuotes(name){
  const key=normMarketHorse(name);
  return [bet365Snapshot,betGoldSnapshot].filter(Boolean).map(s=>{
    const r=(s.runners||[]).find(x=>normMarketHorse(x.horse)===key);
    return r?{bookmaker:s.bookmaker,odds:Number(r.odds),placeOdds:Number.isFinite(Number(r.placeOdds))?Number(r.placeOdds):null,date:s.snapshotDate,status:s.status,sourceUrl:s.sourceUrl}:null;
  }).filter(x=>x&&Number.isFinite(x.odds));
}

function bestPriceRec(name){
  const quotes=currentBookQuotes(name).sort((a,b)=>b.odds-a.odds);
  if(!quotes.length)return null;
  const best=quotes[0],worst=quotes[quotes.length-1];
  return {...best,quotes,spread:quotes.length>1?best.odds-worst.odds:0,implied:100/best.odds};
}

function bestPriceRows(){
  return (cupData?.horses||[]).map(h=>({horse:h.horse,trainer:h.trainer,region:h.trainingRegion,best:bestPriceRec(h.horse),projected:typeof projectedRec==='function'?projectedRec(h.horse):null})).filter(x=>x.best).sort((a,b)=>a.best.odds-b.best.odds||a.horse.localeCompare(b.horse));
}

function quoteCell(name,bookmaker){
  const q=currentBookQuotes(name).find(x=>x.bookmaker===bookmaker);
  return q?`<strong>$${q.odds.toFixed(2)}</strong>${q.placeOdds?`<div class="muted">Place $${q.placeOdds.toFixed(2)}</div>`:''}`:'—';
}

function bestPriceBoard(){
  const rows=bestPriceRows();
  const both=rows.filter(x=>x.best.quotes.length>1).length;
  const projected=new Set((projectedFieldData?.projected24||[]).map(x=>x.horse));
  const projectedCovered=rows.filter(x=>projected.has(x.horse)).length;
  const sourceCount=(bet365Snapshot?1:0)+(betGoldSnapshot?1:0);
  return `<section class="panel current-market-panel"><div class="panel-head"><div><div class="kicker">Current Public Market Comparison</div><h3>Best Price Board</h3><div class="panel-sub">Bet365 and BetGold public-web snapshots captured 13 Sep. Best price is the highest decimal win price currently stored by the Hub.</div></div><span class="tag green">${sourceCount} CURRENT SOURCE${sourceCount===1?'':'S'}</span></div>
  <section class="metric-grid current-market-metrics">${metric('Priced Nominees',rows.length,'Current public snapshots')}${metric('Two-Book Quotes',both,'Direct current comparison')}${metric('Projected 24 Covered',projectedCovered,'Current field model')}${metric('Best-Price Rule','MAX','Highest stored decimal win quote')}${metric('Snapshot Date','13 Sep','Odds can move at any time')}</section>
  <div class="market-warning"><strong>Price discipline:</strong> these are dated public-web snapshots, not guaranteed executable live quotes. Always verify with the bookmaker before betting.</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Best Win</th><th>Book</th><th>Implied</th><th>Bet365</th><th>BetGold</th><th>Book Spread</th><th>Projected</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="horse">${horseLink(x.horse)}</td><td><strong class="best-price">$${x.best.odds.toFixed(2)}</strong></td><td>${x.best.bookmaker}</td><td>${x.best.implied.toFixed(1)}%</td><td>${quoteCell(x.horse,'bet365')}</td><td>${quoteCell(x.horse,'BetGold')}</td><td>${x.best.quotes.length>1?`$${x.best.spread.toFixed(2)}`:'—'}</td><td>${x.projected?`#${x.projected.rank}`:'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
}

const baseMarketsWithCurrentBooks=marketsWorkbenchView;
marketsWorkbenchView=function(){return bestPriceBoard()+baseMarketsWithCurrentBooks();};

if(typeof dossierMarket==='function'){
  dossierMarket=function(name){const b=bestPriceRec(name);return b?`$${b.odds.toFixed(2)} · ${b.bookmaker}`:'—';};
}

const currentBooksRenderBase=render;
render=function(view='dashboard'){
  if((view==='markets'||selectedHorse)&&!currentMarketLoaded){
    const root=document.getElementById('app-content');
    if(view==='markets'&&root)root.innerHTML='<div class="placeholder">Loading current bookmaker snapshots…</div>';
    loadCurrentMarketSnapshots().then(()=>currentBooksRenderBase(view));
    return;
  }
  currentBooksRenderBase(view);
};

loadCurrentMarketSnapshots().then(()=>{
  if(typeof currentView!=='undefined'&&(currentView==='dashboard'||currentView==='markets'||selectedHorse))render(currentView);
}).catch(()=>{});
