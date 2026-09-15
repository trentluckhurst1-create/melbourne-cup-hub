// Presentation-only naming layer. Keep the legacy internal route key `timeform` for compatibility.
(function(){
  function apply(){
    document.querySelectorAll('.nav button[data-view="timeform"]').forEach(b=>b.textContent='PFR');
    if(typeof currentView!=='undefined'&&currentView==='timeform'){
      const title=document.getElementById('page-title');if(title)title.textContent='PFR';
    }
  }
  const base=window.render;
  if(typeof base==='function')window.render=function(view='dashboard'){const out=base(view);setTimeout(apply,0);return out;};
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="timeform"]'))setTimeout(apply,0);});
  setTimeout(apply,0);
})();
