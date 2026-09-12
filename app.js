const navItems = [
  ['dashboard','Cup Dashboard'],['nominations','Nominations'],['horses','Horse Profiles'],['weights','Weights & Handicap'],['order','Order of Entry'],['markets','Markets'],['timeform','Timeform'],['form','Form Guide'],['leadups','Lead-up Tracker'],['international','International Raiders'],['ratings','Ratings & Rankings'],['news','News Centre'],['connections','Jockeys & Trainers'],['history','Historical Cup'],['analysis','Race Analysis'],['raceday','Final Field / Race Day']
];

const GOLDEN_TICKETS = new Set(['Defiantly','Tawny Port','Zakouma']);
let cupData = null;
let trainingBaseData = null;
let currentView = 'dashboard';
let selectedHorse = null;

const latestNews = [
  {time:'13 SEP',title:'101 original nominations are now loaded into the Hub: 78 Australasian-trained and 23 internationally trained.',source:'Official nominations'},
  {time:'13 SEP',title:'Training base is now horse-specific and date-stamped. We will not substitute a trainer’s general home base for the horse’s actual current preparation base.',source:'Hub data policy'},
  {time:'15 SEP',title:'Late nominations close at 12 noon. Any additions will be preserved as a new dated snapshot rather than overwriting the original list.',source:'Racing Victoria'},
  {time:'17 SEP',title:'Official Melbourne Cup handicaps are declared. The Hub will compare them against our pre-release predicted weights.',source:'Racing Victoria'}
];

async function loadCupData(){
  try{
    const [nomRes,baseRes] = await Promise.all([
      fetch('./data/nominations/2026-09-01.json', {cache:'no-store'}),
      fetch('./data/training-bases/2026-09-13.json', {cache:'no-store'})
    ]);
    if(!nomRes.ok) throw new Error(`Nominations HTTP ${nomRes.status}`);
    cupData = await nomRes.json();
    trainingBaseData = baseRes.ok ? await baseRes.json() : {bases:{}};
    const verified = Object.keys(trainingBaseData?.bases ?? {}).length;
    document.getElementById('updated-label').textContent = `Official nominations loaded · ${verified} current bases verified`;
  }catch(err){
    console.error('Cup data load failed',err);
    document.getElementById('updated-label').textContent = 'Cup data unavailable';
  }
}

function baseRecord(horse){return trainingBaseData?.bases?.[horse] ?? null;}
function currentBase(horse){return baseRecord(horse)?.trainingBase ?? 'Researching';}
function baseCell(horse){
  const rec=baseRecord(horse);
  if(!rec) return '<span class="muted">Researching</span>';
  return `<span class="base-verified" title="${rec.confidence} · verified ${rec.verifiedDate} · ${rec.source}">${rec.trainingBase}</span>`;
}
function horseByName(name){return (cupData?.horses??[]).find(h=>h.horse===name)??null;}

function daysToCup(){
  const now = new Date();
  const target = new Date('2026-11-03T15:00:00+11:00');
  const diff = Math.max(0,target-now);
  return {days:Math.floor(diff/86400000),hours:Math.floor(diff/3600000)%24,mins:Math.floor(diff/60000)%60};
}
function daysUntil(dateString){const diff = new Date(dateString)-new Date();return Math.max(0,Math.ceil(diff/86400000));}

function renderNav(){
  const nav=document.getElementById('nav');
  nav.innerHTML=navItems.map(([id,label],i)=>`<button data-view="${id}" class="${i===0?'active':''}">${label}</button>`).join('');
  nav.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-view]'); if(!btn)return;
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); currentView=btn.dataset.view; selectedHorse=null; render(currentView);
  });
}

function metric(label,value,sub=''){return `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></div>`}
function dash(v){return v===null||v===undefined?'—':v}
function tag(text,type='gold'){return `<span class="tag ${type}">${text}</span>`}
function horseLink(name){return `<button class="horse-link" onclick="openHorse('${name.replace(/'/g,"\\'")}')">${name}</button>`}

function dashboard(){
  const c=daysToCup();
  const total=cupData?.snapshot?.totalEntries ?? '—';
  const intl=cupData?.snapshot?.overseasTrained ?? '—';
  const local=cupData?.snapshot?.australasianTrained ?? '—';
  const verifiedBases=Object.keys(trainingBaseData?.bases ?? {}).length;
  const featured = cupData?.horses?.filter(h=>['Half Yours','Aeliana','Christmas Day','Goodie Two Shoes','Defiantly','Stinger Glass','Tawny Port','Knight’s Choice','Birdman','Light Infantry Man'].includes(h.horse)) ?? [];
  return `
    <section class="hero">
      <div><div class="kicker">The race that stops a nation</div><h2>2026 Melbourne Cup</h2><p>Tuesday 3 November · Flemington · 3200m · Group 1 · $10.2 million. Every nomination, handicap, market move, Timeform rating, lead-up run, travel update and news item in one evolving intelligence centre.</p></div>
      <div class="countdown"><div class="count-box"><div class="count-num">${c.days}</div><div class="count-label">Days</div></div><div class="count-box"><div class="count-num">${c.hours}</div><div class="count-label">Hours</div></div><div class="count-box"><div class="count-num">${c.mins}</div><div class="count-label">Minutes</div></div></div>
    </section>
    <section class="metric-grid">
      ${metric('Nominations',total,'Official original entries')}
      ${metric('International',intl,'Overseas-trained entries')}
      ${metric('Australasian',local,'Locally trained entries')}
      ${metric('Bases Verified',verifiedBases,'Horse-specific current location')}
      ${metric('Handicaps','17 Sep','Official weights release')}
    </section>
    <section class="grid-two">
      <div class="panel"><div class="panel-head"><div><h3>Headline Cup Candidates</h3><div class="panel-sub">Click any horse to open its dossier.</div></div><button class="mini-button" onclick="openView('nominations')">All 101 →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Nom.</th><th>Horse</th><th>Trainer</th><th>Origin</th><th>Training Base</th><th>Status</th></tr></thead><tbody>${featured.map(r=>`<tr><td>${r.nominationNumber}</td><td class="horse">${horseLink(r.horse)}</td><td>${r.trainer}</td><td>${r.country}</td><td>${baseCell(r.horse)}</td><td>${GOLDEN_TICKETS.has(r.horse)?tag('Golden Ticket','green'):tag('Nominated')}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="panel"><h3>Latest Cup Intelligence</h3><div class="panel-sub">Critical dates and field-development information.</div><div class="news-list">${latestNews.map(n=>`<article class="news-card"><div class="news-meta"><span>${n.time}</span><span>${n.source}</span></div><div class="news-title">${n.title}</div></article>`).join('')}</div></div>
    </section>`;
}

function nominationsView(){
  const horses=cupData?.horses ?? [];
  const verifiedBases=Object.keys(trainingBaseData?.bases ?? {}).length;
  return `<div class="section-header"><div><div class="kicker">Official snapshot · 1 September 2026</div><h2>Melbourne Cup Nominations</h2><div class="section-copy">${horses.length} entries loaded · ${verifiedBases} current training bases independently verified. Click a horse name to open its profile.</div></div></div>
  <div class="toolbar"><input id="nom-search" class="search" type="search" placeholder="Search horse, trainer, country or training base…"><div class="filters"><button class="filter active" data-nom-filter="all">All ${horses.length}</button><button class="filter" data-nom-filter="Australasia">Australasian 78</button><button class="filter" data-nom-filter="International">International 23</button><button class="filter" data-nom-filter="verified">Base verified ${verifiedBases}</button><button class="filter" data-nom-filter="ticket">Golden tickets 3</button></div></div>
  <div class="panel"><div class="table-wrap"><table class="data-table nominations-table"><thead><tr><th>#</th><th>Horse</th><th>Country</th><th>Trainer</th><th>Current Training Base</th><th>Weight</th><th>Market</th><th>Status</th></tr></thead><tbody id="nom-body"></tbody></table></div></div>`;
}

function paintNominations(filter='all',query=''){
  const tbody=document.getElementById('nom-body'); if(!tbody)return;
  const q=query.trim().toLowerCase();
  const rows=(cupData?.horses??[]).filter(h=>{
    const verified=!!baseRecord(h.horse);
    const region=filter==='all'||h.trainingRegion===filter||(filter==='ticket'&&GOLDEN_TICKETS.has(h.horse))||(filter==='verified'&&verified);
    const text=`${h.horse} ${h.trainer} ${h.country} ${currentBase(h.horse)}`.toLowerCase();
    return region&&(!q||text.includes(q));
  });
  tbody.innerHTML=rows.map(h=>`<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}${GOLDEN_TICKETS.has(h.horse)?'<span class="ticket-dot" title="Golden ticket">★</span>':''}</td><td>${h.country}</td><td>${h.trainer}</td><td>${baseCell(h.horse)}</td><td>${dash(h.officialWeightKg)}</td><td>${h.marketOdds?`$${Number(h.marketOdds).toFixed(2)}`:'—'}</td><td>${GOLDEN_TICKETS.has(h.horse)?tag('Qualified','green'):tag(h.status)}</td></tr>`).join('');
}
function bindNominations(){
  let active='all'; const search=document.getElementById('nom-search');
  document.querySelectorAll('[data-nom-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-nom-filter]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');active=btn.dataset.nomFilter;paintNominations(active,search?.value||'');}));
  search?.addEventListener('input',()=>paintNominations(active,search.value)); paintNominations();
}

function horseProfilesView(){
  const horses=cupData?.horses??[];
  return `<div class="section-header"><div><div class="kicker">101 Candidate Dossiers</div><h2>Horse Profiles</h2><div class="section-copy">Each nomination now has a permanent profile shell. As we add form, ratings, markets, weights and news, they will attach to the same horse record.</div></div></div>
  <div class="toolbar"><input id="horse-search" class="search" type="search" placeholder="Find a horse…"></div>
  <div id="horse-grid" class="horse-grid"></div>`;
}
function paintHorseGrid(query=''){
  const root=document.getElementById('horse-grid');if(!root)return;
  const q=query.trim().toLowerCase();
  const rows=(cupData?.horses??[]).filter(h=>!q||`${h.horse} ${h.trainer} ${h.country} ${currentBase(h.horse)}`.toLowerCase().includes(q));
  root.innerHTML=rows.map(h=>`<button class="horse-card" onclick="openHorse('${h.horse.replace(/'/g,"\\'")}')"><div class="horse-card-top"><span>#${h.nominationNumber}</span><span>${h.country}</span></div><div class="horse-card-name">${h.horse}</div><div class="horse-card-trainer">${h.trainer}</div><div class="horse-card-base">${currentBase(h.horse)}</div></button>`).join('');
}
function bindHorseProfiles(){const s=document.getElementById('horse-search');s?.addEventListener('input',()=>paintHorseGrid(s.value));paintHorseGrid();}

function horseDetailView(name){
  const h=horseByName(name); if(!h) return `<div class="placeholder">Horse not found.</div>`;
  const rec=baseRecord(h.horse); const qualified=GOLDEN_TICKETS.has(h.horse);
  return `<button class="back-button" onclick="openView('horses')">← All horse profiles</button>
  <section class="horse-hero"><div><div class="kicker">Nomination #${h.nominationNumber} · ${h.country}</div><h2>${h.horse}</h2><div class="horse-meta">${h.trainer} · ${currentBase(h.horse)}</div></div><div>${qualified?tag('Golden Ticket','green'):tag(h.status)}</div></section>
  <section class="metric-grid horse-metrics">
    ${metric('Current Base',currentBase(h.horse),rec?`Verified ${rec.verifiedDate}`:'Research pending')}
    ${metric('Official Weight',dash(h.officialWeightKg),'Released 17 Sep')}
    ${metric('Predicted Weight',dash(h.predictedWeightKg),'Hub estimate')}
    ${metric('Market',h.marketOdds?`$${Number(h.marketOdds).toFixed(2)}`:'—','Current Cup price')}
    ${metric('Timeform',dash(h.timeformRating),'User-supplied subscription data')}
  </section>
  <section class="profile-grid">
    <div class="panel"><h3>Cup Profile</h3><div class="profile-list"><div><span>Trainer</span><strong>${h.trainer}</strong></div><div><span>Country</span><strong>${h.country}</strong></div><div><span>Training base</span><strong>${currentBase(h.horse)}</strong></div><div><span>Training region</span><strong>${h.trainingRegion}</strong></div><div><span>Order of entry</span><strong>${dash(h.orderOfEntry)}</strong></div><div><span>Qualification</span><strong>${qualified?'Golden ticket / qualified':'Standard ballot conditions'}</strong></div></div></div>
    <div class="panel"><h3>Data Status</h3><div class="profile-list"><div><span>Form</span><strong>Pending import</strong></div><div><span>Lead-up program</span><strong>Researching</strong></div><div><span>News timeline</span><strong>Ready for linking</strong></div><div><span>Ratings history</span><strong>Ready for import</strong></div><div><span>Market history</span><strong>Ready for snapshots</strong></div>${rec?`<div><span>Base source</span><strong>${rec.source}</strong></div>`:''}</div></div>
  </section>
  <section class="panel profile-section"><h3>Latest Form & Cup Intelligence</h3><div class="placeholder compact">This profile is now the permanent destination for ${h.horse}. Next data layers will populate recent runs, Timeform history, Cup weight analysis, current odds, lead-up plans and horse-linked news here.</div></section>`;
}

const descriptions = {
 weights:['Weights & Handicap','Our pre-release projected weights will sit beside the official handicaps from 17 September, with variance and reasoning retained.'],
 order:['Order of Entry','Live ballot ranking, golden-ticket exemptions, qualification clauses and projected 24-horse cut line.'],
 markets:['Markets','Current Cup odds plus dated price snapshots, implied probability and mover/drifter history.'],
 timeform:['Timeform','Your subscription figures will be imported from data you provide and attached to each horse without scraping protected subscriber content.'],
 form:['Form Guide','Recent runs, race quality, distance, going, weight, margin, ratings and Cup-relevant performance notes.'],
 leadups:['Lead-up Tracker','Australian and international lead-up races, entries, results and what each run means for Cup qualification and readiness.'],
 international:['International Raiders','The 23 overseas-trained nominations with travel, quarantine, imaging, intended prep and likelihood of making the trip.'],
 ratings:['Ratings & Rankings','Timeform, official ratings and our Cup-specific rankings as separate measures rather than blending them invisibly.'],
 news:['News Centre','Horse-linked Cup news, stable comments, travel, injury, jockey and program changes with source and timestamp.'],
 connections:['Jockeys & Trainers','Bookings, changes, Cup records and key stable/jockey statistics.'],
 history:['Historical Melbourne Cup','Past winners, weights, ages, barriers, SPs, lead-ups and long-run Cup benchmarks.'],
 analysis:['Race Analysis','Tempo, map, stamina, barriers, track/weather scenarios and runner-by-runner assessment as the field takes shape.'],
 raceday:['Final Field / Race Day','The final 24, barriers, jockeys, weights, scratchings, weather, track, market and live race-day intelligence.']
};
function workspace(id){const [title,desc]=descriptions[id];return `<div class="section-header"><div><div class="kicker">Melbourne Cup 2026</div><h2>${title}</h2></div></div><div class="placeholder"><strong>${title}</strong><br><br>${desc}<br><br><span class="muted">Foundation ready · data population follows the nomination database.</span></div>`;}

function openView(view){
  const btn=document.querySelector(`.nav button[data-view="${view}"]`); if(btn){document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
  currentView=view; selectedHorse=null; render(view);
}
function openHorse(name){selectedHorse=name;currentView='horses';const btn=document.querySelector('.nav button[data-view="horses"]');if(btn){document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}render('horses');}
window.openView=openView;window.openHorse=openHorse;

function render(view='dashboard'){
  const label=navItems.find(x=>x[0]===view)?.[1]||'Cup Dashboard';
  document.getElementById('page-title').textContent=selectedHorse&&view==='horses'?selectedHorse:label;
  let html;
  if(view==='dashboard')html=dashboard();
  else if(view==='nominations')html=nominationsView();
  else if(view==='horses')html=selectedHorse?horseDetailView(selectedHorse):horseProfilesView();
  else html=workspace(view);
  document.getElementById('app-content').innerHTML=html;
  if(view==='nominations')bindNominations();
  if(view==='horses'&&!selectedHorse)bindHorseProfiles();
}

document.getElementById('refresh-button').addEventListener('click',async()=>{await loadCupData();render(currentView);});
renderNav();
loadCupData().then(()=>render());
