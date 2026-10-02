(function(){
'use strict';
if(window.__YARDIVO_SETTINGS_EXPORT_SUPPLIER_HARD_FIX__)return;
window.__YARDIVO_SETTINGS_EXPORT_SUPPLIER_HARD_FIX__=true;

const SECTIONS=['master','account','yardon'];
const META={
 master:{label:'MASTER POSTAVKE',title:'Master postavke',copy:'Temeljni podaci koji upravljaju operativnim radom: lokacije, skladišta, rampe, radno vrijeme, kapaciteti, dobavljači, odgovorne osobe i pravila kašnjenja.'},
 account:{label:'ACCOUNT POSTAVKE',title:'Account postavke',copy:'Korisnički računi, dodavanje i uređivanje korisnika, role, pristupi, lozinke i povezani server profili.'},
 yardon:{label:'YARDON POSTAVKE',title:'YardOn postavke',copy:'QR kodovi, AI glas i zvuk, Smart Assist, AI upravljanje, prikaz i ostale sistemske postavke YardOna.'}
};
let selected='master';
let reconcileTimer=0;
let busySupplierDelete=false;

function normRole(r){r=String(r||'').toLowerCase().trim();if(r==='porta'||r==='portir')return'gate';if(r==='prijam')return'reception';if(r==='zalihe'||r.includes('zalih'))return'inventory';return r}
function currentRole(){try{return normRole(window.currentSession?.app_role||window.currentSession?.role||currentSession?.role)}catch(_){return''}}
function isAdmin(){return currentRole()==='admin'}
function settings(){return document.getElementById('settings')}
function grid(){return settings()?.querySelector('.settings-grid')||null}
function settingsActive(){const s=settings();return !!s&&(s.classList.contains('active')||getComputedStyle(s).display!=='none')}
function normText(v){return String(v||'').replace(/\s+/g,' ').trim().toUpperCase()}

function ensureStyle(){
 let l=document.getElementById('yardonAdminSettingsCss');
 if(!l){l=document.createElement('link');l.id='yardonAdminSettingsCss';l.rel='stylesheet';document.head.appendChild(l)}
 const href='styles/yardon-admin-settings-v1.css?v=20261002-admin4';
 if(l.getAttribute('href')!==href)l.setAttribute('href',href);
}

function ensureQr(){try{window.YardivoQrRoleControlV586?.render?.()}catch(_){} }
function ensureMaster(){
 try{window.YardivoMasterPopupOnlyV583?.refresh?.()}catch(_){}
 try{window.YardivoStableMasterV583?.render?.(true)}catch(_){}
 try{window.YardivoMasterDataV583?.refresh?.()}catch(_){}
 try{window.YardivoResponsiblePersonInventoryAuthorityV583?.refresh?.()}catch(_){}
}
function ensureAccount(){
 try{window.YardivoV545UserAdmin?.refresh?.()}catch(_){}
 try{window.YardivoAdminUsersServerV583?.render?.()}catch(_){}
 try{window.YardivoSeparatedUserListsV583?.refresh?.()}catch(_){}
 try{window.YardivoSupplierAccountAdminV52?.refresh?.()}catch(_){}
}

function mountSettingsGrid(shell){
 const s=settings(),mount=shell?.querySelector?.('#yardonAdminSettingsMount');if(!s||!mount)return;
 const g=s.querySelector('.settings-grid');
 if(g&&g.parentElement!==mount)mount.appendChild(g);
}

function ensureShell(){
 const s=settings();if(!s)return null;
 let shell=document.getElementById('yardonAdminSettingsShell');
 if(!shell){
  shell=document.createElement('div');shell.id='yardonAdminSettingsShell';
  shell.innerHTML=`<aside class="yas-sidebar"><div class="yas-brand"><small>YARDON ADMIN</small><strong>POSTAVKE</strong></div><nav>${SECTIONS.map(k=>`<button type="button" data-yas-section="${k}"><span>${META[k].label}</span></button>`).join('')}</nav></aside><main class="yas-main"><header id="yardonSettingsCategoryHead"><div><h3></h3><p></p></div><span class="yac-count"></span></header><div id="yardonAdminSettingsMount"></div></main>`;
  const title=s.querySelector('.section-title');
  if(title)title.insertAdjacentElement('afterend',shell);else s.prepend(shell);
 }
 mountSettingsGrid(shell);
 return shell;
}

function directPanels(){const g=grid();return g?[...g.children].filter(x=>x.nodeType===1):[]}
function title(panel){return normText(panel?.querySelector?.('h1,h2,h3')?.textContent||panel?.textContent||'')}
function panelId(panel){return String(panel?.id||'').toLowerCase()}

function retireLegacyDuplicates(){
 const canonical=document.getElementById('yardivoQrRoleAdminV586');
 if(canonical){
  ['qrMobileSettingsPanel','yardivoQrWarehouseAdminPanelV584','yardivoQrWarehouseAdminV583'].forEach(id=>{const x=document.getElementById(id);if(x){x.dataset.yardonLegacyDuplicate='1';x.hidden=true;x.style.setProperty('display','none','important')}});
 }
}

function sectionOf(panel){
 const id=panelId(panel),t=title(panel);
 if(panel?.dataset?.yardonLegacyDuplicate==='1')return'hidden';

 // ACCOUNT owns only identities, users, roles, access and credentials.
 if(id==='masteruseradmin'||id==='masteruserlist'||id.includes('useradmin')||id.includes('accountadmin')||id.includes('supplieraccounts')||/KORISNICI|KORISNIČKI|USER ACCOUNTS|PROFILI NA SERVERU|AUTENTIK|AUTH|LOZINK|PASSWORD|ROLE I PRISTUP|KORISNIČKI RAČUN|KORISNICKI RACUN/.test(t))return'account';

 // MASTER owns business/master data and operational warehouse rules.
 if(id.includes('stablemaster')||id.includes('settingsmaster')||id.includes('masterdata')||id.includes('masterfoundation')||id.includes('delaysettings')||id.includes('dwell')||id.includes('responsible')||/MASTER PODACI|LOKACIJE|SKLADIŠT|RAMPE|BROJ RAMPI|KAPACITET|DOBAVLJAČI|DOBAVLJACI|ODGOVORNE OSOBE|RADNO VRIJEME|PRIJAM.*VRIJEME|KAŠNJENJ|KASNJENJ|NO-SHOW|TOLERANCIJA/.test(t))return'master';

 // Everything else belongs to YardOn system settings.
 return'yardon';
}

function updateHead(key,count){
 const m=META[key]||META.master,h=document.getElementById('yardonSettingsCategoryHead');if(!h)return;
 const tt=h.querySelector('h3'),p=h.querySelector('p'),c=h.querySelector('.yac-count');
 if(tt)tt.textContent=m.title;if(p)p.textContent=m.copy;if(c)c.textContent=`${count} ${count===1?'POSTAVKA':'POSTAVKI'}`;
}

function show(key){
 if(!SECTIONS.includes(key))key='master';selected=key;
 if(!isAdmin())return;
 ensureStyle();const shell=ensureShell();retireLegacyDuplicates();
 if(key==='master')ensureMaster();
 if(key==='account')ensureAccount();
 if(key==='yardon')ensureQr();
 mountSettingsGrid(shell);

 const ps=directPanels();let count=0;
 ps.forEach(p=>{
  const sec=sectionOf(p),yes=sec===key;
  p.dataset.yasSection=sec;
  if(yes)count++;
  p.hidden=!yes;
  p.classList.toggle('yardivo-settings-tab-hidden',!yes);
  p.classList.toggle('yardivo-settings-tab-visible',yes);
  if(yes){p.removeAttribute('aria-hidden');p.style.removeProperty('display')}else p.setAttribute('aria-hidden','true');
 });

 shell?.querySelectorAll('[data-yas-section]').forEach(b=>{const on=b.dataset.yasSection===key;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
 updateHead(key,count);
 if(key==='account')queueMicrotask(installBulkActions);
 settings()?.classList.add('yardon-settings-ready');
}

function organize(){
 if(!settings()||!isAdmin())return;
 ensureStyle();const shell=ensureShell();
 try{window.YardivoAdminCleanupV8?.apply?.()}catch(_){}
 mountSettingsGrid(shell);
 ensureQr();ensureMaster();ensureAccount();retireLegacyDuplicates();show(selected);
}
function schedule(ms=50){clearTimeout(reconcileTimer);reconcileTimer=setTimeout(()=>{if(settingsActive())organize()},ms)}

function sectionButton(e){return e.target?.closest?.('#yardonAdminSettingsShell [data-yas-section]')||null}
document.addEventListener('click',e=>{
 const b=sectionButton(e);if(b){e.preventDefault();show(b.dataset.yasSection);return}
 if(e.target?.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings'))schedule(20);
},true);
document.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const b=sectionButton(e);if(b){e.preventDefault();show(b.dataset.yasSection)}},true);
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(20)});
window.addEventListener('yardivo:login',()=>setTimeout(organize,160));
window.addEventListener('yardivo:master-data-changed',()=>schedule(80));
window.addEventListener('yardivo:data-synced',()=>schedule(80));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(organize,220),{once:true});else setTimeout(organize,120);

/* Existing server account actions remain intact inside ACCOUNT POSTAVKE. */
async function invokeUsers(action,payload){
 const api=window.YardivoAdminUsersServerV583;if(api?.invoke)return api.invoke(action,payload||{});
 const c=await window.YardivoAuth.client();const {data,error}=await c.functions.invoke('yardivo-admin-users',{body:{action,...payload}});if(error)throw error;if(data?.error)throw new Error(data.error);return data?.data??data??{};
}
async function listUsers(){const r=await invokeUsers('list',{});return Array.isArray(r)?r:(Array.isArray(r?.users)?r.users:[])}
function installBulkActions(){
 if(!isAdmin())return;const panel=document.getElementById('masterUserAdmin');if(!panel)return;
 let box=document.getElementById('yardivoBulkAdminActionsV583');
 if(!box){box=document.createElement('div');box.id='yardivoBulkAdminActionsV583';box.className='yardivo-bulk-admin-actions';box.innerHTML='<button type="button" class="action danger" id="yardivoBulkUsersMirror">BRIŠI SVE KORISNIKE (OSIM ADMINA)</button><button type="button" class="action danger" id="yardivoDeleteAllSuppliers">BRIŠI SVE DOBAVLJAČE</button><span class="yac-bulk-note">Masovne radnje nad stvarnim server profilima.</span>';(panel.querySelector('.master-settings-body,.panel-body')||panel).prepend(box)}
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

window.YardivoSettingsHardFixV583={show,refresh:organize,stabilize:organize,deleteAllSuppliers,category:()=>selected};
})();
