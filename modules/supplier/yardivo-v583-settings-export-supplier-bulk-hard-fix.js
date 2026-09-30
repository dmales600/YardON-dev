(function(){
'use strict';
if(window.__YARDIVO_SETTINGS_EXPORT_SUPPLIER_HARD_FIX__)return;
window.__YARDIVO_SETTINGS_EXPORT_SUPPLIER_HARD_FIX__=true;

const CATS=['general','qr','calendar','admin','danger'];
let selectedCategory='general';
let busySupplierDelete=false;
let settleObserver=null,settleTimer=0,settleMax=0;

function normRole(r){r=String(r||'').toLowerCase().trim();if(r==='porta'||r==='portir')return'gate';if(r==='prijam')return'reception';if(r==='zalihe'||r.includes('zalih'))return'inventory';return r}
function currentRole(){try{return normRole(window.currentSession?.app_role||window.currentSession?.role||currentSession?.role)}catch(_){return''}}
function isAdmin(){return currentRole()==='admin'}
function settings(){return document.getElementById('settings')}
function grid(){return settings()?.querySelector('.settings-grid')||null}
function settingsActive(){const s=settings();return !!s&&(s.classList.contains('active')||getComputedStyle(s).display!=='none')}
function normText(v){return String(v||'').replace(/\s+/g,' ').trim().toUpperCase()}

function ensureStyle(){
 if(document.getElementById('yardonAdminSettingsCss'))return;
 const l=document.createElement('link');l.id='yardonAdminSettingsCss';l.rel='stylesheet';l.href='styles/yardon-admin-settings-v1.css?v=20260930-1';document.head.appendChild(l);
}
function categoryOf(panel){
 const id=String(panel?.id||'').toLowerCase(),title=normText(panel?.querySelector?.('h1,h2,h3')?.textContent||panel?.textContent||'');
 if(panel?.dataset?.yardonLegacyDuplicate==='1')return'hidden';
 if(panel?.classList?.contains('danger-zone')||/OPASNA ZONA|OBRIŠI SVE PODATKE|RESET BAZE/.test(title))return'danger';
 if(id==='yardivoqrroleadminv586'||/\bQR\b|SCANNER|SKENER|MOBILNO|MOBILE/.test(title))return'qr';
 if(id==='yardivononworkingdayssettings'||/NERADNI|BLAGDAN|KALENDAR/.test(title))return'calendar';
 if(id==='masteruseradmin'||/KORISNICI|PROFILI NA SERVERU|PRISTUP|AUTENTIK|AUTH|DOBAVLJAČKI RAČUN|DOBAVLJACKI RACUN/.test(title))return'admin';
 if(/MASTER PODACI|LOKACIJE \/ SKLADIŠTA|UPRAVLJANJE RAMPAMA|BROJ RAMPI|KAPACITET.*SKLADIŠTA/.test(title))return'master';
 return'general';
}
function allowed(cat){const r=currentRole();if(!r||r==='admin')return true;if(r==='reception')return['qr','calendar','general'].includes(cat);if(r==='inventory')return['calendar','general'].includes(cat);return cat==='general'}

function ensureHead(){
 const s=settings();if(!s)return null;
 let h=document.getElementById('yardonAdminControlHead');
 if(!h){
   h=document.createElement('div');h.id='yardonAdminControlHead';
   h.innerHTML=`<div><div class="yac-kicker">YARDON ADMINISTRATION</div><h2>Admin Control Center</h2><p>Postavke sustava su odvojene od Master podataka. Promjene se prikazuju stabilno, bez ponovnog crtanja cijelog ekrana.</p></div><div class="yac-actions"><span class="yac-state"><i></i> STABILNI PRIKAZ</span><button class="yac-master-btn" type="button" data-yac-master-open>MASTER PODACI</button></div>`;
   const title=s.querySelector('.section-title');title?.insertAdjacentElement('afterend',h);
 }
 return h;
}
function ensureNav(){
 const s=settings();if(!s)return null;
 let n=document.getElementById('yardivoSettingsTabsFinal');
 if(!n){n=document.createElement('div');n.id='yardivoSettingsTabsFinal';(ensureHead()||s.querySelector('.section-title'))?.insertAdjacentElement('afterend',n)}
 const labels={general:'SUSTAV',qr:'QR · PORTA · PRIJAM',calendar:'KALENDAR',admin:'KORISNICI & PRISTUP',danger:'OPASNA ZONA'};
 const sig=CATS.map(c=>c+':'+labels[c]).join('|');
 if(n.dataset.sig!==sig){n.dataset.sig=sig;n.innerHTML=CATS.map(c=>`<button type="button" data-settings-tab="${c}">${labels[c]}</button>`).join('')}
 return n;
}
function openMaster(){
 const b=document.getElementById('yardivoMasterPopupLaunchV583');
 if(b){b.click();return}
 try{window.YardivoMasterPopupOnlyV583?.refresh?.()}catch(_){}
 try{window.YardivoStableMasterV583?.render?.(true)}catch(_){}
 const target=document.getElementById('yardivoStableMasterEditorV583')||document.getElementById('yardivoSettingsMasterPaneV583');
 target?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function directPanels(){const g=grid();return g?[...g.children].filter(x=>x.nodeType===1):[]}
function retireLegacyDuplicates(){
 const canonical=document.getElementById('yardivoQrRoleAdminV586');
 if(canonical){
   ['qrMobileSettingsPanel','yardivoQrWarehouseAdminPanelV584'].forEach(id=>{const x=document.getElementById(id);if(x){x.dataset.yardonLegacyDuplicate='1';x.hidden=true;x.style.setProperty('display','none','important')}});
 }
}
function classify(){
 retireLegacyDuplicates();
 const ps=directPanels();
 ps.forEach(p=>{const cat=categoryOf(p);p.dataset.settingsFinalCategory=cat;p.classList.add('yardivo-settings-section');if(cat==='master'||cat==='hidden'){p.hidden=true;p.classList.add('yardivo-settings-tab-hidden')}});
 return ps;
}
function show(cat){
 if(!CATS.includes(cat))cat='general';selectedCategory=cat;
 const s=settings();if(!s)return;
 ensureHead();ensureNav();
 const ps=classify();
 ps.forEach(p=>{
   const pc=categoryOf(p),yes=pc===cat&&allowed(cat);
   p.hidden=!yes;p.classList.toggle('yardivo-settings-tab-hidden',!yes);p.classList.toggle('yardivo-settings-tab-visible',yes);
   if(yes){p.removeAttribute('aria-hidden');p.style.removeProperty('display')}else p.setAttribute('aria-hidden','true');
 });
 s.querySelectorAll('#yardivoSettingsTabsFinal [data-settings-tab]').forEach(b=>{const on=b.dataset.settingsTab===cat;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
 if(cat==='admin')setTimeout(installBulkActions,0);
}
function organize(){
 ensureStyle();ensureHead();ensureNav();
 try{window.YardivoAdminCleanupV8?.apply?.()}catch(_){}
 show(selectedCategory);
}

function finishStabilize(){
 clearTimeout(settleTimer);clearTimeout(settleMax);settleObserver?.disconnect();settleObserver=null;
 organize();
 const s=settings();if(s){s.classList.remove('yardon-settings-stabilizing');s.classList.add('yardon-settings-ready')}
}
function beginStabilize(){
 const s=settings(),g=grid();if(!s||!g)return;
 ensureStyle();ensureHead();ensureNav();
 s.classList.add('yardon-settings-stabilizing');s.classList.remove('yardon-settings-ready');
 settleObserver?.disconnect();
 const quiet=()=>{clearTimeout(settleTimer);settleTimer=setTimeout(finishStabilize,180)};
 settleObserver=new MutationObserver(quiet);settleObserver.observe(g,{childList:true,subtree:false});
 quiet();clearTimeout(settleMax);settleMax=setTimeout(finishStabilize,650);
}

function tabButton(e){return e.target?.closest?.('#settings #yardivoSettingsTabsFinal [data-settings-tab]')||null}
document.addEventListener('click',e=>{
 const tab=tabButton(e);if(tab){e.preventDefault();show(tab.dataset.settingsTab);return}
 if(e.target?.closest?.('#yardonAdminControlHead [data-yac-master-open]')){e.preventDefault();openMaster();return}
 if(e.target?.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings'))setTimeout(beginStabilize,0);
},true);
document.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const tab=tabButton(e);if(tab){e.preventDefault();show(tab.dataset.settingsTab)}} ,true);
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')beginStabilize()});
window.addEventListener('yardivo:login',()=>setTimeout(()=>{if(settingsActive())beginStabilize();else organize()},180));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(organize,250),{once:true});else setTimeout(organize,120);

/* ---------- Bulk supplier/user actions ---------- */
async function invokeUsers(action,payload){
 const api=window.YardivoAdminUsersServerV583;if(api?.invoke)return api.invoke(action,payload||{});
 const c=await window.YardivoAuth.client();const {data,error}=await c.functions.invoke('yardivo-admin-users',{body:{action,...payload}});if(error)throw error;if(data?.error)throw new Error(data.error);return data?.data??data??{};
}
async function listUsers(){const r=await invokeUsers('list',{});return Array.isArray(r)?r:(Array.isArray(r?.users)?r.users:[])}
function installBulkActions(){
 if(!isAdmin())return;const panel=document.getElementById('masterUserAdmin');if(!panel)return;
 let box=document.getElementById('yardivoBulkAdminActionsV583');
 if(!box){box=document.createElement('div');box.id='yardivoBulkAdminActionsV583';box.className='yardivo-bulk-admin-actions';box.innerHTML='<button type="button" class="action danger" id="yardivoBulkUsersMirror">BRIŠI SVE KORISNIKE (OSIM ADMINA)</button><button type="button" class="action danger" id="yardivoDeleteAllSuppliers">BRIŠI SVE DOBAVLJAČE</button><span style="font-size:8px;color:#8299aa">Masovne radnje nad stvarnim server profilima.</span>';(panel.querySelector('.master-settings-body,.panel-body')||panel).prepend(box)}
 const users=document.getElementById('yardivoBulkUsersMirror');if(users&&!users.dataset.bound){users.dataset.bound='1';users.onclick=()=>{const real=document.getElementById('yardivoDeleteAllNonAdminUsers');if(real)real.click();else alert('Lista korisnika još nije učitana sa servera.')}}
 const suppliers=document.getElementById('yardivoDeleteAllSuppliers');if(suppliers&&!suppliers.dataset.bound){suppliers.dataset.bound='1';suppliers.onclick=deleteAllSuppliers}
}
async function deleteAllSuppliers(){
 if(busySupplierDelete||!isAdmin())return;busySupplierDelete=true;const btn=document.getElementById('yardivoDeleteAllSuppliers');if(btn)btn.disabled=true;
 try{
   const users=await listUsers(),rows=users.filter(u=>normRole(u?.app_role)==='supplier'&&u?.auth_user_id);
   if(!rows.length){alert('Nema dobavljača za brisanje.');return}
   if(!confirm(`TRAJNO OBRISATI SVE DOBAVLJAČE (${rows.length})?`))return;
   const typed=prompt('Za konačnu potvrdu upiši: BRISI SVE DOBAVLJACE');if(typed===null)return;
   const n=String(typed).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(n!=='BRISI SVE DOBAVLJACE')return alert('Brisanje nije izvršeno.');
   let deleted=0,failed=[];for(const u of rows){try{await invokeUsers('delete',{auth_user_id:u.auth_user_id});deleted++}catch(err){failed.push(`${u.username||u.auth_user_id}: ${err?.message||err}`)}}
   try{await window.YardivoAdminUsersServerV583?.render?.()}catch(_){}
   try{window.YardivoSeparatedUserListsV583?.refresh?.()}catch(_){}
   if(failed.length)alert(`Obrisano: ${deleted}. Neuspjelo: ${failed.length}.\n${failed.join('\n')}`);else window.showYmsToast?.('success','DOBAVLJAČI OBRISANI',`Obrisano ${deleted} dobavljača.`);
 }catch(err){alert('Brisanje svih dobavljača nije uspjelo: '+(err?.message||err))}finally{busySupplierDelete=false;if(btn)btn.disabled=false}
}

window.YardivoSettingsHardFixV583={show,refresh:organize,stabilize:beginStabilize,deleteAllSuppliers,category:()=>selectedCategory};
})();
