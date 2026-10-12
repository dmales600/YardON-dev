(function(){
'use strict';
if(window.YardOnTMSDispatcher?.version)return;
const PAGES=[
 ['tmsControl','◉','Transport Control Tower','Operativni pregled transporta i outbounda'],
 ['tmsZones','◈','Zonska karta Hrvatske','Trgovine i palete po operativnoj zoni'],
 ['tmsRoutes','⇢','Planiranje tura','Rute, trgovine i dodjela prijevoznika'],
 ['tmsDock','▥','Outbound Dock Manager','Raspoloživost rampi za utovar'],
 ['tmsLoads','▣','Utovari i palete','Mobilni utovari i kontrola paleta'],
 ['tmsTracking','◎','Praćenje kamiona','Lokacija i operativni status putovanja'],
 ['tmsHistory','◷','Povijest otprema','Završene otpreme i zapis događaja']
];
const ZONES=['Zagreb i okolica','Sjever','Slavonija','Istra i Primorje','Dalmacija'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=id=>PAGES.find(x=>x[0]===id)?.[2]||'YARD ON TMS';
function empty(heading,description){
 return '<div class="tms-empty"><span aria-hidden="true">▤</span><strong>'+esc(heading)+'</strong><p>'+esc(description)+'</p></div>';
}
function sourceNote(){
 return '<div class="tms-source"><span class="tms-source-dot"></span> STVARNI PODACI · Bez demonstracijskih zapisa. Nema automatskog kreiranja otpreme.</div>';
}
function panel(h,inside){
 return '<div class="tms-panel"><h3>'+h+'</h3>'+inside+'</div>';
}
function link(label,id){return '<button type="button" class="tms-jump" data-tms-go="'+id+'">'+esc(label)+' →</button>'}
function content(id){
 if(id==='tmsControl')return [
 '<div class="tms-metrics">'+[['0','Aktivne ture'],['0','Na utovaru'],['0','Spremno za izlaz'],['0','Kašnjenja']].map(([n,l])=>'<div class="tms-metric"><small>'+l+'</small><strong>'+n+'</strong></div>').join('')+'</div>',
 '<div class="tms-layout">'+panel('Aktivni transporti',empty('Još nema outbound naloga','Otpreme će se prikazivati nakon uključenja TMS podatkovnog modula.')+link('Planiranje tura','tmsRoutes'))+
 panel('Dispatcher zadaci',[
  '<div class="tms-task">01 <strong>Planiraj transport</strong><small>Zona, trgovine i palete</small></div>',
  '<div class="tms-task">02 <strong>Dodijeli dock</strong><small>Provjera inbound/outbound zauzetosti</small></div>',
  '<div class="tms-task">03 <strong>Prati utovar</strong><small>Mobilni Outbound</small></div>',
  '<div class="tms-task">04 <strong>Predaj Porti</strong><small>Izlaz nakon provjere</small></div>'
 ].join(''))+'</div>',
 sourceNote()
 ].join('');
 if(id==='tmsZones')return '<div class="tms-layout">'+panel('Zone Hrvatske',
   '<p class="tms-muted">Odaberi zonu za filtriranje budućih trgovina, ruta i paleta. Nazivi su početna konfiguracija; granice i trgovine treba povezati s Master podacima.</p>'+
   '<div class="tms-zones">'+ZONES.map((z,i)=>'<button type="button" class="tms-zone'+(i===0?' is-selected':'')+'" data-tms-zone="'+esc(z)+'">'+esc(z)+'</button>').join('')+'</div>')+
 panel('Odabrana zona', '<div class="tms-zone-label" id="tmsSelectedZone">'+esc(ZONES[0])+'</div><div class="tms-metrics compact"><div class="tms-metric"><small>Trgovine</small><strong>0</strong></div><div class="tms-metric"><small>Palete</small><strong>0</strong></div></div>'+empty('Nema povezanih trgovina','Povezivanje paleta i trgovina zahtijeva TMS podatkovni model ili WMS/CSV uvoz.'))+'</div>'+sourceNote();
 if(id==='tmsRoutes')return '<div class="tms-layout">'+panel('Planiranje tura',empty('Nema kreiranih tura','Unos odredišta, trgovina i prijevoznika bit će uključen uz TMS tablice i autorizirani backend.'))+panel('Postupak','<div class="tms-task">1. Odaberi zonu i trgovine</div><div class="tms-task">2. Dodijeli palete kamionu</div><div class="tms-task">3. SMART prijedlog termina i rampe</div><div class="tms-task">4. Potvrda dispečera</div>'+link('Pregled zona','tmsZones'))+'</div>'+sourceNote();
 if(id==='tmsDock')return '<div class="tms-layout">'+panel('Outbound Dock Manager',empty('Zajednička dostupnost rampi','Rezervacije će se čitati iz istog sustava zauzeća kao Inbound. Nema izmišljenih slobodnih dockova.')+link('Pregled tura','tmsRoutes'))+
 panel('Pravila dockova','<div class="tms-task">Inbound i Outbound dijele fizičku rampu</div><div class="tms-task">Prijedlog SMART-a nije rezervacija</div><div class="tms-task">Rampa se oslobađa napuštanjem docka</div><div class="tms-task">Fizičko premještanje potvrđuje operater</div>')+'</div>'+sourceNote();
 if(id==='tmsLoads')return '<div class="tms-layout">'+panel('Utovari i palete',empty('Nema aktivnih utovara','Nakon povezivanja Outbound naloga ovdje će se prikazati stvarni utovari i stanje skeniranih paleta.'))+
 panel('Mobilni Outbound','<div class="tms-task">▣ Veliki gumbi za utovar na mobitelu</div><div class="tms-task">▣ Skeniranje SSCC / QR paleta</div><div class="tms-task">▣ Potvrda završetka utovara</div><div class="tms-task">▣ Predaja kamiona Porti</div>')+'</div>'+sourceNote();
 if(id==='tmsTracking')return panel('Praćenje kamiona',empty('GPS još nije aktivan','Lokaciju će vozač dijeliti uz privolu; ne prikazujemo lažne podatke ili predviđeno vrijeme dolaska.'))+sourceNote();
 return panel('Povijest otprema',empty('Nema evidentiranih otprema','Povijest će se puniti tek nakon stvarnih događaja utovara i izlaza, s korisnikom i vremenom promjene.'))+sourceNote();
}
function mount(){
 const nav=document.querySelector('.sidebar .nav');
 const home=document.getElementById('homeMenuGrid');
 const main=document.querySelector('main.main');
 if(!nav||!main)return false;
 let anchor=nav.querySelector('[data-view="dailyMap"]');
 for(const [id,icon,name,desc] of PAGES){
   if(!nav.querySelector('[data-view="'+id+'"]')){
     const btn=document.createElement('button');btn.className='nav-btn tms-nav';btn.dataset.view=id;btn.type='button';
     const span=document.createElement('span');span.textContent=icon;btn.append(span,document.createTextNode(' '+name));
     if(anchor)anchor.before(btn);else nav.appendChild(btn);
   }
   if(home&&!home.querySelector('[data-home-target="'+id+'"]')){
     const b=document.createElement('button');b.className='home-menu-card tms-home';b.dataset.homeTarget=id;b.type='button';
     b.innerHTML='<span class="icon">'+icon+'</span><h3>'+esc(name)+'</h3><p>'+esc(desc)+'</p><small>OTVORI →</small>';
     home.appendChild(b);
   }
   if(!document.getElementById(id)){
     const view=document.createElement('section');view.className='view tms-view';view.id=id;view.setAttribute('aria-hidden','true');
     view.innerHTML='<div class="tms-wrap"><header class="tms-header"><div><span class="tms-eyebrow">YARD ON TMS / DISPATCHER</span><h1>'+esc(name)+'</h1><p>'+esc(desc)+'</p></div><span class="tms-indicator">TMS · TESTNI PRIKAZ</span></header>'+content(id)+'</div>';
     main.appendChild(view);
   }
 }
 window.YardivoRoleVisibility?.apply?.();
 return true;
}
document.addEventListener('click',e=>{
 const zone=e.target.closest?.('[data-tms-zone]');
 if(zone&&zone.closest('#tmsZones')){
   const view=document.getElementById('tmsZones');
   view?.querySelectorAll('[data-tms-zone]').forEach(b=>b.classList.toggle('is-selected',b===zone));
   const selected=document.getElementById('tmsSelectedZone');if(selected&&selected.textContent!==zone.dataset.tmsZone)selected.textContent=zone.dataset.tmsZone;
   return;
 }
 const jump=e.target.closest?.('[data-tms-go]');
 if(jump){const id=jump.dataset.tmsGo;if(!PAGES.some(x=>x[0]===id))return;
  window.YardivoRoleStableFinal?.open?.(id);
 }
});
window.addEventListener('yardivo:login',()=>{mount();if(String(window.currentSession?.role||'').toLowerCase()==='dispatcher')window.YardivoRoleStableFinal?.open?.('tmsControl')});
window.addEventListener('yardivo:view-opened',e=>{
 const id=e?.detail?.view||'';if(!id.startsWith('tms'))return;
 const heading=document.getElementById('pageTitle');if(heading&&heading.textContent!==title(id))heading.textContent=title(id);
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
window.YardOnTMSDispatcher={version:'1.0.0',pages:PAGES.map(x=>x[0]),mount};
})();