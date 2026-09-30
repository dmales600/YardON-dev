(function(){
'use strict';
if(window.__YARDIVO_SUPPLIER_LOCATION_WAREHOUSE_BINDING_V583__)return;
window.__YARDIVO_SUPPLIER_LOCATION_WAREHOUSE_BINDING_V583__=true;
const KEY='yardivo_master_data_registry_v583';let applying=false,originalServerCreate=null;
function normRole(v){v=String(v||'').trim().toLowerCase();if(v==='management'||v==='voditelj')return'manager';if(v==='porta'||v==='portir')return'gate';if(v==='prijam')return'reception';if(v==='zalihe'||v==='upravljanje zalihama')return'inventory';return v}
function master(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&Array.isArray(d.locations)&&Array.isArray(d.warehouses))return d}catch(_){}try{return window.YardivoMasterDataV583?.all?.()||{locations:[],warehouses:[]}}catch(_){return{locations:[],warehouses:[]}}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function role(){return normRole(document.getElementById('muRole')?.value||'')}
function location(){return String(document.getElementById('muLocation')?.value||'ALL')}
function locationsForAccount(){return (master().locations||[]).filter(x=>x.active!==false)}
function warehousesFor(loc){return (master().warehouses||[]).filter(w=>w.active!==false&&(loc==='ALL'||w.location_id===loc))}
function locationLabel(id){if(id==='ALL')return'SVE LOKACIJE';return master().locations.find(x=>x.id===id)?.name||id}
function warehouseLabel(w){const l=master().locations.find(x=>x.id===w.location_id);return `${w.name}${l?.name?' · '+l.name:''}`}
function setHtmlStable(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}
function ensureSupplierRole(){const sel=document.getElementById('muRole');if(!sel)return;const cur=normRole(sel.value);if(![...sel.options].some(o=>normRole(o.value)==='supplier'))sel.add(new Option('Dobavljač','supplier'));if(cur==='supplier')sel.value='supplier'}
function renderLocations(){const sel=document.getElementById('muLocation');if(!sel)return;const current=sel.value,list=locationsForAccount(),html='<option value="ALL">SVE LOKACIJE</option>'+list.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');if(sel.innerHTML!==html)sel.innerHTML=html;if([...sel.options].some(o=>o.value===current))sel.value=current;else sel.value=list[0]?.id||'ALL'}
function renderWarehouses(selectedValue){
 const host=document.getElementById('muWarehousePicker');if(!host)return;const loc=location(),rows=warehousesFor(loc),r=role();
 if(r==='supplier'){
   const current=selectedValue||host.querySelector('#muSupplierWarehouse')?.value||'';
   const html=!rows.length?'<div class="ysab-empty">Za odabranu lokaciju nema skladišta. Prvo dodaj skladište u MASTER PODACI.</div>':'<div class="ysab-select-wrap"><small style="color:#8faabd;font-weight:900">ODABERI SKLADIŠTE ZA OVOG DOBAVLJAČA</small><select id="muSupplierWarehouse"><option value="">Odaberi skladište...</option>'+rows.map(w=>`<option value="${esc(w.id)}">${esc(warehouseLabel(w))}</option>`).join('')+'</select></div>';
   if(host.innerHTML!==html)host.innerHTML=html;const sel=host.querySelector('#muSupplierWarehouse');if(sel&&[...sel.options].some(o=>o.value===current))sel.value=current;return;
 }
 const previous=new Set([...host.querySelectorAll('input[name="muWarehouse"]:checked')].map(x=>x.value));
 const html=`<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:900;cursor:pointer"><input id="muAllWarehouses" type="checkbox" style="width:auto">${loc==='ALL'?'SVA SKLADIŠTA':'SVA SKLADIŠTA LOKACIJE'}</label><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:6px">${rows.map(w=>`<label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #294252;border-radius:7px;cursor:pointer"><input type="checkbox" name="muWarehouse" value="${esc(w.id)}" style="width:auto" ${previous.has(w.id)?'checked':''}><span><strong>${esc(w.name)}</strong><br><small>${esc(locationLabel(w.location_id))}</small></span></label>`).join('')}</div>`;
 setHtmlStable(host,html);const all=host.querySelector('#muAllWarehouses'),boxes=[...host.querySelectorAll('input[name="muWarehouse"]')];if(all){all.checked=boxes.length>0&&boxes.every(b=>b.checked);all.onchange=()=>boxes.forEach(b=>b.checked=all.checked)}boxes.forEach(b=>b.onchange=()=>{if(all)all.checked=boxes.length>0&&boxes.every(x=>x.checked)})
}
function selectedWarehouses(){if(role()==='supplier'){const v=document.getElementById('muSupplierWarehouse')?.value||'';return v?[v]:[]}return[...document.querySelectorAll('#muWarehousePicker input[name="muWarehouse"]:checked')].map(x=>x.value)}
function refresh(){if(applying||!document.getElementById('masterUserAdmin'))return;applying=true;try{ensureSupplierRole();const before=document.getElementById('muLocation')?.value||'';renderLocations();const after=document.getElementById('muLocation')?.value||'';renderWarehouses(before===after?undefined:'')}finally{applying=false}}
function installCreateOwner(){
 const api=window.YardivoServerProfiles;if(!api||typeof api.create!=='function'||api.create.__supplierBindingV583)return;originalServerCreate=api.create;
 const replacement=async function(){if(role()!=='supplier')return originalServerCreate.apply(api,arguments);let currentRole='';try{currentRole=normRole(window.currentSession?.app_role||window.currentSession?.role||currentSession?.role)}catch(_){}if(currentRole!=='admin')return alert('Samo Admin može kreirati Supplier account.');const username=(document.getElementById('muUser')?.value||'').trim().toLowerCase(),password=document.getElementById('muPass')?.value||'',loc=location(),warehouses=selectedWarehouses();if(!/^[a-z0-9._-]{3,40}$/.test(username))return alert('Username mora imati najmanje 3 znaka.');if(password.length<8)return alert('Password mora imati najmanje 8 znakova.');if(!warehouses.length)return alert('Odaberi skladište za ovog dobavljača.');const w=master().warehouses.find(x=>x.id===warehouses[0]);if(!w)return alert('Odabrano skladište više ne postoji u Master podacima.');const btn=document.getElementById('muSave');try{if(btn){btn.disabled=true;btn.textContent='KREIRAM SUPPLIER ACCOUNT...'}const invoke=window.YardivoAdminUsersServerV583?.invoke;if(typeof invoke!=='function')throw new Error('Server user API nije dostupan.');await invoke('create',{username,password,role:'supplier',location:loc,warehouses:[w.id]});['muUser','muPass','muName'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});try{await window.YardivoServerProfiles?.render?.()}catch(_){}window.showYmsToast?.('success','SUPPLIER ACCOUNT KREIRAN',`${username} · ${locationLabel(loc)} · ${w.name}`)}catch(e){alert('Kreiranje Supplier accounta nije uspjelo: '+(e?.message||e))}finally{if(btn){btn.disabled=false;btn.textContent='KREIRAJ KORISNIČKI PROFIL'}}};replacement.__supplierBindingV583=true;api.create=replacement;
}
try{window.yardivoSelectedInternalUserWarehouses=selectedWarehouses}catch(_){}
document.addEventListener('change',e=>{if(e.target?.id==='muRole')setTimeout(()=>{refresh();installCreateOwner()},0);else if(e.target?.id==='muLocation')setTimeout(()=>renderWarehouses(''),0)},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('#yardivoSettingsTabsFinal [data-settings-tab="admin"],[data-view="settings"],[data-home-target="settings"]'))setTimeout(()=>{refresh();installCreateOwner()},140)},true);
window.addEventListener('yardivo:master-data-changed',()=>setTimeout(refresh,120));
window.addEventListener('yardivo:login',()=>setTimeout(()=>{refresh();installCreateOwner()},220));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')setTimeout(()=>{refresh();installCreateOwner()},150)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{refresh();installCreateOwner()},300),{once:true});else setTimeout(()=>{refresh();installCreateOwner()},180);
window.YardivoSupplierAccountBindingV583={refresh,selectedWarehouses,warehousesFor,location:()=>location()};
})();
