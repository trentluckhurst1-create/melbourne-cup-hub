let intelligenceData = {horses:{},events:[]};

async function loadIntelligence(){
  try{
    const res = await fetch('./data/intelligence/2026-09-13.json',{cache:'no-store'});
    if(res.ok) intelligenceData = await res.json();
  }catch(err){console.warn('Intelligence snapshot unavailable',err);}
}

function intelRecord(name){return intelligenceData?.horses?.[name] ?? null;}

const baseHorseDetailView = horseDetailView;
horseDetailView = function(name){
  const h = horseByName(name);
  if(!h) return `<div class="placeholder">Horse not found.</div>`;
  const intel = intelRecord(name);
  const rec = baseRecord(name);
  const qualified = GOLDEN_TICKETS.has(name);
  const base = intel?.trainingBase || currentBase(name);
  return `<button class="back-button" onclick="openView('horses')">← All horse profiles</button>
  <section class="horse-hero"><div><div class="kicker">Nomination #${h.nominationNumber} · ${h.country}</div><h2>${h.horse}</h2><div class="horse-meta">${intel?.ageSex || 'Age/sex researching'} · ${h.trainer} · ${base}</div></div><div>${qualified?tag('Golden Ticket','green'):tag(h.status)}</div></section>
  <section class="metric-grid horse-metrics">
    ${metric('Current Base',base,rec?`Verified ${rec.verifiedDate}`:'Research pending')}
    ${metric('Official Weight',dash(h.officialWeightKg),'Released 17 Sep')}
    ${metric('Predicted Weight',dash(h.predictedWeightKg),'Hub estimate')}
    ${metric('Market',h.marketOdds?`$${Number(h.marketOdds).toFixed(2)}`:'—','Current Cup price')}
    ${metric('Timeform',dash(h.timeformRating),'User-supplied subscription data')}
  </section>
  <section class="profile-grid">
    <div class="panel"><h3>Cup Profile</h3><div class="profile-list">
      <div><span>Age / sex</span><strong>${intel?.ageSex || 'Researching'}</strong></div>
      <div><span>Trainer</span><strong>${h.trainer}</strong></div>
      <div><span>Country</span><strong>${h.country}</strong></div>
      <div><span>Training base</span><strong>${base}</strong></div>
      <div><span>Order of entry</span><strong>${dash(h.orderOfEntry)}</strong></div>
      <div><span>Qualification</span><strong>${qualified?'Golden ticket / qualified':'Standard ballot conditions'}</strong></div>
    </div></div>
    <div class="panel"><h3>Campaign Intelligence</h3><div class="profile-list">
      <div><span>Status</span><strong>${intel?.campaignStatus || 'Researching'}</strong></div>
      <div><span>Cup relevance</span><strong>${intel?.cupRelevance || 'Assessment pending'}</strong></div>
      <div><span>Latest note</span><strong>${intel?.latestNote || 'Researching current campaign'}</strong></div>
      <div><span>Source</span><strong>${intel?.source || rec?.source || 'Pending'}</strong></div>
    </div></div>
  </section>
  <section class="panel profile-section"><h3>Form, Ratings & Market Timeline</h3><div class="placeholder compact">The dossier is ready for dated form runs, Timeform history, official and predicted Cup weights, market snapshots, lead-up targets and horse-linked news. Nothing will overwrite older snapshots.</div></section>`;
};

const baseDashboard = dashboard;
dashboard = function(){
  const original = baseDashboard();
  const cards = Object.entries(intelligenceData?.horses||{}).map(([name,r])=>{
    const h=horseByName(name); if(!h) return '';
    return `<button class="intel-card" onclick="openHorse('${name.replace(/'/g,"\\'")}')"><div class="intel-card-top"><span>${r.ageSex||h.country}</span><span>${r.trainingBase||currentBase(name)}</span></div><div class="intel-card-name">${name}</div><div class="intel-card-note">${r.cupRelevance||r.latestNote||''}</div></button>`;
  }).join('');
  const events=(intelligenceData?.events||[]).map(e=>`<div class="timeline-row"><div class="timeline-date">${new Date(e.date+'T00:00:00').toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</div><div><strong>${e.title}</strong><div class="timeline-copy">${e.detail}</div></div></div>`).join('');
  return original + `<section class="section-block"><div class="section-header"><div><div class="kicker">Horse Intelligence</div><h2>Verified Candidate Profiles</h2><div class="section-copy">Current horse-specific information, not generic trainer data.</div></div></div><div class="intel-grid">${cards}</div></section><section class="grid-two section-block"><div class="panel"><h3>Road to the Cup</h3><div class="timeline">${events}</div></div><div class="panel"><h3>Data Discipline</h3><div class="profile-list"><div><span>Training base</span><strong>Horse-specific + date-stamped</strong></div><div><span>Markets</span><strong>Snapshot history retained</strong></div><div><span>Weights</span><strong>Predicted vs official kept separately</strong></div><div><span>Timeform</span><strong>User-supplied subscription data only</strong></div><div><span>News</span><strong>Horse-linked with source + date</strong></div></div></div></section>`;
};

const baseRender = render;
render = function(view='dashboard'){
  baseRender(view);
};

loadIntelligence().then(()=>{
  if(typeof currentView!=='undefined') render(currentView||'dashboard');
});