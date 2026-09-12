// Cross-layer integrity corrections loaded last.
// Keep public UI counts aligned with qualification data without duplicating source datasets.

if (typeof GOLDEN_TICKETS !== 'undefined') {
  GOLDEN_TICKETS.add('Shockletz');
}

const integrityRenderBase = render;
render = function(view='dashboard'){
  integrityRenderBase(view);
  if(view==='nominations'){
    const ticketButton=document.querySelector('[data-nom-filter="ticket"]');
    if(ticketButton && typeof GOLDEN_TICKETS !== 'undefined'){
      ticketButton.textContent=`Golden tickets ${GOLDEN_TICKETS.size}`;
    }
  }
};
