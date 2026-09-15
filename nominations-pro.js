// Nominations tab audit — racing intelligence only. No backend coverage/status reporting.
(function(){
  if(typeof nominationsView!=='function'||typeof paintNominations!=='function')return;

  function nomMarket(h){
    const m=typeof marketUniverse==='function'?marketUniverse().find(x=>x.horse===h.horse):null;
    return m?.last?.odds?`$${Number(m.last.odds).toFixed(2)}`:(h.marketOdds?`$${Number(h.marketOdds).toFixed(2)}`:'—');
  }
  function nomWeight(h){
    const official=typeof orderOfficialWeight==='function'?orderOfficialWeight(h.horse):null;
    if(Number.isFinite(official))return `${official.toFixed(1)}kg`;
    const w=typeof weightRec==='function'?weightRec(h.horse):null;
    return w&&Number.isFinite(Number(w.predictedKg))?`${Number(w.predictedKg).toFixed(1)}kg`:'—';
  }
  function nomPfr(h){const r=typeof publicFormRating==='function'?publicFormRating(h.horse):null;return r?Number(r.current).toFixed(1):'—';}
  function nomLens(h){const x=typeof cupPublicLens==='function'?cupPublicLens(h.horse):null;return x?Number(x.score).toFixed(1):'—';}
  function nomLastRun(h){const runs=typeof publicRatedRuns==='function'?publicRatedRuns(h.horse):[];const r=runs[0];return r?`${r.finish||'—'} · ${r.race||'—'}`:'—';}
  function nomStatus(h){return GOLDEN_TICKETS.has(h.horse)?tag('QUALIFIED','green'):tag('NOMINATED');}

  nominationsView=function(){
    const horses=cupData?.horses??[];
    return `<div class="section-header"><div><div class="kicker">OFFICIAL NOMINATIONS · 1 SEPTEMBER 2026</div><h2>Melbourne Cup Nominations</h2></div></div>
    <div class="toolbar"><input id="nom-search" class="search" type="search" placeholder="Search horse, trainer, country or training base…"><div class="filters"><button class="filter active" data-nom-filter="all">All</button><button class="filter" data-nom-filter="Australasia">Australasian</button><button class="filter" data-nom-filter="International">International</button><button class="filter" data-nom-filter="ticket">Qualified</button></div></div>
    <div class="panel"><div class="table-wrap"><table class="data-table nominations-table"><thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>Country</th><th>Training Base</th><th>Wt</th><th>PFR</th><th>Last Run</th><th>Market</th><th>Cup Lens</th><th>Status</th></tr></thead><tbody id="nom-body"></tbody></table></div></div>`;
  };

  paintNominations=function(filter='all',query=''){
    const tbody=document.getElementById('nom-body');if(!tbody)return;
    const q=query.trim().toLowerCase();
    const rows=(cupData?.horses??[]).filter(h=>{
      const region=filter==='all'||h.trainingRegion===filter||(filter==='ticket'&&GOLDEN_TICKETS.has(h.horse));
      const text=`${h.horse} ${h.trainer} ${h.country} ${currentBase(h.horse)}`.toLowerCase();
      return region&&(!q||text.includes(q));
    });
    tbody.innerHTML=rows.map(h=>`<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}${GOLDEN_TICKETS.has(h.horse)?'<span class="ticket-dot" title="Ballot exemption">★</span>':''}</td><td>${h.trainer}</td><td>${h.country}</td><td>${currentBase(h.horse)}</td><td>${nomWeight(h)}</td><td><strong>${nomPfr(h)}</strong></td><td class="wrap-cell">${nomLastRun(h)}</td><td>${nomMarket(h)}</td><td><strong>${nomLens(h)}</strong></td><td>${nomStatus(h)}</td></tr>`).join('');
  };
})();
