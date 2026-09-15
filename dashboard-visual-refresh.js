// Dashboard audit refresh — 16 Sep 2026.
// Presentation/semantics layer only: preserve command-centre evidence and interactions.
(function(){
  if(typeof commandCentreDashboard!=='function') return;
  const baseCommandCentreDashboard=commandCentreDashboard;
  commandCentreDashboard=function(){
    return baseCommandCentreDashboard()
      .replace('<span class="cc-label">DELTA INTELLIGENCE</span><h3>What Changed?</h3><div class="panel-sub">Newest material market, field, handicap and campaign changes. Static facts are deliberately suppressed.</div>','<h3 class="cc-updates-title"><span aria-hidden="true">⚡</span> Latest Key Updates</h3>')
      .replace('<span class="tag gold">DATED EVIDENCE</span>','')
      .replace('<span class="cc-label">DATA CONTROL</span><h3>Research Queue</h3>','<span class="cc-label">DATA CONTROL</span><h3>Coverage Exceptions</h3>')
      .replace('>Coverage audit</button>','>Open form audit</button>');
  };
})();
