// Approved 15 Sep dashboard visual refresh.
// Presentation-only: preserve command-centre data and interactions.
(function(){
  if(typeof commandCentreDashboard!=='function') return;
  const baseCommandCentreDashboard=commandCentreDashboard;
  commandCentreDashboard=function(){
    return baseCommandCentreDashboard()
      .replace('<span class="cc-label">DELTA INTELLIGENCE</span><h3>What Changed?</h3><div class="panel-sub">Newest material market, field, handicap and campaign changes. Static facts are deliberately suppressed.</div>','<h3 class="cc-updates-title"><span aria-hidden="true">⚡</span> Latest Key Updates</h3>')
      .replace('<span class="tag gold">DATED EVIDENCE</span>','');
  };
})();
