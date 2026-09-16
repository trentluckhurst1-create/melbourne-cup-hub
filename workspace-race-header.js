// Universal Melbourne Cup race header — locked workspace standard.
(function(){
  function daysToRace(){return Math.max(0,Math.ceil((new Date('2026-11-03T15:00:00+11:00')-Date.now())/86400000));}
  function renderRaceHeader(){
    const actions=document.querySelector('.topbar-actions');
    if(!actions)return;
    let box=document.getElementById('workspace-race-header');
    if(!box){box=document.createElement('div');box.id='workspace-race-header';box.className='workspace-race-header';actions.prepend(box);}
    box.innerHTML=`<span class="wrh-trophy">🏆</span><span class="wrh-copy"><strong>Final Field</strong><small>3 Nov 2026 · Flemington</small></span><b class="wrh-days">${daysToRace()}</b><span class="wrh-label">DAYS TO RACE</span>`;
  }
  const originalOpenView=window.openView;
  if(typeof originalOpenView==='function')window.openView=function(){const out=originalOpenView.apply(this,arguments);setTimeout(renderRaceHeader,0);return out;};
  document.addEventListener('DOMContentLoaded',renderRaceHeader);
  setTimeout(renderRaceHeader,0);
})();