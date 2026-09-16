// Authoritative full-career profile statistics. Never derive career totals from the recent-form window.
(function(){
  const norm=s=>String(s||'').normalize('NFKD').replace(/[’‘]/g,"'").toLowerCase().replace(/[^a-z0-9]/g,'');
  window.CAREER_STATS={};
  window.CAREER_STATS_INDEX={};
  window.careerStatsFor=function(name){return window.CAREER_STATS_INDEX?.[norm(name)]||null};
  Promise.all([
    fetch('data/profiles/2026-09-17-career-stats.json?v=20260917-4',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('career stats '+r.status))),
    fetch('data/profiles/2026-09-17-identity-certified-career-overrides.json?v=20260917-1',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('career overrides '+r.status)))
  ]).then(([base,cert])=>{
    const merged={...(base.horses||{}),...(cert.horses||{})};
    const idx={};
    Object.entries(merged).forEach(([name,rec])=>{const k=norm(name);if(idx[k]&&idx[k]!==rec)throw new Error('career horse-name collision '+name);idx[k]=rec});
    window.CAREER_STATS=merged;window.CAREER_STATS_INDEX=idx;
    window.dispatchEvent(new CustomEvent('career-stats-ready'));
  }).catch(e=>console.error('Career stats load failed',e));
})();
