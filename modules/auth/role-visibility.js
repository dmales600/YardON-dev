(function(){
'use strict';
if(window.YardivoRoleVisibility?.owner==='modules/auth/role-visibility.js')return;

const MATRIX={
  admin:null,
  manager:new Set(['homeMenu','dashboard','controlTower','aiOperations','analytics','myYard','suppliers','overview','dailyMap','weeklyMap']),
  inventory:new Set(['homeMenu','dashboard','controlTower','aiOperations','suppliers','orderSearch','announcements','supplierRequests','dailyMap','weeklyMap','overview','incidents','documentArchive','unannounced','epal','myYard','reports','settings']),
  reception:new Set(['homeMenu','aiOperations','receiving','dailyMap','weeklyMap','suppliers','myYard','operations','incidents','incidentArchive','documentArchive','settings','unannounced','epal','liveYard']),
  gate:new Set(['homeMenu','checkin','unannounced','myYard','docks']),
  supplier:new Set([])
};

const CARD_META={
  controlTower:['◉','Control Tower','Operativno stanje, kapaciteti i dolasci uživo.'],
  analytics:['⌁','Analytics','Trendovi, performanse prijama i iskorištenost rampi.'],
  myYard:['▥','My Yard','Pregled dvorišta, rampi i trenutnog stanja.'],
  checkin:['▤','Prijava dolaska','Prijavi i obradi dolazak kamiona na porti.'],
  docks:['▥','Rampe','Pregled zauzetosti i stanja rampi.'],
  unannounced:['⚠','Nenajavljeni dolasci','Pregled i obrada kamiona bez postojeće najave.'],
  epal:['▦','Stanje europaleta','Saldo EPAL paleta po dobavljaču i skladištu.']
};

function norm(v){
  v=String(v||'').toLowerCase().trim();
  if(v==='porta'||v==='portir')return'gate';
  if(v==='prijam')return'reception';
  if(v==='zalihe'||v.includes('zalih'))return'inventory';
  if(v==='management'||v==='voditelj')return'manager';
  if(v==='dobavljac'||v==='dobavljač')return'supplier';
  return v;
}
function role(){
  try{return norm(window.currentSession?.role||window.currentSession?.app_role||document.body.dataset.yardivoRole||'')}
  catch(_){return norm(document.body.dataset.yardivoRole||'')}
}
function allowed(r,v){
  if(r==='admin')return true;
  return !!MATRIX[r]?.has(String(v||''));
}
function show(el,kind){
  el.classList.remove('role-hidden');
  el.removeAttribute('hidden');
  el.removeAttribute('aria-hidden');
  el.removeAttribute('aria-disabled');
  el.style.removeProperty('visibility');
  el.style.removeProperty('opacity');
  el.style.removeProperty('pointer-events');
  el.style.setProperty('display',kind==='nav'?'flex':'block','important');
}
function hide(el){
  el.classList.add('role-hidden');
  el.setAttribute('aria-hidden','true');
  el.style.setProperty('display','none','important');
}
function ensureCard(target){
  const grid=document.getElementById('homeMenuGrid');
  if(!grid||grid.querySelector('[data-home-target="'+target+'"]'))return;
  const m=CARD_META[target];if(!m)return;
  const b=document.createElement('button');
  b.className='home-menu-card';
  b.type='button';
  b.dataset.homeTarget=target;
  b.dataset.yardivoRoleCard='1';
  b.innerHTML='<span class="icon">'+m[0]+'</span><h3>'+m[1]+'</h3><p>'+m[2]+'</p><small>OTVORI →</small>';
  grid.appendChild(b);
}
function ensureRoleCards(r){
  if(r==='manager'){
    ['controlTower','analytics','myYard'].forEach(ensureCard);
  }else if(r==='gate'){
    ['checkin','unannounced','myYard','docks'].forEach(ensureCard);
  }else if(r==='reception'||r==='inventory'||r==='admin'){
    ['epal'].forEach(ensureCard);
  }
}
function apply(){
  const r=role();if(!r||!Object.prototype.hasOwnProperty.call(MATRIX,r))return;
  document.body.dataset.yardivoRole=r;
  document.documentElement.dataset.yardivoRole=r;
  document.body.classList.remove('yardivo-role-switching');
  ensureRoleCards(r);

  document.querySelectorAll('.nav-btn[data-view]').forEach(el=>{
    allowed(r,el.dataset.view)?show(el,'nav'):hide(el);
  });
  document.querySelectorAll('#homeMenuGrid [data-home-target]').forEach(el=>{
    allowed(r,el.dataset.homeTarget)?show(el,'home'):hide(el);
  });

  if(r==='supplier'){
    document.querySelectorAll('.sidebar,.topbar,#homeMenu').forEach(el=>el.style.setProperty('display','none','important'));
  }else{
    document.querySelector('.topbar')?.style.removeProperty('display');
  }

  try{window.dispatchEvent(new CustomEvent('yardivo:role-ui-applied',{detail:{role:r}}))}catch(_){}
}
function schedule(){
  apply();
  setTimeout(apply,80);
  setTimeout(apply,350);
  setTimeout(apply,1200);
}
window.addEventListener('yardivo:login',schedule);
window.addEventListener('yardivo:data-synced',()=>setTimeout(apply,40));
window.addEventListener('yardivo:master-data-ready',()=>setTimeout(apply,40));
document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,250),{once:true});
window.addEventListener('load',()=>setTimeout(apply,900),{once:true});
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view],[data-home-target]'))setTimeout(apply,0);
},true);

/* Legacy modules may append role cards after login. Re-apply only on structural
   changes; no polling and no attribute-observer feedback loop. */
function observeLateRoleUi(){
  const roots=[document.querySelector('.nav'),document.getElementById('homeMenuGrid')].filter(Boolean);
  roots.forEach(root=>{
    const observer=new MutationObserver(()=>setTimeout(apply,0));
    observer.observe(root,{childList:true,subtree:true});
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeLateRoleUi,{once:true});
else observeLateRoleUi();

window.YardivoRoleVisibility={owner:'modules/auth/role-visibility.js',apply,matrix:MATRIX,allowed:(v)=>allowed(role(),v)};
})();