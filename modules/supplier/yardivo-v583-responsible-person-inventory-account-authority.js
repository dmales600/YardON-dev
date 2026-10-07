
(function(){
'use strict';
const MASTER_KEY='yardivo_master_data_registry_v583';
let inventoryRoleSelected=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function readMaster(){
  let d={};
  try{d=JSON.parse(localStorage.getItem(MASTER_KEY)||'{}')||{}}catch(_){d={}}
  d.suppliers=Array.isArray(d.suppliers)?d.suppliers:[];
  d.locations=Array.isArray(d.locations)?d.locations:[];
  d.warehouses=Array.isArray(d.warehouses)?d.warehouses:[];
  d.responsible_people=Array.isArray(d.responsible_people)?d.responsible_people:[];
  return d;
}
async function saveMaster(d,source){
  d.responsible_people=Array.isArray(d.responsible_people)?d.responsible_people:[];
  d.__masterUpdatedAtV583=new Date().toISOString();
  d.__masterWriteTokenV583='RP-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  localStorage.setItem(MASTER_KEY,JSON.stringify(d));
  try{await Promise.resolve(window.YardivoMasterDataV583?.save?.(d))}catch(e){console.error('Responsible people cloud save',e);throw e}
  try{await Promise.resolve(window.YardivoMasterDataV583?.flushQueue?.())}catch(_){ }
  window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:source||'responsible-people'}}));
}
function nextId(rows){
  let n=0;for(const x of rows){const m=String(x?.id||'').match(/^RP(\d+)$/i);if(m)n=Math.max(n,Number(m[1])||0)}
  return 'RP'+String(n+1).padStart(3,'0');
}
function fullName(p){return [p?.first_name,p?.last_name].map(x=>String(x||'').trim()).filter(Boolean).join(' ').trim()}
function people(activeOnly=true){
  return readMaster().responsible_people.filter(p=>p&&(!activeOnly||p.active!==false)&&fullName(p)).sort((a,b)=>fullName(a).localeCompare(fullName(b),'hr'));
}
function populateAnnouncementResponsible(preserve=true){
  const sel=document.getElementById('annResponsible');if(!sel)return;
  const current=preserve?String(sel.value||''):'';
  const rows=people(true);
  sel.innerHTML='<option value="">Odaberi odgovornu osobu...</option>'+rows.map(p=>`<option value="${esc(fullName(p))}" data-rp-id="${esc(p.id)}">${esc(fullName(p))}</option>`).join('');
  if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;
  else sel.value='';
}
function sectionHost(){
  const stable=document.getElementById('yardivoStableMasterEditorV583');
  if(stable)return stable;
  return document.getElementById('yardivoSettingsMasterPaneV583')||document.getElementById('settings');
}
function ensureSettingsSection(){
  const host=sectionHost();if(!host)return;
  let sec=document.getElementById('yardivoResponsiblePeopleV583');
  if(!sec){
    sec=document.createElement('section');sec.id='yardivoResponsiblePeopleV583';
    sec.innerHTML=`<div class="yrp-head"><div><h3>ODGOVORNE OSOBE</h3><div class="yrp-sub">Dodaj stvarne odgovorne osobe. Ovaj popis je jedini izvor za dropdown “Odgovorna osoba” u Unosu najave i za povezivanje s accountom Upravljanje zalihama.</div></div></div>
      <div class="yrp-add"><label>IME<input id="yrpFirstName" autocomplete="off" placeholder="Ime"></label><label>PREZIME<input id="yrpLastName" autocomplete="off" placeholder="Prezime"></label><button type="button" id="yrpAddBtn">＋ DODAJ ODGOVORNU OSOBU</button></div>
      <div class="yrp-list" id="yrpList"></div>`;
    host.appendChild(sec);
    sec.querySelector('#yrpAddBtn')?.addEventListener('click',addPerson);
    sec.addEventListener('click',async e=>{
      const b=e.target.closest('[data-yrp-delete]');if(!b)return;
      const id=String(b.dataset.yrpDelete||'');const d=readMaster();const p=d.responsible_people.find(x=>String(x.id)===id);if(!p)return;
      if(p.account_username||p.auth_user_id)return alert('Ova odgovorna osoba je povezana s accountom Upravljanje zalihama. Prvo promijeni/ukloni vezu accounta.');
      if(!confirm(`Obrisati odgovornu osobu “${fullName(p)}”?`))return;
      d.responsible_people=d.responsible_people.filter(x=>String(x.id)!==id);
      try{await saveMaster(d,'responsible-person-delete')}catch(err){alert('Spremanje nije uspjelo: '+String(err?.message||err));return}
      renderPeople();populateAnnouncementResponsible(false);syncInventorySelector();
    });
  }
  renderPeople();
}
function renderPeople(){
  const list=document.getElementById('yrpList');if(!list)return;
  const rows=people(false);
  list.innerHTML=rows.length?rows.map(p=>{
    const linked=p.account_username?`Povezan account: ${esc(p.account_username)}`:'Nije povezan s accountom';
    return `<div class="yrp-row"><div><strong>${esc(fullName(p))}</strong><small>${linked}</small></div><button type="button" class="yrp-delete" data-yrp-delete="${esc(p.id)}" ${p.account_username||p.auth_user_id?'disabled title="Povezana osoba se ne može obrisati"':''}>OBRIŠI</button></div>`
  }).join(''):'<div class="yrp-empty">Još nema odgovornih osoba. Dodaj ime i prezime iznad.</div>';
}
async function addPerson(){
  const first=String(document.getElementById('yrpFirstName')?.value||'').trim();
  const last=String(document.getElementById('yrpLastName')?.value||'').trim();
  if(!first||!last)return alert('Upiši ime i prezime odgovorne osobe.');
  const d=readMaster();const name=(first+' '+last).toLocaleLowerCase('hr');
  if(d.responsible_people.some(p=>fullName(p).toLocaleLowerCase('hr')===name))return alert('Ta odgovorna osoba već postoji.');
  d.responsible_people.push({id:nextId(d.responsible_people),first_name:first,last_name:last,active:true,account_username:null,auth_user_id:null});
  try{await saveMaster(d,'responsible-person-create')}catch(err){alert('Spremanje nije uspjelo: '+String(err?.message||err));return}
  const a=document.getElementById('yrpFirstName'),b=document.getElementById('yrpLastName');if(a)a.value='';if(b)b.value='';
  renderPeople();populateAnnouncementResponsible(false);syncInventorySelector();
  try{showYmsToast?.('success','ODGOVORNA OSOBA DODANA',first+' '+last)}catch(_){ }
}
function ensureInventorySection(){
  const modal=document.getElementById('yardivoFixedUserModal');if(!modal)return null;
  let sec=document.getElementById('yufResponsibleSelectSection');
  if(!sec){
    sec=document.createElement('section');sec.className='yucr-section';sec.id='yufResponsibleSelectSection';sec.style.display='none';
    sec.innerHTML=`<strong>1 · ODABERI ODGOVORNU OSOBU</strong><label style="margin-top:10px">Odgovorna osoba iz Master podataka<select id="yufResponsibleSelect"><option value="">— ODABERI ODGOVORNU OSOBU —</option></select></label><div class="yucr-fixed-note">Account Upravljanje zalihama može se napraviti samo za osobu koja već postoji u Master podacima.</div>`;
    const supplier=document.getElementById('yufSupplierSelectSection');
    if(supplier?.parentNode)supplier.parentNode.insertBefore(sec,supplier.nextSibling);else modal.querySelector('.yucr-card')?.prepend(sec);
    sec.querySelector('#yufResponsibleSelect')?.addEventListener('change',e=>{
      const p=people(true).find(x=>String(x.id)===String(e.target.value));
      const name=document.getElementById('yufName');if(name)name.value=p?fullName(p):'';
    });
  }
  return sec;
}
function syncInventorySelector(){
  const sec=ensureInventorySection();const sel=document.getElementById('yufResponsibleSelect');if(!sec||!sel)return;
  const current=sel.value;const rows=people(true);
  sel.innerHTML='<option value="">— ODABERI ODGOVORNU OSOBU —</option>'+rows.map(p=>{
    const linked=Boolean(p.account_username||p.auth_user_id);
    return `<option value="${esc(p.id)}" ${linked?'disabled':''}>${esc(fullName(p))}${linked?` — account: ${esc(p.account_username||'povezan')}`:''}</option>`;
  }).join('');
  if(current&&[...sel.options].some(o=>o.value===current&&!o.disabled))sel.value=current;
}
function configureRole(role){
  inventoryRoleSelected=role==='inventory';
  const sec=ensureInventorySection();if(sec)sec.style.display=inventoryRoleSelected?'':'none';
  const name=document.getElementById('yufName');const label=name?.closest('label');
  if(inventoryRoleSelected){
    syncInventorySelector();if(label)label.style.display='none';if(name)name.value='';
    const basic=document.getElementById('yufBasicStepTitle');if(basic)basic.textContent='2 · PODACI ZA ACCOUNT';
    const scope=document.getElementById('yufScopeStepTitle');if(scope)scope.textContent='3 · LOKACIJA I SKLADIŠTA';
    const note=document.getElementById('yufFixedNote');if(note)note.textContent='Upravljanje zalihama account je vezan uz odabranu odgovornu osobu. Lokacija i skladišta određuju operativni scope accounta.';
  }else if(sec){
    const sel=document.getElementById('yufResponsibleSelect');if(sel)sel.value='';
  }
}
function selectedWarehouses(){return [...document.querySelectorAll('#yufWarehouseGrid input[name="yufWarehouse"]:checked')].map(x=>x.value)}
async function invokeCreate(payload){
  const c=await window.YardivoAuth?.client?.();if(!c)throw new Error('ONLINE AUTH NIJE SPREMAN.');
  const {data,error}=await c.functions.invoke('yardivo-admin-users',{body:{action:'create',...payload}});
  if(error){let detail='';try{const cloned=error.context?.clone?.()||error.context;if(cloned){const body=await cloned.json();detail=body?.error||body?.message||''}}catch(_){ }throw new Error(detail||error.message||'Kreiranje korisnika nije uspjelo.');}
  if(data?.error)throw new Error(data.error);if(data?.ok===false)throw new Error(data?.message||'Kreiranje korisnika nije uspjelo.');return data?.data??data;
}
async function createInventoryAccount(btn){
  const rpId=String(document.getElementById('yufResponsibleSelect')?.value||'');const d=readMaster();const rp=d.responsible_people.find(x=>String(x.id)===rpId&&x.active!==false);
  if(!rp)return alert('Prvo odaberi odgovornu osobu iz Master podataka.');
  if(rp.account_username||rp.auth_user_id)return alert('Odabrana odgovorna osoba već je povezana s accountom Upravljanje zalihama.');
  const username=String(document.getElementById('yufUsername')?.value||'').trim().toLowerCase();
  const password=String(document.getElementById('yufPassword')?.value||'');const password2=String(document.getElementById('yufPassword2')?.value||'');
  const location=String(document.getElementById('yufLocation')?.value||'');const warehouses=selectedWarehouses();
  if(!/^[a-z0-9._-]{3,40}$/.test(username))return alert('Username mora imati najmanje 3 znaka.');
  if(password.length<8)return alert('Lozinka mora imati najmanje 8 znakova.');if(password!==password2)return alert('Lozinke se ne podudaraju.');
  if(!location)return alert('Odaberi lokaciju.');if(!warehouses.length)return alert('Odaberi barem jedno skladište.');
  btn.disabled=true;const old=btn.textContent;btn.textContent='KREIRAM...';
  try{
    const created=await invokeCreate({username,password,role:'inventory',responsible_person_id:rpId,location,warehouses});
    const fresh=readMaster();const target=fresh.responsible_people.find(x=>String(x.id)===rpId);if(!target)throw new Error('Odgovorna osoba više ne postoji u Master podacima.');
    target.account_username=username;target.auth_user_id=String(created?.auth_user_id||'')||null;target.account_role='inventory';
    try{await saveMaster(fresh,'inventory-account-link')}catch(saveErr){
      alert('Account je kreiran, ali veza s odgovornom osobom nije spremljena u Master Data. Nemoj kreirati novi account; prijavi ovu grešku. '+String(saveErr?.message||saveErr));return;
    }
    document.getElementById('yardivoFixedUserModal')?.classList.remove('open');document.getElementById('yardivoFixedUserModal')?.setAttribute('aria-hidden','true');
    inventoryRoleSelected=false;renderPeople();populateAnnouncementResponsible(false);
    try{await window.YardivoServerProfiles?.render?.()}catch(_){ }
    try{showYmsToast?.('success','UPRAVLJANJE ZALIHAMA ACCOUNT KREIRAN',fullName(target)+' · '+username)}catch(_){ }
  }catch(err){alert('Kreiranje korisnika nije uspjelo: '+String(err?.message||err));}
  finally{btn.disabled=false;btn.textContent=old||'KREIRAJ KORISNIKA';}
}
// Capture only Inventory creation; all other role flows remain on the canonical existing owner.
document.addEventListener('click',e=>{
  const roleBtn=e.target.closest?.('[data-yucr-role]');
  if(roleBtn){const r=String(roleBtn.dataset.yucrRole||'');setTimeout(()=>configureRole(r),0);return;}
  const create=e.target.closest?.('#yufCreate');
  if(create&&inventoryRoleSelected){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void createInventoryAccount(create);return;}
  if(e.target.closest?.('[data-yucr-close="fixed"]'))inventoryRoleSelected=false;
  const settingsBtn=e.target.closest?.('[data-view="settings"], [data-settings-tab], [data-settings-section]');if(settingsBtn)setTimeout(()=>{ensureSettingsSection();populateAnnouncementResponsible(true)},0);
},true);
window.addEventListener('yardivo:master-data-changed',()=>setTimeout(()=>{ensureSettingsSection();renderPeople();populateAnnouncementResponsible(true);syncInventorySelector()},0));
window.addEventListener('yardivo:login',()=>setTimeout(()=>{ensureSettingsSection();populateAnnouncementResponsible(false)},0));
window.addEventListener('yardivo:data-synced',()=>setTimeout(()=>{ensureSettingsSection();populateAnnouncementResponsible(true)},0));
// Wrap the announcement control refresh so every render receives only Master Data responsible people.
const prevPopulate=window.populateAnnouncementControls;
if(typeof prevPopulate==='function'){
  window.populateAnnouncementControls=function(){const r=prevPopulate.apply(this,arguments);populateAnnouncementResponsible(true);return r;};
}
// Export only the small canonical API used by other modules/tests.
window.YardivoResponsiblePeopleV583={read:()=>people(false),active:()=>people(true),refresh:()=>{ensureSettingsSection();populateAnnouncementResponsible(true)}};
setTimeout(()=>{ensureSettingsSection();populateAnnouncementResponsible(false)},0);
window.YARDIVO_DEV_BUILD='20261007-dev-v5.8.3-inventory-responsible-person-create-fix';
})();
