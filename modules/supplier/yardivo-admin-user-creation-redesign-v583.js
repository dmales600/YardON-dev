
(function(){
'use strict';

const ROLE_INFO={
  admin:{label:'Admin',icon:'★',desc:'Globalni Admin · puni pristup cijelom YARDIVO-u, svim lokacijama i svim skladištima.'},
  manager:{label:'Voditelj',icon:'◈',desc:'Admin bira lokaciju, skladišta i točno koje sekcije Voditelj vidi.'},
  inventory:{label:'Upravljanje zalihama',icon:'▦',desc:'Fiksne sekcije za zalihe; bira se lokacija i skladišta.'},
  reception:{label:'Prijam',icon:'⇥',desc:'Fiksne sekcije za prijam; bira se lokacija i skladišta.'},
  gate:{label:'Porta',icon:'▣',desc:'Fiksne sekcije za Portu; bira se lokacija i skladišta.'},
  supplier:{label:'Dobavljač',icon:'⌂',desc:'Otvara poseban Supplier account prozor s dobavljačem i njegovim skladištima.'}
};

function isAdmin(){
  return String(window.currentSession?.role||'').trim().toLowerCase()==='admin';
}
function esc(v){
  return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function allWh(loc){
  try{
    if(typeof window.allWarehousesForLocation==='function')return window.allWarehousesForLocation(loc)||[];
    if(typeof allWarehousesForLocation==='function')return allWarehousesForLocation(loc)||[];
  }catch(_){}
  try{
    const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    return (d.warehouses||[]).filter(w=>w&&w.active!==false&&(loc==='ALL'||String(w.location_id)===String(loc))).map(w=>w.id);
  }catch(_){}
  return [];
}
function selectedWh(){
  return [...document.querySelectorAll('#yufWarehouseGrid input[name="yufWarehouse"]:checked')].map(x=>x.value);
}
function renderWh(){
  const loc=document.getElementById('yufLocation')?.value||'';
  const host=document.getElementById('yufWarehouseGrid');if(!host)return;
  let d={locations:[],warehouses:[]};try{d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){}
  const rows=(d.warehouses||[]).filter(w=>w&&w.active!==false&&(loc==='ALL'||String(w.location_id)===String(loc)));
  host.innerHTML=rows.length?rows.map(w=>{const place=(d.locations||[]).find(x=>String(x.id)===String(w.location_id))?.name||'';return `<label><input type="checkbox" name="yufWarehouse" value="${esc(w.id)}"><span><strong>${esc(w.name||w.id)}</strong>${place?`<br><small>${esc(place)}</small>`:''}</span></label>`}).join(''):'<div style="padding:10px;color:#879daf">Nema skladišta za odabranu lokaciju.</div>';
  const all=document.getElementById('yufAllWarehouses');if(all){all.checked=false;all.onchange=()=>{host.querySelectorAll('input[name="yufWarehouse"]').forEach(x=>{x.checked=false;x.disabled=all.checked})};}
  const lab=document.getElementById('yufAllWarehousesLabel');if(lab)lab.textContent=loc==='ALL'?'SVA SKLADIŠTA NA SVIM LOKACIJAMA':'SVA SKLADIŠTA U ODABRANOJ LOKACIJI';
}
async function invokeCreate(payload){
  const c=await window.YardivoAuth?.client?.();
  if(!c)throw new Error('ONLINE AUTH NIJE SPREMAN.');
  const {data,error}=await c.functions.invoke('yardivo-admin-users',{body:{action:'create',...payload}});
  if(error){
    let detail='';
    try{
      const cloned=error.context?.clone?.()||error.context;
      if(cloned){const body=await cloned.json();detail=body?.error||body?.message||''}
    }catch(_){}
    throw new Error(detail||error.message||'Kreiranje korisnika nije uspjelo.');
  }
  if(data?.error)throw new Error(data.error);
  if(data?.ok===false)throw new Error(data?.message||'Kreiranje korisnika nije uspjelo.');
  return data?.data??data;
}

function ensure(){
  const panel=document.getElementById('masterUserAdmin');
  const grid=document.querySelector('#settings .settings-grid');
  if(!panel||!grid)return;

  // Korisnici panel ide na samo dno Settings grida.
  if(grid.lastElementChild!==panel)grid.appendChild(panel);

  let add=document.getElementById('yardivoAdminAddUserBtn');
  if(!add){
    add=document.createElement('button');
    add.id='yardivoAdminAddUserBtn';add.type='button';add.className='primary';
    add.textContent='＋ DODAJ KORISNIKA';
    panel.querySelector('.master-settings-body')?.appendChild(add);
    add.onclick=openRolePicker;
  }
  add.style.display=isAdmin()?'':'none';

  if(!document.getElementById('yardivoUserRolePickerModal')){
    document.body.insertAdjacentHTML('beforeend',`
      <div id="yardivoUserRolePickerModal" aria-hidden="true">
        <div class="yucr-card">
          <div class="yucr-head">
            <div><h2>DODAJ KORISNIKA</h2><small>Odaberi rolu. YARDIVO će otvoriti odgovarajući način izrade korisnika.</small></div>
            <button type="button" class="yucr-close" data-yucr-close="role">×</button>
          </div>
          <div id="yardivoUserRoleCards">
            ${Object.entries(ROLE_INFO).map(([r,x])=>`
              <button type="button" class="yucr-role" data-yucr-role="${r}">
                <span class="icon">${x.icon}</span>
                <span><strong>${x.label}</strong><small>${x.desc}</small></span>
              </button>`).join('')}
          </div>
        </div>
      </div>`);
  }

  if(!document.getElementById('yardivoFixedUserModal')){
    document.body.insertAdjacentHTML('beforeend',`
      <div id="yardivoFixedUserModal" aria-hidden="true">
        <div class="yucr-card">
          <div class="yucr-head">
            <div><h2 id="yufTitle">NOVI KORISNIK</h2><small id="yufSubtitle"></small></div>
            <button type="button" class="yucr-close" data-yucr-close="fixed">×</button>
          </div>

          <section class="yucr-section" id="yufSupplierSelectSection" style="display:none">
            <strong>1 · ODABERI DOBAVLJAČA</strong>
            <label style="margin-top:10px">Dobavljač iz Master podataka
              <select id="yufSupplierSelect"><option value="">— ODABERI DOBAVLJAČA —</option></select>
            </label>
            <div class="yucr-fixed-note" style="margin-top:10px">Account se može napraviti samo za dobavljača koji već postoji u Master podacima.</div>
          </section>

          <section class="yucr-section">
            <strong id="yufBasicStepTitle">1 · OSNOVNI PODACI</strong>
            <div class="yucr-grid" style="margin-top:10px">
              <label>Ime i prezime<input id="yufName" autocomplete="off"></label>
              <label>Username<input id="yufUsername" autocomplete="off"></label>
              <label>Lozinka<input id="yufPassword" type="password" minlength="8" autocomplete="new-password"></label>
              <label>Potvrda lozinke<input id="yufPassword2" type="password" minlength="8" autocomplete="new-password"></label>
            </div>
            <div class="yucr-grid" id="yufSupplierContactFields" style="margin-top:10px;display:none">
              <label>Kontakt osoba<input id="yufContactName" autocomplete="off"></label>
              <label>Kontakt e-mail<input id="yufContactEmail" type="email" autocomplete="off"></label>
              <label>Kontakt telefon<input id="yufContactPhone" autocomplete="off"></label>
            </div>
          </section>

          <section class="yucr-section" id="yufScopeSection"> <strong id="yufScopeStepTitle">2 · LOKACIJA I SKLADIŠTA</strong>
            <label style="margin-top:10px">Lokacije
              <select id="yufLocation"><option value="">Odaberi lokaciju...</option></select>
            </label>
            <div class="yucr-fixed-note" id="yufSupplierScopeHelp" style="display:none">Dobavljaču možeš dodijeliti jednu lokaciju ili SVE LOKACIJE. Zatim odaberi pojedina skladišta ili SVA SKLADIŠTA.</div>
            <label style="display:flex;flex-direction:row;align-items:center;gap:8px;margin-top:10px">
              <input id="yufAllWarehouses" type="checkbox" style="width:auto">
              <strong id="yufAllWarehousesLabel">SVA SKLADIŠTA U ODABRANOJ LOKACIJI</strong>
            </label>
            <div id="yufWarehouseGrid"></div>
          </section>

          <div class="yucr-fixed-note" id="yufFixedNote">
            Sekcije su fiksirane prema roli. Admin je globalan. Za ostale role odabiru se lokacija i skladišta.
          </div>

          <div class="yucr-actions">
            <button type="button" class="action" data-yucr-close="fixed">ODUSTANI</button>
            <button type="button" class="primary" id="yufCreate">KREIRAJ KORISNIKA</button>
          </div>
        </div>
      </div>`);
    document.getElementById('yufLocation').onchange=renderWh;
    document.getElementById('yufAllWarehouses').onchange=e=>{
      document.querySelectorAll('#yufWarehouseGrid input[name="yufWarehouse"]').forEach(x=>x.checked=e.target.checked);
    };
    document.getElementById('yufWarehouseGrid').addEventListener('change',()=>{
      const boxes=[...document.querySelectorAll('#yufWarehouseGrid input[name="yufWarehouse"]')];
      const a=document.getElementById('yufAllWarehouses');
      if(a)a.checked=boxes.length>0&&boxes.every(x=>x.checked);
    });
    document.getElementById('yufCreate').onclick=createFixedUser;
  }

  // Remove duplicate legacy launch buttons from layout.
  const oldManager=document.getElementById('ymManagerLaunch');
  if(oldManager)oldManager.style.setProperty('display','none','important');
  const oldSupplier=document.getElementById('yardivoSupplierAccountBtn');
  if(oldSupplier)oldSupplier.style.setProperty('display','none','important');
}
function openRolePicker(){
  if(!isAdmin())return;
  ensure();
  const m=document.getElementById('yardivoUserRolePickerModal');
  m.classList.add('open');m.setAttribute('aria-hidden','false');
}
function closeRolePicker(){
  const m=document.getElementById('yardivoUserRolePickerModal');
  m?.classList.remove('open');m?.setAttribute('aria-hidden','true');
}
function closeFixed(){
  const m=document.getElementById('yardivoFixedUserModal');
  m?.classList.remove('open');m?.setAttribute('aria-hidden','true');
}
let fixedRole='';

function openRole(role){
  closeRolePicker();
  openFixed(role);
}
function openFixed(role){
  const info=ROLE_INFO[role];if(!info)return;
  fixedRole=role;
  document.getElementById('yufTitle').textContent='NOVI KORISNIK · '+info.label.toUpperCase();
  document.getElementById('yufSubtitle').textContent=info.desc;
  const nameLabel=document.getElementById('yufName')?.closest('label');
  if(nameLabel){nameLabel.childNodes[0].nodeValue='Ime i prezime';nameLabel.style.display=role==='supplier'?'none':'';}
  ['yufName','yufUsername','yufPassword','yufPassword2','yufContactName','yufContactEmail','yufContactPhone'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  const supplierSelectSection=document.getElementById('yufSupplierSelectSection');
  const supplierSelect=document.getElementById('yufSupplierSelect');
  const basicStepTitle=document.getElementById('yufBasicStepTitle');
  if(supplierSelectSection)supplierSelectSection.style.display=role==='supplier'?'':'none';
  if(basicStepTitle)basicStepTitle.textContent=role==='supplier'?'2 · USERNAME I LOZINKA':'1 · OSNOVNI PODACI';
  if(supplierSelect){
    let md={suppliers:[]};try{md=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){}
    const suppliers=(Array.isArray(md.suppliers)?md.suppliers:[]).filter(x=>x&&x.active!==false&&String(x.name||'').trim()).sort((a,b)=>String(a.name).localeCompare(String(b.name),'hr'));
    supplierSelect.innerHTML='<option value="">— ODABERI DOBAVLJAČA —</option>'+suppliers.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    supplierSelect.value='';
    supplierSelect.onchange=()=>{
      const id=String(supplierSelect.value||'');
      const row=suppliers.find(x=>String(x.id)===id);
      const nameInput=document.getElementById('yufName');
      if(nameInput)nameInput.value=row?String(row.name||''):'';
      // Supplier account scope is owned only by Master Data; no account-level location/warehouse editing.
      if(row){ /* selection is sufficient; create handler derives full Master scope */ }
    };
  }
  const supplierFields=document.getElementById('yufSupplierContactFields');if(supplierFields)supplierFields.style.display='none';
  const modal=document.getElementById('yardivoFixedUserModal');if(modal)modal.dataset.roleAdmin=role==='admin'?'1':'0';
  const scope=document.getElementById('yufScopeSection');
  if(scope){
    scope.style.removeProperty('display');
    if(role==='admin'||role==='supplier')scope.style.setProperty('display','none');
  }
  const scopeStepTitle=document.getElementById('yufScopeStepTitle');if(scopeStepTitle)scopeStepTitle.textContent='2 · LOKACIJA I SKLADIŠTA';
  const locSel=document.getElementById('yufLocation');
  if(locSel){
    let d={locations:[]};try{d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){}
    const rows=(d.locations||[]).filter(x=>x&&x.active!==false);
    locSel.innerHTML=role==='admin'?'<option value="ALL">Sve lokacije</option>':('<option value="">Odaberi lokaciju...</option>'+(role==='supplier'?'<option value="ALL">SVE LOKACIJE</option>':'')+rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join(''));
    locSel.value=role==='admin'?'ALL':'';
    locSel.onchange=()=>renderWh();
  }
  const scopeHelp=document.getElementById('yufSupplierScopeHelp');if(scopeHelp)scopeHelp.style.display='none';
  if(role==='admin'){
    document.getElementById('yufWarehouseGrid').innerHTML='';const all=document.getElementById('yufAllWarehouses');if(all)all.checked=false;
  }else renderWh();
  const note=document.getElementById('yufFixedNote');if(note)note.textContent=role==='supplier'?'Lokacije, skladišta i kontaktni podaci automatski se preuzimaju iz Master podataka odabranog dobavljača. Ovdje se postavljaju samo username i lozinka.':'Sekcije su fiksirane prema roli. Admin je globalan. Za ostale role odabiru se lokacija i skladišta.';
  const m=document.getElementById('yardivoFixedUserModal');m.classList.add('open');m.setAttribute('aria-hidden','false');
  setTimeout(()=>document.getElementById(role==='supplier'?'yufSupplierSelect':'yufName')?.focus(),30);
}
async function createFixedUser(){
  if(!isAdmin()||!fixedRole)return;
  let name=(document.getElementById('yufName')?.value||'').trim();
  let supplierId='';
  if(fixedRole==='supplier'){
    supplierId=String(document.getElementById('yufSupplierSelect')?.value||'').trim();
    let md={suppliers:[]};try{md=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){}
    const row=(Array.isArray(md.suppliers)?md.suppliers:[]).find(x=>String(x.id)===supplierId&&x.active!==false);
    if(!supplierId||!row)return alert('Prvo odaberi dobavljača iz Master podataka.');
    name=String(row.name||'').trim();
    if(!name)return alert('Odabrani dobavljač nema ispravan naziv.');
    const nameInput=document.getElementById('yufName');if(nameInput)nameInput.value=name;
  }
  const username=(document.getElementById('yufUsername')?.value||'').trim().toLowerCase();
  const password=document.getElementById('yufPassword')?.value||'';
  const password2=document.getElementById('yufPassword2')?.value||'';
  let contact_name=(document.getElementById('yufContactName')?.value||'').trim();
  let contact_email=(document.getElementById('yufContactEmail')?.value||'').trim().toLowerCase();
  let contact_phone=(document.getElementById('yufContactPhone')?.value||'').trim();
  let location=fixedRole==='admin'?'ALL':(document.getElementById('yufLocation')?.value||'');
  let all_locations=false,all_warehouses=false,warehouses=fixedRole==='admin'?[]:selectedWh();
  if(fixedRole==='supplier'){
    let md={suppliers:[]};try{md=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){}
    const row=(Array.isArray(md.suppliers)?md.suppliers:[]).find(x=>String(x.id)===supplierId&&x.active!==false);
    if(!row)return alert('Odabrani dobavljač više ne postoji u Master podacima.');
    all_locations=Boolean(row.all_locations);all_warehouses=Boolean(row.all_warehouses);
    const locs=Array.isArray(row.locations)?row.locations.map(String):[];
    warehouses=all_warehouses?[]:(Array.isArray(row.warehouses)?row.warehouses.map(String):[]);
    location=all_locations?'ALL':(locs[0]||'');
    contact_name=String(row.contact_name||'').trim();contact_email=String(row.contact_email||'').trim().toLowerCase();contact_phone=String(row.contact_phone||'').trim();
  }

  if(!name)return alert(fixedRole==='supplier'?'Upiši naziv dobavljača.':'Upiši ime i prezime.');
  if(!/^[a-z0-9._-]{3,40}$/.test(username))return alert('Username mora imati najmanje 3 znaka.');
  if(password.length<8)return alert('Lozinka mora imati najmanje 8 znakova.');
  if(password!==password2)return alert('Lozinke se ne podudaraju.');
  if(fixedRole!=='admin'&&fixedRole!=='supplier'&&!location)return alert('Odaberi lokaciju.');
  if(fixedRole!=='admin'&&fixedRole!=='supplier'&&!warehouses.length)return alert('Odaberi barem jedno skladište.');
  

  const btn=document.getElementById('yufCreate');
  btn.disabled=true;btn.textContent='KREIRAM...';
  try{
    await invokeCreate({
      username,password,role:fixedRole,location,warehouses,all_locations,all_warehouses,
      supplier_id:fixedRole==='supplier'?supplierId:null,display_name:name,
      supplier_name:fixedRole==='supplier'?name:null,
      contact_name:fixedRole==='supplier'?contact_name:null,
      contact_email:fixedRole==='supplier'?contact_email:null,
      contact_phone:fixedRole==='supplier'?contact_phone:null
    });
    if(fixedRole==='supplier'){
      try{
        const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
        d.suppliers=Array.isArray(d.suppliers)?d.suppliers:[];
        let s=d.suppliers.find(x=>String(x.id||'')===supplierId);
        if(!s)throw new Error('Dobavljač više ne postoji u Master podacima.');
        s.username=username; // Scope remains exclusively owned by Master Data.
        localStorage.setItem('yardivo_master_data_registry_v583',JSON.stringify(d));
        try{window.YardivoMasterDataV583?.save?.(d)}catch(_){}
        window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:'supplier-create'}}));
      }catch(_){}
    }
    closeFixed();
    try{await window.YardivoServerProfiles?.render?.()}catch(_){}
    try{showYmsToast?.('success',fixedRole==='supplier'?'DOBAVLJAČ KREIRAN':'KORISNIK KREIRAN',`${name} · ${ROLE_INFO[fixedRole].label}`)}catch(_){}
  }catch(e){
    alert('Kreiranje korisnika nije uspjelo: '+String(e?.message||e));
  }finally{
    btn.disabled=false;btn.textContent='KREIRAJ KORISNIKA';
  }
}

document.addEventListener('click',e=>{
  const role=e.target.closest?.('[data-yucr-role]')?.dataset.yucrRole;
  if(role){e.preventDefault();openRole(role);return}
  const close=e.target.closest?.('[data-yucr-close]')?.dataset.yucrClose;
  if(close==='role')closeRolePicker();
  if(close==='fixed')closeFixed();
},true);
document.addEventListener('click',e=>{
  if(e.target?.id==='yardivoUserRolePickerModal')closeRolePicker();
  if(e.target?.id==='yardivoFixedUserModal')closeFixed();
},true);

function refresh(){
  if(!isAdmin())return;
  ensure();
}
window.addEventListener('load',()=>setTimeout(refresh,1300));
window.addEventListener('yardivo:login',()=>setTimeout(refresh,180));
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(refresh,180);
},true);
/* stability: admin modal ensure is load/login/click driven */

window.YardivoAdminUserCreationV583={open:openRolePicker,refresh};
})();
