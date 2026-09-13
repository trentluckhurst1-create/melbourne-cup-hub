// Cross-layer integrity corrections loaded last.
// Keep public UI counts and milestone dates aligned with current official sources.

if (typeof GOLDEN_TICKETS !== 'undefined') {
  GOLDEN_TICKETS.add('Shockletz');
}

// VRC official 1 Sep 2026 milestone table: late nominations closed 12pm Tue 8 Sep.
if (typeof latestNews !== 'undefined' && Array.isArray(latestNews)) {
  const lateNom = latestNews.find(x => /Late nominations/i.test(x.title || ''));
  if (lateNom) {
    lateNom.time = '8 SEP';
    lateNom.title = 'Late nominations closed at 12 noon. Any valid additions are preserved as a new dated snapshot rather than overwriting the original 1 September list.';
    lateNom.source = 'Victoria Racing Club';
  }
}

function applyOfficialMilestoneCorrections(){
  if (typeof cupData !== 'undefined' && cupData?.snapshot) {
    cupData.snapshot.lateNominationsClose = '2026-09-08T12:00:00+10:00';
    cupData.snapshot.handicapsDeclared = '2026-09-17';
    cupData.snapshot.firstAcceptancesClose = '2026-09-29T12:00:00+10:00';
  }
}

const integrityRenderBase = render;
render = function(view='dashboard'){
  applyOfficialMilestoneCorrections();
  integrityRenderBase(view);
  if(view==='nominations'){
    const ticketButton=document.querySelector('[data-nom-filter="ticket"]');
    if(ticketButton && typeof GOLDEN_TICKETS !== 'undefined'){
      ticketButton.textContent=`Golden tickets ${GOLDEN_TICKETS.size}`;
    }
  }
};

Promise.resolve().then(applyOfficialMilestoneCorrections);
