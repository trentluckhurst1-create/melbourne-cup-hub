let trainerBaseData=null;
let trainerBasePromise=null;

function loadTrainerBases(){
  if(trainerBasePromise) return trainerBasePromise;
  trainerBasePromise=fetch('./data/trainers/2026-09-13-bases.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(d=>{trainerBaseData=d;return d;})
    .catch(()=>null);
  return trainerBasePromise;
}

function trainerRecord(name){return (trainerBaseData?.trainers??[]).find(x=>x.trainer===name)??null;}

function trainerBasesView(){
  const rows=trainerBaseData?.trainers??[];
  const intl=rows.filter(x=>x.country!=='Australia'&&x.country!=='New Zealand').length;
  const multi=rows.filter(x=>(x.otherBases||[]).length>0).length;
  return `<div class="section-header"><div><div class="kicker">Stable Geography · Snapshot 13 September 2026</div><h2>Jockeys & Trainers</h2><div class="section-copy">Trainer base means the location of the training operation. It is deliberately kept separate from each horse's current preparation base.</div></div></div>
  <section class="metric-grid">
    ${metric('Cup Trainers',rows.length,'Unique nominated trainers / partnerships')}
    ${metric('International',intl,'Ireland · UK · Japan · USA')}
    ${metric('Multi-base',multi,'Operations with more than one yard')}
    ${metric('Horse Base','Separate','Horse-specific current location')}
    ${metric('Snapshot','13 Sep','Date-stamped trainer geography')}
  </section>
  <div class="toolbar"><input id="trainer-search" class="search" type="search" placeholder="Search trainer, location or country…"><div class="filters"><button class="filter active" data-trainer-filter="all">All</button><button class="filter" data-trainer-filter="Australia">Australia</button><button class="filter" data-trainer-filter="International">International</button><button class="filter" data-trainer-filter="multi">Multi-base</button></div></div>
  <div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Trainer</th><th>Country</th><th>Primary training base</th><th>Other bases</th><th>Verification</th></tr></thead><tbody id="trainer-body"></tbody></table></div></div>`;
}

function paintTrainerBases(filter='all',query=''){
  const root=document.getElementById('trainer-body'); if(!root)return;
  const q=query.trim().toLowerCase();
  const rows=(trainerBaseData?.trainers??[]).filter(x=>{
    const isIntl=x.country!=='Australia'&&x.country!=='New Zealand';
    const pass=filter==='all'||x.country===filter||(filter==='International'&&isIntl)||(filter==='multi'&&(x.otherBases||[]).length>0);
    const text=`${x.trainer} ${x.country} ${x.primaryBase} ${(x.otherBases||[]).join(' ')}`.toLowerCase();
    return pass&&(!q||text.includes(q));
  });
  root.innerHTML=rows.map(x=>`<tr><td class="horse">${x.trainer}</td><td>${x.country}</td><td>${x.primaryBase}</td><td class="wrap-cell">${(x.otherBases||[]).length?x.otherBases.join(' · '):'—'}</td><td><span class="tag green">${x.verification}</span></td></tr>`).join('');
}

function bindTrainerBases(){
  let active='all'; const search=document.getElementById('trainer-search');
  document.querySelectorAll('[data-trainer-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-trainer-filter]').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); active=btn.dataset.trainerFilter; paintTrainerBases(active,search?.value||'');
  }));
  search?.addEventListener('input',()=>paintTrainerBases(active,search.value)); paintTrainerBases();
}

const trainerHorseDetailBase=horseDetailView;
horseDetailView=function(name){
  const html=trainerHorseDetailBase(name);
  const h=horseByName(name); if(!h)return html;
  const tr=trainerRecord(h.trainer); if(!tr)return html;
  const extra=`<section class="panel profile-section trainer-operation"><div class="panel-head"><div><h3>Trainer Operation</h3><div class="panel-sub">Stable geography is separate from this horse's current preparation base.</div></div></div><div class="profile-list"><div><span>Trainer</span><strong>${tr.trainer}</strong></div><div><span>Primary base</span><strong>${tr.primaryBase}</strong></div><div><span>Other bases</span><strong>${(tr.otherBases||[]).length?tr.otherBases.join(' · '):'—'}</strong></div><div><span>Horse current base</span><strong>${currentBase(name)}</strong></div><div><span>Verification</span><strong>${tr.verification}</strong></div></div></section>`;
  return html+extra;
};

const trainerRenderBase=render;
render=function(view='dashboard'){
  if(view==='connections'){
    document.getElementById('page-title').textContent='Jockeys & Trainers';
    const root=document.getElementById('app-content');
    if(!trainerBaseData){root.innerHTML='<div class="placeholder">Loading trainer base registry…</div>';loadTrainerBases().then(()=>render('connections'));return;}
    root.innerHTML=trainerBasesView(); bindTrainerBases(); return;
  }
  trainerRenderBase(view);
};

loadTrainerBases();
