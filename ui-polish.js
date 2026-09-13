// Desktop-software presentation layer. No racing data is mutated here.
(function(){
  const nav=document.getElementById('nav');
  if(!nav)return;

  if(!nav.querySelector('button[data-view="silks"]')){
    const horses=nav.querySelector('button[data-view="horses"]');
    if(horses){
      const btn=document.createElement('button');btn.dataset.view='silks';btn.textContent='Silks & Colours';
      btn.addEventListener('click',()=>{document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentView='silks';selectedHorse=null;render('silks');});
      horses.after(btn);
    }
  }

  const groups=[
    {before:'dashboard',label:'Workspace'},
    {before:'weights',label:'Cup Intelligence'},
    {before:'timeform',label:'Performance'},
    {before:'news',label:'Research'},
    {before:'raceday',label:'Race Day'}
  ];

  function decorateNav(){
    nav.querySelectorAll('.nav-section-label').forEach(x=>x.remove());
    groups.forEach(g=>{
      const target=nav.querySelector(`button[data-view="${g.before}"]`);
      if(!target)return;
      const label=document.createElement('div');
      label.className='nav-section-label';
      label.textContent=g.label;
      target.before(label);
    });
  }

  decorateNav();

  const title=document.querySelector('.brand-subtitle');
  if(title)title.textContent='PRO RACING WORKSPACE · 2026';

  const refresh=document.getElementById('refresh-button');
  if(refresh){refresh.textContent='Sync';refresh.title='Reload the latest Hub data';}
  const main=document.querySelector('.main');if(main)main.setAttribute('role','main');
})();
