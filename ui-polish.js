// Desktop-software presentation layer. No racing data is mutated here.
(function(){
  const nav=document.getElementById('nav');
  if(!nav)return;

  // Silks are integrated throughout Nominations and Horse Profiles; no separate Silks & Colours workspace tab.
  nav.querySelector('button[data-view="silks"]')?.remove();

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

  function installReferenceToggle(){
    const secondary=['connections','history'];
    secondary.forEach(id=>nav.querySelector(`button[data-view="${id}"]`)?.classList.add('nav-secondary'));
    if(nav.querySelector('.nav-more-toggle'))return;
    const anchor=nav.querySelector('button[data-view="connections"]');
    if(!anchor)return;
    const toggle=document.createElement('button');
    toggle.type='button';toggle.className='nav-more-toggle';toggle.textContent='More Reference';toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click',()=>{
      const open=nav.classList.toggle('show-secondary');
      toggle.textContent=open?'Hide Reference':'More Reference';
      toggle.setAttribute('aria-expanded',String(open));
    });
    anchor.before(toggle);
  }

  decorateNav();
  installReferenceToggle();

  const title=document.querySelector('.brand-subtitle');
  if(title)title.textContent='PRO RACING WORKSPACE · 2026';

  const refresh=document.getElementById('refresh-button');
  if(refresh){refresh.textContent='Sync';refresh.title='Reload the latest Hub data';}
  const main=document.querySelector('.main');if(main)main.setAttribute('role','main');
})();
