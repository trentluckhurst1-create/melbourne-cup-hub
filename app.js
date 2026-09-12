const navItems = [
  ['dashboard','Cup Dashboard'],['nominations','Nominations'],['horses','Horse Profiles'],['weights','Weights & Handicap'],['order','Order of Entry'],['markets','Markets'],['timeform','Timeform'],['form','Form Guide'],['leadups','Lead-up Tracker'],['international','International Raiders'],['ratings','Ratings & Rankings'],['news','News Centre'],['connections','Jockeys & Trainers'],['history','Historical Cup'],['analysis','Race Analysis'],['raceday','Final Field / Race Day']
];

const nominations = [
  {horse:'Foundation dataset pending',country:'—',age:'—',trainer:'—',weight:'—',order:'—',market:'—',status:'Awaiting import'},
];

const latestNews = [
  {time:'FOUNDATION',title:'Hub structure created — live nomination, market, rating and news feeds are next.',source:'System'},
  {time:'SOURCE POLICY',title:'Every changing fact will carry a timestamp and source so historical states are preserved.',source:'Data architecture'},
  {time:'TIMEFORM',title:'Subscription ratings will be stored from user-supplied data, not scraped from protected content.',source:'Private data'}
];

function daysToCup(){
  const now = new Date();
  const target = new Date('2026-11-03T15:00:00+11:00');
  const diff = Math.max(0,target-now);
  return {
    days:Math.floor(diff/86400000),
    hours:Math.floor(diff/3600000)%24,
    mins:Math.floor(diff/60000)%60
  };
}

function renderNav(){
  const nav=document.getElementById('nav');
  nav.innerHTML=navItems.map(([id,label],i)=>`<button data-view="${id}" class="${i===0?'active':''}">${label}</button>`).join('');
  nav.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-view]'); if(!btn)return;
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); render(btn.dataset.view);
  });
}

function metric(label,value,sub=''){return `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></div>`}

function dashboard(){
  const c=daysToCup();
  return `
    <section class="hero">
      <div><div class="kicker">The race that stops a nation</div><h2>2026 Melbourne Cup</h2><p>A single intelligence centre for every nominated horse, handicap development, order of entry, market move, Timeform rating, lead-up run, travel update, news item and race-day variable.</p></div>
      <div class="countdown">
        <div class="count-box"><div class="count-num">${c.days}</div><div class="count-label">Days</div></div>
        <div class="count-box"><div class="count-num">${c.hours}</div><div class="count-label">Hours</div></div>
        <div class="count-box"><div class="count-num">${c.mins}</div><div class="count-label">Minutes</div></div>
      </div>
    </section>
    <section class="metric-grid">
      ${metric('Nominations','Pending','Official nomination dataset next')}
      ${metric('Projected Field','24','Final field capacity')}
      ${metric('Current Favourite','Pending','Live market feed next')}
      ${metric('Top Weight','Pending','Official weights due 17 Sep')}
      ${metric('Order Cut Line','#24','Live qualification tracker')}
    </section>
    <section class="grid-two">
      <div class="panel"><h3>Projected Cup Field</h3><div class="panel-sub">This becomes the live 24-horse projection as official data is populated.</div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Country</th><th>Age</th><th>Weight</th><th>Market</th><th>Status</th></tr></thead><tbody>${nominations.map((r,i)=>`<tr><td>${i+1}</td><td class="horse">${r.horse}</td><td>${r.country}</td><td>${r.age}</td><td>${r.weight}</td><td>${r.market}</td><td><span class="tag gold">${r.status}</span></td></tr>`).join('')}</tbody></table></div></div>
      <div class="panel"><h3>Latest Cup Intelligence</h3><div class="panel-sub">News, stable comments, travel, injury, jockey and market updates.</div><div class="news-list">${latestNews.map(n=>`<article class="news-card"><div class="news-meta"><span>${n.time}</span><span>${n.source}</span></div><div class="news-title">${n.title}</div></article>`).join('')}</div></div>
    </section>`;
}

const descriptions = {
 nominations:['Nominations','Every nominated horse, status, connections, country, age/sex, qualification and Cup intent.'],
 horses:['Horse Profiles','A permanent dossier for every Cup candidate with form, ratings, suitability, news and movement history.'],
 weights:['Weights & Handicap','Predicted and official weights, penalties, benchmark logic and historical weight context.'],
 order:['Order of Entry','Live ballot/order ranking, exemptions, qualification clauses and the projected cut line.'],
 markets:['Markets','Current odds, price history, implied probability, moves, drifts and bookmaker/exchange snapshots.'],
 timeform:['Timeform','Your subscription ratings and rating history, stored from data you provide and integrated into horse profiles.'],
 form:['Form Guide','Complete recent form, race quality, weights, margins, going, distance and key performance notes.'],
 leadups:['Lead-up Tracker','Australian and international lead-up races, entries, results and implications for the Cup.'],
 international:['International Raiders','Travel, quarantine, intended prep, trainer comments and likelihood of making the trip.'],
 ratings:['Ratings & Rankings','Timeform, official ratings and Cup-specific comparative rankings.'],
 news:['News Centre','Horse-linked Melbourne Cup news and stable intelligence with source and timestamp.'],
 connections:['Jockeys & Trainers','Bookings, changes, Cup records and key stable/jockey statistics.'],
 history:['Historical Melbourne Cup','Past winners, weights, ages, barriers, SPs, lead-ups and long-run Cup benchmarks.'],
 analysis:['Race Analysis','Tempo, map, stamina, barriers, track/weather scenarios and runner-by-runner assessment.'],
 raceday:['Final Field / Race Day','Final 24, barriers, jockeys, weights, scratchings, weather, track, market and live race-day intelligence.']
};

function workspace(id){
 const [title,desc]=descriptions[id];
 return `<div class="section-header"><div><div class="kicker">Melbourne Cup 2026</div><h2>${title}</h2></div></div><div class="filters"><span class="filter active">All</span><span class="filter">Live</span><span class="filter">Tracked</span><span class="filter">Changed</span></div><div class="placeholder"><strong>${title} workspace created.</strong><br><br>${desc}<br><br>Data population and source integrations are the next build stage.</div>`;
}

function render(view='dashboard'){
  const label = navItems.find(x=>x[0]===view)?.[1] || 'Cup Dashboard';
  document.getElementById('page-title').textContent=label;
  document.getElementById('app-content').innerHTML=view==='dashboard'?dashboard():workspace(view);
}

document.getElementById('refresh-button').addEventListener('click',()=>render(document.querySelector('.nav button.active')?.dataset.view||'dashboard'));
renderNav(); render();
