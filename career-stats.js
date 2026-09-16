// Verified full-career profile statistics. Never derive career totals from the recent-form window.
(function(){
  window.CAREER_STATS={};
  window.careerStatsFor=function(name){return window.CAREER_STATS?.[name]||null};
  fetch('data/profiles/2026-09-17-career-stats.json?v=20260917-1',{cache:'no-store'})
    .then(r=>r.ok?r.json():Promise.reject(new Error('career stats '+r.status)))
    .then(d=>{window.CAREER_STATS=d.horses||{};window.dispatchEvent(new CustomEvent('career-stats-ready'));})
    .catch(()=>{});
})();
