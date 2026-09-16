let trainerBaseData=null;
let trainerBasePromise=null;

function loadTrainerBases(){
  if(trainerBasePromise) return trainerBasePromise;
  trainerBasePromise=fetch('./data/trainers/2026-09-13-bases.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{trainerBaseData=d;return d;}).catch(()=>null);
  return trainerBasePromise;
}
function trainerRecord(name){return (trainerBaseData?.trainers??[]).find(x=>x.trainer===name)??null;}
function trainerBasesView(){
  const rows=trainerBaseData?.trainers??[];
  return `<div class="section-header"><div><div class="kicker">MELBOURNE CUP CONNECTIONS</div><h2>Jockeys & Trainers</h2></div></div>
  <div class="toolbar"><input id="trainer-search" class="search" type="search" placeholder="Search trainer, base or country…"><div class="filters"><button class="filter active" data-trainer-filter="all">All</button><button class="filter" data-trainer-filter="Australia">Australia</button><button class="filter" data-trainer-filter="International">International</button></div></div>
  <div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Trainer</th><th>Country</th><th>Primary Training Base</th></tr></thead><tbody id="trainer-body"></tbody></table></div></div>`;
}
function paintTrainerBases(filter='all',query=''){
  const root=document.getElementById('trainer-body');if(!root)return;const q=query.trim().toLowerCase();
  const rows=(trainerBaseData?.trainers??[]).filter(x=>{const intl=x.country!=='Australia'&&x.country!=='New Zealand';const pass=filter==='all'||x.country===filter||(filter==='International'&&intl);return pass&&(!q||`${x.trainer} ${x.country} ${x.primaryBase}`.toLowerCase().includes(q));});
  root.innerHTML=rows.map(x=>`<tr><td class="horse">${x.trainer}</td><td>${x.country}</td><td>${x.primaryBase||'—'}</td></tr>`).join('');
}
function bindTrainerBases(){let active='all';const search=document.getElementById('trainer-search');document.querySelectorAll('[data-trainer-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-trainer-filter]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');active=btn.dataset.trainerFilter;paintTrainerBases(active,search?.value||'');}));search?.addEventListener('input',()=>paintTrainerBases(active,search.value));paintTrainerBases();}
const trainerHorseDetailBase=horseDetailView;
horseDetailView=function(name){const html=trainerHorseDetailBase(name),h=horseByName(name);if(!h)return html;const tr=trainerRecord(h.trainer);if(!tr)return html;return html+`<section class="panel profile-section trainer-operation"><div class="panel-head"><div><h3>Trainer</h3></div></div><div class="profile-list"><div><span>Trainer</span><strong>${tr.trainer}</strong></div><div><span>Primary training base</span><strong>${tr.primaryBase||'—'}</strong></div></div></section>`;};
const trainerRenderBase=render;
render=function(view='dashboard'){if(view==='connections'){document.getElementById('page-title').textContent='Jockeys & Trainers';const root=document.getElementById('app-content');if(!trainerBaseData){root.innerHTML='<div class="placeholder">Loading trainer registry…</div>';loadTrainerBases().then(()=>render('connections'));return;}root.innerHTML=trainerBasesView();bindTrainerBases();return;}trainerRenderBase(view);};
loadTrainerBases();