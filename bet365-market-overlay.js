let bet365Snapshot=null;
async function loadBet365Snapshot(){
  try{
    const r=await fetch('./data/markets/2026-09-13-bet365.json',{cache:'no-store'});
    if(!r.ok)return null;
    bet365Snapshot=await r.json();
    if(!marketSnapshots.some(x=>x.bookmaker==='bet365'&&x.snapshotDate===bet365Snapshot.snapshotDate)){
      marketSnapshots.push(bet365Snapshot);
      marketSnapshots.sort((a,b)=>xDate(a).localeCompare(xDate(b)));
    }
    return bet365Snapshot;
  }catch{return null;}
}
function xDate(x){return String(x?.snapshotDate||'');}

const bet365MarketRenderBase=render;
render=function(view='dashboard'){
  if(view==='markets'&&!bet365Snapshot){
    const root=document.getElementById('app-content');
    if(root)root.innerHTML='<div class="placeholder">Loading current market snapshot…</div>';
    loadBet365Snapshot().then(()=>bet365MarketRenderBase(view));
    return;
  }
  bet365MarketRenderBase(view);
};

loadBet365Snapshot().then(()=>{
  if(typeof currentView!=='undefined'&&currentView==='markets')render('markets');
}).catch(()=>{});
