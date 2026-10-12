
(function(){
'use strict';

const FINAL_ROLES=[
  ['inventory','Upravljanje zalihama'],
  ['reception','Prijam'],
  ['gate','Porta'],
  ['manager','Voditelj'],
  ['dispatcher','Dispatcher'],
  ['admin','Admin']
];

const LOGIN_ROLES=[
  ['admin','Admin'],
  ['manager','Voditelj'],
  ['dispatcher','Dispatcher'],
  ['inventory','Upravljanje zalihama'],
  ['reception','Prijam'],
  ['gate','Porta'],
  ['supplier','Dobavljač']
];

function normRole(v){
  v=String(v||'').trim().toLowerCase();
  if(v==='management'||v==='voditelj')return'manager';
  if(v==='porta'||v==='portir')return'gate';
  if(v==='prijam')return'reception';
  if(v==='zalihe'||v==='upravljanje zalihama')return'inventory';
  return v;
}

function loggedRole(){
  try{
    return normRole((typeof currentSession!=='undefined'?currentSession:window.currentSession)?.role);
  }catch(e){
    return normRole(window.currentSession?.role);
  }
}

function ensureLoginRoles(){
  const sel=document.getElementById('loginRole');
  if(!sel)return;
  const current=normRole(sel.value);
  const wanted=LOGIN_ROLES.map(x=>x[0]).join('|');
  const actual=[...sel.options].map(o=>normRole(o.value)).join('|');
  if(actual!==wanted){
    sel.innerHTML=LOGIN_ROLES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  }
  if(LOGIN_ROLES.some(x=>x[0]===current))sel.value=current;
  sel.disabled=false;
  sel.removeAttribute('disabled');
  sel.style.pointerEvents='auto';
}

function ensureUserRoles(){
  const sel=document.getElementById('muRole');
  if(!sel)return;
  const current=normRole(sel.value);
  sel.innerHTML=FINAL_ROLES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  if(FINAL_ROLES.some(x=>x[0]===current))sel.value=current;
}

function ensureLocations(){
  const roleSel=document.getElementById('muRole');
  const locSel=document.getElementById('muLocation');
  if(!roleSel||!locSel)return;
  let m={locations:[]};try{m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||m}catch(e){}
  const r=normRole(roleSel.value), current=String(locSel.value||'');
  const rows=(Array.isArray(m.locations)?m.locations:[]).filter(x=>x&&x.active!==false);
  const opts=[];
  if(r==='admin')opts.push(['ALL','Sve lokacije']);
  rows.forEach(x=>opts.push([String(x.id),String(x.name||'').trim()||'Lokacija']));
  locSel.innerHTML='<option value="">ODABERI LOKACIJU</option>'+opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  locSel.value=opts.some(x=>x[0]===current)?current:(r==='admin'?'ALL':'');
}

function warehouseRowsForLocation(loc){
  let m={locations:[],warehouses:[]};try{m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||m}catch(e){}
  const locations=Array.isArray(m.locations)?m.locations:[], warehouses=Array.isArray(m.warehouses)?m.warehouses:[];
  const locMap=new Map(locations.filter(x=>x&&x.active!==false).map(x=>[String(x.id),String(x.name||'').trim()]));
  return warehouses.filter(w=>w&&w.active!==false&&locMap.has(String(w.location_id))&&(!loc||loc==='ALL'||String(w.location_id)===String(loc))).map(w=>({code:String(w.id),name:String(w.name||'').trim()||'Skladište',location:locMap.get(String(w.location_id))||''}));
}

function renderWarehousePicker(){
  const host=document.getElementById('muWarehousePicker');
  if(!host)return;
  const loc=String(document.getElementById('muLocation')?.value||'DU').toUpperCase();
  const rows=warehouseRowsForLocation(loc);

  host.innerHTML=
    `<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:900;cursor:pointer">
      <input id="muAllWarehouses" type="checkbox" style="width:auto">
      ${loc==='ALL'?'SVA SKLADIŠTA':'SVA SKLADIŠTA LOKACIJE'}
    </label>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:6px">
      ${rows.map(w=>`
        <label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #294252;border-radius:7px;cursor:pointer">
          <input type="checkbox" name="muWarehouse" value="${String(w.code).replace(/"/g,'&quot;')}" style="width:auto">
          <span><strong>${String(w.code)}</strong><br><small>${String(w.name||w.code)}${loc==='ALL'&&w.location?' · '+String(w.location):''}</small></span>
        </label>
      `).join('')}
    </div>`;

  const all=host.querySelector('#muAllWarehouses');
  const boxes=[...host.querySelectorAll('input[name="muWarehouse"]')];
  if(all){
    all.onchange=()=>boxes.forEach(b=>b.checked=all.checked);
  }
  boxes.forEach(b=>{
    b.onchange=()=>{
      if(all)all.checked=boxes.length>0&&boxes.every(x=>x.checked);
    };
  });
}

function enableCreateButton(){
  const btn=document.getElementById('muSave');
  if(!btn)return;
  btn.type='button';
  btn.disabled=false;
  btn.removeAttribute('disabled');
  btn.removeAttribute('aria-disabled');
  btn.style.setProperty('pointer-events','auto','important');
  btn.style.setProperty('opacity','1','important');
  btn.style.setProperty('cursor','pointer','important');
  btn.textContent='KREIRAJ KORISNIČKI PROFIL';
}

function applyUserAdmin(){
  ensureLoginRoles();

  const panel=document.getElementById('masterUserAdmin');
  if(!panel)return;

  ensureUserRoles();
  ensureLocations();
  renderWarehousePicker();
  enableCreateButton();

  if(loggedRole()==='admin'){
    panel.style.removeProperty('display');
    panel.style.setProperty('pointer-events','auto','important');
  }
}

function applySoon(){
  [0,40,150,500].forEach(ms=>setTimeout(()=>{
    ensureLoginRoles();
    applyUserAdmin();
  },ms));
}

document.addEventListener('change',e=>{
  if(e.target?.id==='muRole'){
    ensureLocations();
    renderWarehousePicker();
    enableCreateButton();
  }else if(e.target?.id==='muLocation'){
    renderWarehousePicker();
    enableCreateButton();
  }
},true);

document.addEventListener('click',e=>{
  if(e.target?.closest?.('[data-view="settings"],[data-home-target="settings"],#homeMenu')){
    applySoon();
  }
},true);

window.addEventListener('yardivo:login',applySoon);
window.addEventListener('load',applySoon);
document.addEventListener('DOMContentLoaded',applySoon,{once:true});

window.YardivoV545UserAdmin={
  refresh:applyUserAdmin,
  loginRoles:ensureLoginRoles,
  warehouses:renderWarehousePicker
};
})();
