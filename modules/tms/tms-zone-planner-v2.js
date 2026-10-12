(function(){
'use strict';
if(window.YardOnTMSPlanner?.version)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const keyName='yardon_tms_google_browser_key_v1';
const state={zones:[],stores:[],trips:[],pallets:[],warehouse:'',zoneId:'',draft:[],zoneName:'',zoneColor:'#16c5eb',mode:'polygon',pin:null,map:null,selection:'',query:'',notice:'',busy:false,seq:0,rendered:''};
const zone=()=>state.zones.find(x=>x.id===state.zoneId)||null;
const zstores=id=>state.stores.filter(x=>x.zone_id===id);
const ztrips=id=>state.trips.filter(x=>x.zone_id===id&&x.status!=='cancelled');
const pallets=id=>state.pallets.filter(x=>x.zone_id===id);
const tripsPallets=id=>state.pallets.filter(x=>x.trip_id===id);
const active=()=>document.querySelector('.view.active')?.id||'';
const host=id=>document.querySelector('#'+id+' .tms-live-host');
function wh(){
 const allowed=window.currentSession?.warehouses||[];
 const glob=$('#globalWarehouse')?.value||'';
 if(glob&&glob!=='ALL'&&(!allowed.length||allowed.includes(glob)))return glob;
 if(allowed.length)return allowed[0];
 try{
  const m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
  return String(m?.warehouses?.find?.(x=>x.active!==false)?.id||'');
 }catch(_){return ''}
}
async function api(){if(!window.YardivoAuth?.client)throw Error('Prijavi se u YARD ON za rad s TMS-om.');return await window.YardivoAuth.client();}
function tell(msg,isError=false){state.notice=msg;const el=document.querySelector('#'+active()+' .tms-flash');if(el){el.textContent=msg;el.className='tms-flash'+(isError?' is-error':'');el.hidden=!msg;}}
function errorMessage(e){
 const s=String(e?.message||e||'Nepoznata greška');
 if(s.includes('TMS_TRUCK_FULL'))return 'Kamion je pun: dodjela nije spremljena.';
 if(s.includes('TMS_TRIP_CLOSED'))return 'Tura je zaključana i ne prima palete.';
 if(s.includes('duplicate key'))return 'Šifra već postoji u ovom skladištu.';
 if(s.includes('foreign key'))return 'Ova zona, trgovina ili tura još se koristi. Najprije ukloni povezane podatke.';
 if(s.includes('row-level security'))return 'Nemaš ovlasti za ovu radnju ili ovo skladište.';
 return s;
}
async function run(task,success){
 if(state.busy){tell('Prethodno spremanje još traje. Pričekaj i pokušaj ponovno.',true);return;}state.busy=true;
 try{await task();state.selection='';await load();draw(active());tell(success||'Spremljeno.');}
 catch(e){console.warn('YARD ON TMS',e);tell(errorMessage(e),true);}
 finally{state.busy=false;}
}
async function load(){
 const token=++state.seq;
 state.warehouse=wh();
 if(!state.warehouse)throw Error('Odaberi aktivno skladište u zaglavlju YARD ON-a.');
 const c=await api();
 const names=['yardon_tms_zones','yardon_tms_stores','yardon_tms_trips','yardon_tms_pallets'];
 const rs=await Promise.all(names.map(n=>c.from(n).select('*').eq('warehouse',state.warehouse).order('created_at',{ascending:true})));
 if(token!==state.seq)return;
 for(const r of rs)if(r.error)throw r.error;
 [state.zones,state.stores,state.trips,state.pallets]=rs.map(r=>r.data||[]);
 if(!state.zones.some(x=>x.id===state.zoneId)){
   const first=state.zones[0];
   state.zoneId=first?.id||'';
   state.draft=Array.isArray(first?.polygon)?first.polygon.map(p=>({...p})):[];
   state.zoneName=first?.name||'';
   state.zoneColor=first?.color||'#16c5eb';
 }
}
const pill=(label,kind)=>'<span class="tms-chip tms-'+(kind||'muted')+'">'+esc(label)+'</span>';
const msg=()=>'<div class="tms-flash" hidden role="status" aria-live="polite"></div>';
const none=(a,b)=>'<div class="tms-empty"><strong>'+esc(a)+'</strong><p>'+esc(b)+'</p></div>';
const btn=(action,label,cls='')=>'<button type="button" class="tms-btn '+cls+'" data-tms-action="'+action+'">'+label+'</button>';
const navigation=id=>'<button type="button" class="tms-btn tms-outline" data-tms-go="'+id+'">'+(id==='tmsSettings'?'⚙ Postavke zona':'⇢ Planiranje tura')+'</button>';
function zoneOptions(){
 return state.zones.map(z=>'<option value="'+esc(z.id)+'" '+(z.id===state.zoneId?'selected':'')+'>'+esc(z.name)+'</option>').join('');
}
function draw(id){
 if(!host(id))return;
 state.rendered=id;
 const fn={tmsControl:control,tmsZones:zonesView,tmsSettings:settingsView,tmsRoutes:routesView,tmsLoads:loadsView}[id];
 if(!fn)return;
 host(id).innerHTML='<div class="tms-real">'+fn() +msg()+'</div>';
 if(id==='tmsSettings')requestAnimationFrame(initMap);
}
async function render(id){
 if(!host(id))return;
 host(id).innerHTML='<div class="tms-real">'+none('Učitavanje TMS-a','Dohvaćam stvarne podatke za odabrano skladište.')+'</div>';
 try{await load();draw(id)}catch(e){host(id).innerHTML='<div class="tms-real">'+none('TMS nije dostupan',errorMessage(e))+btn('refresh','Pokušaj ponovno')+'</div>';}
}
function top(label,sub,extra=''){
 return '<div class="tms-section-head"><div><small>SKLADIŠTE '+esc(state.warehouse)+'</small><h2>'+esc(label)+'</h2><p>'+esc(sub)+'</p></div><div class="tms-section-actions">'+extra+btn('refresh','↻ Osvježi','tms-outline')+'</div></div>';
}
function control(){
 const activeTrips=state.trips.filter(t=>['planned','loading'].includes(t.status));
 const assigned=state.pallets.filter(p=>p.trip_id).length;
 const free=state.pallets.length-assigned;
 return top('Transport Control Tower','Živi pregled iz Supabase TMS tablica.',navigation('tmsRoutes'))+
 '<div class="tms-stat-grid">'+[
 [state.zones.length,'Aktivne zone'],[state.stores.length,'Trgovine'],[activeTrips.length,'Planirane ture'],[free,'Neraspoređene palete']
 ].map(v=>'<div class="tms-stat"><strong>'+v[0]+'</strong><small>'+v[1]+'</small></div>').join('')+'</div>'+
 '<div class="tms-box"><h3>Otpreme u planiranju</h3>'+
 (activeTrips.length?'<div class="tms-trip-table">'+activeTrips.map(t=>'<div class="tms-table-line"><strong>🚚 '+esc(t.plate)+'</strong><span>'+esc(state.zones.find(z=>z.id===t.zone_id)?.name||'')+'</span><span>'+tripsPallets(t.id).length+' / '+t.capacity_pallets+' paleta</span></div>').join('')+'</div>':none('Još nema tura','Otvori Planiranje tura, kreiraj kamion i dodijeli mu palete.'))+'</div>';
}
function zonesView(){
 const z=zone(),stores=z?zstores(z.id):[],p=z?pallets(z.id):[];
 return top('Zonska karta Hrvatske','Odaberi zonu i pogledaj trgovine te palete koje tu idu.',navigation('tmsSettings'))+
 '<div class="tms-zone-overview"><div class="tms-box"><h3>Zone otpreme</h3><div class="tms-zone-selector">'+(state.zones.length?state.zones.map(z=>'<button type="button" data-tms-select-zone="'+esc(z.id)+'" class="tms-zone-choice '+(z.id===state.zoneId?'selected':'')+'"><i style="background:'+esc(z.color)+'"></i><strong>'+esc(z.name)+'</strong><small>'+zstores(z.id).length+' trgovina · '+pallets(z.id).length+' paleta</small></button>').join(''):none('Nema zona','Otvori Postavke zona i nacrtaj prvu zonu.'))+'</div></div>'+
 '<div class="tms-box"><h3>'+esc(z?.name||'Odaberi zonu')+'</h3><div class="tms-inline-metrics">'+pill(stores.length+' trgovina','info')+pill(p.length+' paleta','ok')+pill(z?ztrips(z.id).length+' kamiona':'0 kamiona','muted')+'</div>'+
 (stores.length?'<div class="tms-store-lines">'+stores.map(s=>'<div class="tms-table-line"><strong>'+esc(s.name)+'</strong><span>'+esc(s.city)+'</span><span>'+state.pallets.filter(p=>p.store_id===s.id).length+' paleta</span></div>').join('')+'</div>':none('Nema trgovina u zoni','Dodaj ih u Postavkama zona.'))+
 navigation('tmsRoutes')+'</div></div>';
}
function settingsView(){
 const z=zone(),stores=state.stores.filter(s=>!state.zoneId||s.zone_id===state.zoneId);
 const mapKey=!!localStorage.getItem(keyName);
 return top('Postavke zona','Crtanje geografskih granica i upravljanje trgovinama po zonama.',navigation('tmsRoutes'))+
 '<div class="tms-settings-layout"><div class="tms-box tms-config"><h3>Operativne zone</h3>'+
 '<div class="tms-zone-selector">'+state.zones.map(z=>'<button type="button" class="tms-zone-choice '+(z.id===state.zoneId?'selected':'')+'" data-tms-select-zone="'+esc(z.id)+'"><i style="background:'+esc(z.color)+'"></i><strong>'+esc(z.name)+'</strong><small>'+zstores(z.id).length+' trgovina</small></button>').join('')+'</div>'+
 btn('newZone','＋ Nova zona','tms-primary')+
 '<form data-tms-form="zone" class="tms-form"><label>Naziv zone<input id="tmsZoneName" name="name" required maxlength="100" value="'+esc(state.zoneName)+'" placeholder="npr. Dalmacija"/></label>'+
 '<label>Boja zone<input id="tmsZoneColor" name="color" type="color" value="'+esc(state.zoneColor)+'"/></label>'+
 '<p class="tms-hint">Klikaj na kartu kako bi dodao vrhove poligona. Najmanje 3 točke. Za izmjenu postojeće zone koristi Novo crtanje.</p>'+
 '<div class="tms-inline-actions">'+btn('clearPolygon','Novo crtanje','tms-outline')+btn('undoPoint','↶ Zadnja točka','tms-outline')+'</div>'+
 '<small id="tmsPointCount">'+state.draft.length+' točaka</small>'+
 '<button class="tms-btn tms-primary" type="submit">✓ Spremi zonu</button></form>'+
 (z?btn('deleteZone','Obriši zonu','tms-danger'):'')+
 '<div class="tms-map-key"><strong>Google Maps</strong><p>Za Google kartu unesi vlastiti browser API key, ograničen na tvoju web domenu. Bez njega radi OpenStreetMap karta.</p>'+
 '<label>Google Maps API key<input id="tmsGoogleKey" type="password" autocomplete="off" placeholder="'+(mapKey?'Ključ spremljen na ovom uređaju':'API key')+'"/></label>'+
 btn('saveMapKey','Spremi ključ','tms-outline')+(mapKey?btn('clearMapKey','Ukloni ključ','tms-outline'):'')+'</div></div>'+
 '<div class="tms-box tms-map-box"><div class="tms-map-toolbar"><strong>🗺️ Karta zona</strong><span id="tmsMapProvider">Učitavanje karte...</span>'+
 '<div class="tms-inline-actions"><button type="button" class="tms-btn '+(state.mode==='polygon'?'tms-primary':'tms-outline')+'" data-tms-action="drawMode">Crtaj zonu</button>'+
 '<button type="button" class="tms-btn '+(state.mode==='pin'?'tms-primary':'tms-outline')+'" data-tms-action="pinMode">Pozicija trgovine</button></div></div>'+
 '<div id="tmsGoogleMap" class="tms-map-canvas" role="application" aria-label="Karta Hrvatske za crtanje zona"></div>'+
 '<p class="tms-hint">Granice su interne logističke zone, a ne administrativne granice Hrvatske. Za spremanje poligona treba najmanje tri točke.</p></div></div>'+
 '<div class="tms-box tms-stores-box"><h3>Trgovine u odabranoj zoni '+pill(z?.name||'Odaberi zonu','info')+'</h3>'+
 '<form data-tms-form="store" class="tms-form tms-store-form"><label>Šifra trgovine<input name="code" required maxlength="40" placeholder="npr. ST-001"/></label>'+
 '<label>Naziv trgovine<input name="name" required maxlength="120" placeholder="Trgovina Split"/></label>'+
 '<label>Grad<input name="city" placeholder="Split" maxlength="100"/></label>'+
 '<label>Zona<select name="zone_id" required>'+zoneOptions()+'</select></label>'+
 '<label>Koordinate (klik na kartu)<input id="tmsStoreCoord" readonly placeholder="Odaberi Pozicija trgovine i klikni kartu" value="'+(state.pin?esc(state.pin.lat.toFixed(5)+', '+state.pin.lng.toFixed(5)):'')+'"/></label>'+
 '<button type="submit" class="tms-btn tms-primary" '+(!state.zones.length?'disabled':'')+'>＋ Dodaj trgovinu</button></form>'+
 '<div class="tms-store-lines">'+(stores.length?stores.map(s=>'<div class="tms-table-line"><strong>'+esc(s.name)+'</strong><span>'+esc(s.code)+' · '+esc(s.city)+'</span><span>'+esc(state.zones.find(z=>z.id===s.zone_id)?.name||'')+'</span><button type="button" data-tms-delete-store="'+esc(s.id)+'" class="tms-small-delete" title="Obriši trgovinu bez paleta">✕</button></div>').join(''):none('Još nema trgovina','Dodaj trgovinu i ona će odmah biti dostupna za planiranje tura.'))+'</div></div>';
}
function palletCard(p){
 const store=state.stores.find(s=>s.id===p.store_id);
 return '<div draggable="true" data-tms-pallet="'+esc(p.id)+'" role="button" tabindex="0" class="tms-pallet '+(state.selection===p.id?'selected':'')+'">'+
 '<span class="tms-pallet-icon">▣</span><div><strong>'+esc(p.pallet_code)+'</strong><small>'+esc(store?.name||'Nepoznata trgovina')+' · '+esc(store?.city||'')+'</small></div>'+
 '<span class="tms-grab" title="Povuci paletu">⠿</span></div>';
}
function truckCard(t){
 const ps=tripsPallets(t.id),ratio=Math.round(ps.length/t.capacity_pallets*100);
 const cap=(ps.length>=t.capacity_pallets),closed=!['planned','loading'].includes(t.status);
 return '<article class="tms-truck tms-trip-drop '+(cap||closed?'full':'')+'" data-tms-trip="'+esc(t.id)+'" tabindex="0" aria-label="Dodijeli paletu kamionu '+esc(t.plate)+'">'+
 '<div class="tms-truck-head"><span class="tms-truck-icon">🚚</span><div><strong>'+esc(t.plate)+'</strong><small>'+esc(t.carrier||'Bez prijevoznika')+'</small></div>'+pill(t.status==='planned'?'Planirano':t.status==='loading'?'Utovar':t.status,'info')+'</div>'+
 '<div class="tms-truck-meta"><span>'+ps.length+' / '+t.capacity_pallets+' paleta</span><span>'+esc(t.departure_on||'')+'</span></div>'+
 '<div class="tms-cap-track"><div style="width:'+ratio+'%"></div></div>'+
 '<div class="tms-truck-zone">'+esc(state.zones.find(z=>z.id===t.zone_id)?.name||'')+'</div>'+
 '<div class="tms-truck-pallets">'+(ps.length?ps.map(p=>'<div class="tms-loaded-pallet"><span>▣ '+esc(p.pallet_code)+'</span><button type="button" title="Vrati paletu" data-tms-unassign="'+esc(p.id)+'">↶</button></div>').join(''):!closed?'<div class="tms-drop-empty">＋ Povuci paletu ovdje ili klikni na paletu pa na kamion</div>':'')+'</div>'+
 (cap?pill('Kamion je popunjen','warning'):'')+'</article>';
}
function routesView(){
 const z=zone(),rows=state.pallets.filter(p=>p.zone_id===state.zoneId&&!p.trip_id),q=state.query.toLocaleLowerCase('hr-HR');
 const shown=rows.filter(p=>{const s=state.stores.find(x=>x.id===p.store_id);return !q||String(p.pallet_code+' '+(s?.name||'')+' '+(s?.city||'')).toLocaleLowerCase('hr-HR').includes(q)}).slice(0,160);
 const fleet=z?ztrips(z.id):[];
 return top('Planiranje tura','Uzmi paletu i prevuci je na kamion. Dodjela se odmah sprema u Supabase.',navigation('tmsSettings'))+
 '<div class="tms-planner-toolbar"><label>Zona<select id="tmsPlanZone" '+(!state.zones.length?'disabled':'')+'>'+zoneOptions()+'</select></label>'+
 pill(rows.length+' slobodnih paleta','info')+pill(fleet.length+' kamiona','muted')+
 '<span class="tms-hint">Na mobitelu: dodirni paletu pa kamion.</span></div>'+
 (!z?none('Najprije kreiraj zonu','Postavke zona → Nacrtaj zonu → Dodaj trgovine. ')+navigation('tmsSettings'):
 '<div class="tms-plan-grid"><section class="tms-bank"><div class="tms-box"><h3>▣ Banka paleta <small>'+rows.length+' neraspoređenih</small></h3>'+
 '<form data-tms-form="pallets" class="tms-inline-form"><label>Trgovina<select name="store_id" required>'+zstores(z.id).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(s.city)+'</option>').join('')+'</select></label>'+
 '<label>Količina paleta<input name="quantity" type="number" min="1" max="66" value="1" required/></label>'+
 '<button class="tms-btn tms-primary" type="submit" '+(!zstores(z.id).length?'disabled':'')+'>＋ Dodaj palete</button></form>'+
 '<input id="tmsPalletSearch" aria-label="Pretraži palete" placeholder="Pretraži paletu ili trgovinu..." value="'+esc(state.query)+'"/>'+
 '<div class="tms-pallet-stack">'+(shown.length?shown.map(palletCard).join(''):none('Nema slobodnih paleta','Dodaj palete za trgovinu ili promijeni zonu.'))+'</div>'+
 (rows.length>160?'<small>Prikaz prvih 160. Koristi pretragu za ostale.</small>':'')+
 '</div></section><section class="tms-fleet"><div class="tms-box"><h3>🚚 Kamioni / Ture <small>'+fleet.length+'</small></h3>'+
 '<form data-tms-form="trip" class="tms-inline-form"><label>Registracija<input name="plate" placeholder="ZG 1234 AB" maxlength="32" required/></label>'+
 '<label>Prijevoznik<input name="carrier" placeholder="Naziv prijevoznika" maxlength="100"/></label>'+
 '<label>Kapacitet EPAL<input name="capacity_pallets" type="number" value="33" min="1" max="66" required/></label>'+
 '<label>Datum otpreme<input name="departure_on" type="date" value="'+new Date().toLocaleDateString('en-CA')+'" required/></label>'+
 '<button type="submit" class="tms-btn tms-primary">＋ Dodaj kamion</button></form></div>'+
 '<div class="tms-truck-grid">'+(fleet.length?fleet.map(truckCard).join(''):none('Još nema kamiona','Unesi registraciju, prijevoznika i kapacitet za novu turu.'))+'</div></section></div>');
}
function loadsView(){
 return top('Utovari i palete','Planirane dodjele za mobilni Outbound i buduću potvrdu skeniranja.',navigation('tmsRoutes'))+
 '<div class="tms-truck-grid">'+(state.trips.length?state.trips.map(truckCard).join(''):none('Nema utovara','Kreiraj turu i dodijeli joj palete u Planiranju tura.'))+'</div>'+
 '<p class="tms-hint">Dodjela paleta nije potvrda fizičkog utovara. Fizički utovar i izlazak mora potvrditi operater odgovarajuće role.</p>';
}
function selectZone(id){
 const z=state.zones.find(x=>x.id===id);if(!z)return;
 state.zoneId=id;state.draft=Array.isArray(z.polygon)?z.polygon.map(p=>({lat:Number(p.lat),lng:Number(p.lng)})):[];
 state.zoneName=z.name;state.zoneColor=z.color;state.pin=null;
 draw(active());
}
function refreshMapInfo(){
 const el=$('#tmsPointCount');if(el)el.textContent=state.draft.length+' točaka';
 if(!state.map)return;
 const m=state.map;
 if(m.kind==='google'){
  m.draft.setPath(state.draft);
 }else{
  m.draft.setLatLngs(state.draft.map(p=>[p.lat,p.lng]));
 }
}
function addMapPoint(lat,lng){
 if(state.mode==='pin'){
  state.pin={lat,lng};const el=$('#tmsStoreCoord');if(el)el.value=lat.toFixed(5)+', '+lng.toFixed(5);
  return;
 }
 if(state.draft.length>=250){tell('Najviše 250 točaka po zoni.',true);return}
 state.draft.push({lat:Number(lat.toFixed(6)),lng:Number(lng.toFixed(6))});refreshMapInfo();
}
let leafletPromise=null,googlePromise=null;
function js(url){return new Promise((resolve,reject)=>{
 const s=document.createElement('script');s.src=url;s.async=true;s.onload=resolve;s.onerror=()=>reject(Error('Karta se ne može učitati. Provjeri mrežu i API ključ.'));document.head.appendChild(s);
})}
async function mapProvider(){
 const key=localStorage.getItem(keyName)||'';
 if(key){
  if(!window.google?.maps){
   if(!googlePromise)googlePromise=js('https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=quarterly&loading=async');
   await googlePromise;
  }
  if(!window.google?.maps)throw Error('Google Maps JavaScript API nije dostupan.');
  return 'google';
 }
 if(!window.L){
  if(!document.getElementById('tms-leaflet-css')){
   const link=document.createElement('link');link.id='tms-leaflet-css';link.rel='stylesheet';
   link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(link);
  }
  if(!leafletPromise)leafletPromise=js('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
  await leafletPromise;
 }
 return 'osm';
}
function destroyMap(){
 if(!state.map)return;
 try{if(state.map.kind==='osm')state.map.map.remove();else{
  state.map.shapes.forEach(s=>s.setMap(null));state.map.draft.setMap(null);
  window.google?.maps?.event?.clearInstanceListeners?.(state.map.map);
 }}catch(_){}
 state.map=null;
}
async function initMap(){
 const el=$('#tmsGoogleMap');if(!el||!document.getElementById('tmsSettings')?.classList.contains('active'))return;
 destroyMap();
 const target=el,scope=++state.mapSeq||1;state.mapSeq=scope;
 try{
  const provider=await mapProvider();
  if(scope!==state.mapSeq||!target.isConnected)return;
  const p=$('#tmsMapProvider');if(p)p.textContent=provider==='google'?'Google Maps':'OpenStreetMap (bez Google ključa)';
  const all=state.zones.filter(z=>Array.isArray(z.polygon)&&z.polygon.length>=3);
  if(provider==='google'){
   const maps=window.google.maps;
   const map=new maps.Map(target,{center:{lat:45.3,lng:16.4},zoom:7,mapTypeControl:false,streetViewControl:false,fullscreenControl:true});
   const shapes=[];
   for(const z of all){
    const poly=new maps.Polygon({paths:z.polygon,strokeColor:z.color,fillColor:z.color,strokeOpacity:.9,fillOpacity:.19,strokeWeight:2,map});
    poly.addListener('click',()=>selectZone(z.id));shapes.push(poly);
   }
   for(const s of state.stores.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng))){
    shapes.push(new maps.Marker({position:{lat:s.lat,lng:s.lng},map,title:s.name}));
   }
   const draft=new maps.Polyline({map,path:state.draft,strokeColor:'#22e3fd',strokeWeight:4});
   map.addListener('click',e=>addMapPoint(e.latLng.lat(),e.latLng.lng()));
   state.map={kind:'google',map,draft,shapes};
  }else{
   const L=window.L,map=L.map(target,{zoomControl:true}).setView([45.3,16.4],7);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);
   for(const z of all){L.polygon(z.polygon.map(p=>[p.lat,p.lng]),{color:z.color,weight:2,fillOpacity:.22}).addTo(map).on('click',()=>selectZone(z.id));}
   for(const s of state.stores.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)))L.circleMarker([s.lat,s.lng],{radius:5,color:'#fce86a'}).bindPopup(esc(s.name)).addTo(map);
   const draft=L.polyline(state.draft.map(p=>[p.lat,p.lng]),{color:'#22e3fd',weight:4}).addTo(map);
   map.on('click',e=>addMapPoint(e.latlng.lat,e.latlng.lng));
   state.map={kind:'osm',map,draft};
   setTimeout(()=>map.invalidateSize(),100);
  }
 }catch(e){if(scope!==state.mapSeq)return;target.innerHTML='<div class="tms-map-error">'+esc(errorMessage(e))+'</div>';const p=$('#tmsMapProvider');if(p)p.textContent='Karta nije dostupna';}
}
async function saveZone(form){
 const fd=new FormData(form),name=String(fd.get('name')||'').trim(),color=String(fd.get('color')||'#16c5eb');
 if(name.length<2||state.draft.length<3)throw Error('Unesi naziv i nacrtaj najmanje tri točke na karti.');
 const payload={name,color,polygon:state.draft,warehouse:state.warehouse},c=await api(),selected=zone();
 const response=selected?await c.from('yardon_tms_zones').update(payload).eq('id',selected.id).eq('warehouse',state.warehouse).select('id').single()
 :await c.from('yardon_tms_zones').insert(payload).select('id').single();
 if(response.error)throw response.error;
 state.zoneId=response.data.id;state.zoneName=name;state.zoneColor=color;
}
async function saveStore(form){
 const fd=new FormData(form),c=await api(),z=String(fd.get('zone_id')||'');
 if(!state.zones.some(x=>x.id===z))throw Error('Odaberi zonu.');
 const payload={warehouse:state.warehouse,zone_id:z,code:String(fd.get('code')||'').trim(),name:String(fd.get('name')||'').trim(),city:String(fd.get('city')||'').trim()};
 if(state.pin){payload.lat=state.pin.lat;payload.lng=state.pin.lng;}
 const result=await c.from('yardon_tms_stores').insert(payload);
 if(result.error)throw result.error;state.pin=null;
}
async function saveTrip(form){
 const z=zone();if(!z)throw Error('Odaberi zonu.');
 const f=new FormData(form),c=await api();
 const cap=Number(f.get('capacity_pallets'));
 if(!Number.isInteger(cap)||cap<1||cap>66)throw Error('Kapacitet mora biti od 1 do 66 paleta.');
 const payload={warehouse:state.warehouse,zone_id:z.id,plate:String(f.get('plate')||'').trim().toUpperCase(),carrier:String(f.get('carrier')||'').trim(),capacity_pallets:cap,departure_on:f.get('departure_on')};
 const x=await c.from('yardon_tms_trips').insert(payload);
 if(x.error)throw x.error;
}
async function savePallets(form){
 const f=new FormData(form),qty=Number(f.get('quantity')),store=state.stores.find(s=>s.id===f.get('store_id'));
 if(!store||store.zone_id!==state.zoneId||!Number.isInteger(qty)||qty<1||qty>66)throw Error('Odaberi trgovinu i količinu 1–66.');
 const rows=Array.from({length:qty},()=>({warehouse:state.warehouse,zone_id:store.zone_id,store_id:store.id,
  pallet_code:'PAL-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().slice(0,8).toUpperCase()}));
 const c=await api(),x=await c.from('yardon_tms_pallets').insert(rows);if(x.error)throw x.error;
}
async function assign(id,tripId){
 const p=state.pallets.find(x=>x.id===id),t=state.trips.find(x=>x.id===tripId);
 if(!p||!t||p.zone_id!==t.zone_id)throw Error('Paleta i kamion moraju pripadati istoj zoni.');
 if(t.status!=='planned'&&t.status!=='loading')throw Error('Tura nije otvorena.');
 const c=await api(),x=await c.from('yardon_tms_pallets').update({trip_id:tripId}).eq('id',id).eq('warehouse',state.warehouse).is('trip_id',null).select('id');
 if(x.error)throw x.error;
 if(!x.data?.length)throw Error('Paleta je u međuvremenu dodijeljena drugom kamionu. Osvježi plan.');
}
async function unassign(id){
 const c=await api(),x=await c.from('yardon_tms_pallets').update({trip_id:null}).eq('id',id).eq('warehouse',state.warehouse);
 if(x.error)throw x.error;
}
document.addEventListener('submit',e=>{
 const form=e.target.closest?.('[data-tms-form]');if(!form)return;
 e.preventDefault();
 const kind=form.dataset.tmsForm;
 run(()=>({zone:saveZone,store:saveStore,trip:saveTrip,pallets:savePallets}[kind])(form),
 {zone:'Zona je spremljena.',store:'Trgovina je dodana.',trip:'Kamion je dodan.',pallets:'Palete su dodane.'}[kind]);
});
document.addEventListener('input',e=>{
 if(e.target?.id==='tmsZoneName')state.zoneName=e.target.value;
 if(e.target?.id==='tmsZoneColor')state.zoneColor=e.target.value;
 if(e.target?.id==='tmsPalletSearch'){
  state.query=e.target.value;
  const stack=$('.tms-pallet-stack');if(!stack)return;
  const q=state.query.toLocaleLowerCase('hr-HR');
  const free=state.pallets.filter(p=>p.zone_id===state.zoneId&&!p.trip_id);
  const matched=free.filter(p=>{const s=state.stores.find(x=>x.id===p.store_id);return (p.pallet_code+' '+(s?.name||'')).toLocaleLowerCase('hr-HR').includes(q)}).slice(0,160);
  stack.innerHTML=matched.map(palletCard).join('')||none('Nema rezultata','Promijeni upit.');
 }
});
document.addEventListener('change',e=>{
 if(e.target?.id==='tmsPlanZone'){selectZone(e.target.value);}
});
document.addEventListener('click',e=>{
 const pick=e.target.closest?.('[data-tms-select-zone]');if(pick){selectZone(pick.dataset.tmsSelectZone);return;}
 const pallet=e.target.closest?.('[data-tms-pallet]');
 if(pallet){state.selection=pallet.dataset.tmsPallet;document.querySelectorAll('[data-tms-pallet]').forEach(el=>el.classList.toggle('selected',el===pallet));tell('Paleta odabrana. Klikni na željeni kamion.');return;}
 const undo=e.target.closest?.('[data-tms-unassign]');
 if(undo){e.stopPropagation();run(()=>unassign(undo.dataset.tmsUnassign),'Paleta vraćena u banku.');return;}
 const del=e.target.closest?.('[data-tms-delete-store]');
 if(del){if(!confirm('Obrisati trgovinu? Brisanje nije moguće ako postoje palete.'))return;run(async()=>{
 const c=await api(),x=await c.from('yardon_tms_stores').delete().eq('id',del.dataset.tmsDeleteStore).eq('warehouse',state.warehouse);if(x.error)throw x.error;
 },'Trgovina obrisana.');return;}
 const truck=e.target.closest?.('[data-tms-trip]');
 if(truck&&state.selection){const p=state.selection;run(()=>assign(p,truck.dataset.tmsTrip),'Paleta dodijeljena kamionu.');return;}
 const act=e.target.closest?.('[data-tms-action]');if(!act)return;
 const action=act.dataset.tmsAction;
 if(action==='refresh'){render(active());return}
 if(action==='newZone'){state.zoneId='';state.zoneName='';state.zoneColor='#16c5eb';state.draft=[];state.pin=null;draw('tmsSettings');return}
 if(action==='clearPolygon'){state.draft=[];refreshMapInfo();return}
 if(action==='undoPoint'){state.draft.pop();refreshMapInfo();return}
 if(action==='drawMode'||action==='pinMode'){state.mode=action==='drawMode'?'polygon':'pin';const msg=state.mode==='pin'?'Klikni kartu za poziciju nove trgovine.':'Klikni kartu za dodavanje točaka zone.';tell(msg);document.querySelectorAll('[data-tms-action="drawMode"],[data-tms-action="pinMode"]').forEach(b=>b.classList.toggle('tms-primary',b===act));return}
 if(action==='saveMapKey'){
  const value=String($('#tmsGoogleKey')?.value||'').trim();
  if(!value)return tell('Unesi browser API key za Google Maps.',true);
  localStorage.setItem(keyName,value);tell('Google ključ spremljen samo u ovom pregledniku. Ponovno otvori Postavke zona za Google kartu.');
  state.mapSeq=(state.mapSeq||0)+1;destroyMap();render('tmsSettings');return;
 }
 if(action==='clearMapKey'){localStorage.removeItem(keyName);googlePromise=null;render('tmsSettings');return}
 if(action==='deleteZone'){
  if(!zone()||!confirm('Obrisati ovu zonu? Mora biti bez trgovina i tura.'))return;
  const id=state.zoneId;
  run(async()=>{const c=await api(),x=await c.from('yardon_tms_zones').delete().eq('id',id).eq('warehouse',state.warehouse);if(x.error)throw x.error;state.zoneId='';},'Zona obrisana.');
 }
});
document.addEventListener('dragstart',e=>{
 const p=e.target.closest?.('[data-tms-pallet]');if(!p)return;
 e.dataTransfer?.setData('text/plain',p.dataset.tmsPallet);
 if(e.dataTransfer)e.dataTransfer.effectAllowed='move';
});
document.addEventListener('dragover',e=>{
 const t=e.target.closest?.('[data-tms-trip]');if(!t)return;
 const trip=state.trips.find(x=>x.id===t.dataset.tmsTrip);
 if(!trip||!['planned','loading'].includes(trip.status))return;
 e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';t.classList.add('drag-over');
});
document.addEventListener('dragleave',e=>{
 const t=e.target.closest?.('[data-tms-trip]');if(t&&!t.contains(e.relatedTarget))t.classList.remove('drag-over');
});
document.addEventListener('drop',e=>{
 const t=e.target.closest?.('[data-tms-trip]');if(!t)return;e.preventDefault();t.classList.remove('drag-over');
 const id=e.dataTransfer?.getData('text/plain');if(!id)return;
 run(()=>assign(id,t.dataset.tmsTrip),'Paleta je spremljena na kamion.');
});
window.addEventListener('yardivo:logout',()=>{destroyMap();state.zones=[];state.stores=[];state.trips=[];state.pallets=[];state.zoneId='';});
window.addEventListener('yardivo:login',()=>{const a=active();if(a.startsWith('tms'))render(a)});
window.addEventListener('yardivo:view-opened',e=>{const id=e?.detail?.view;if(['tmsControl','tmsZones','tmsSettings','tmsRoutes','tmsLoads'].includes(id))render(id);});
window.YardOnTMSPlanner={version:'2.0.0',render,warehouse:()=>state.warehouse,isBusy:()=>state.busy};
})();