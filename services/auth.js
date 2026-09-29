(function(){
'use strict';
if(window.YardivoAuth?.owner==='services/auth.js')return;

const ROLE_LABEL={
  admin:'Admin',
  manager:'Voditelj',
  inventory:'Upravljanje zalihama',
  reception:'Prijam',
  gate:'Porta',
  supplier:'Dobavljač'
};

function normRole(value){
  let role=String(value||'').toLowerCase().trim();
  if(role==='porta'||role==='portir')return'gate';
  if(role==='prijam')return'reception';
  if(role==='zalihe'||role==='upravljanje zalihama'||role.includes('zalih'))return'inventory';
  if(role==='management'||role==='voditelj')return'manager';
  if(role==='dobavljac'||role==='dobavljač')return'supplier';
  return role;
}

function clearLegacySession(){
  try{
    localStorage.removeItem('yardivo_custom_session');
    localStorage.removeItem('yardivo_remembered_session');
    sessionStorage.removeItem('studenac_demo_session');
  }catch(_){}
}

function setAppSession(session){
  clearLegacySession();
  try{
    window.currentSession=session;
    currentSession=session;
  }catch(_){
    window.currentSession=session;
  }
  if(session?.location){
    try{localStorage.setItem('yardivo_last_location',String(session.location))}catch(_){}
  }
}

function clearAppSession(){
  clearLegacySession();
  try{
    window.currentSession=null;
    currentSession=null;
  }catch(_){
    window.currentSession=null;
  }
  try{delete window.__yardivoSupplierAccessToken}catch(_){}
}

async function client(){
  if(!window.YardivoSupabaseClient?.client)throw new Error('Canonical Supabase client service nije učitan.');
  return await window.YardivoSupabaseClient.client();
}

function withTimeout(promise,ms,label){
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label||'SERVER NIJE ODGOVORIO — pokušaj ponovno.')),ms)})
  ]).finally(()=>clearTimeout(timer));
}

async function fetchJSON(url,options={},timeoutMs=12000){
  let lastError=null;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const res=await fetch(url,{...options,cache:'no-store',signal:controller.signal});
      const data=await res.json().catch(()=>({}));
      if(res.status===402)window.YardivoSupabaseBudgetGuard?.block?.(30*60*1000);
      return {res,data};
    }catch(e){
      lastError=e;
      const transient=e?.name==='AbortError'||/Failed to fetch|NetworkError|Load failed|network request failed/i.test(String(e?.message||e));
      if(!transient||attempt>=2)throw e;
      await new Promise(resolve=>setTimeout(resolve,350*(attempt+1)));
    }finally{
      clearTimeout(timer);
    }
  }
  throw lastError||new Error('NETWORK_REQUEST_FAILED');
}

async function loadServerProfile(c){
  const {data,error}=await c.rpc('yardivo_my_profile');
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row||!row.active)throw new Error('KORISNIČKI RAČUN NIJE AKTIVAN.');
  const role=normRole(row.app_role);
  if(!Object.prototype.hasOwnProperty.call(ROLE_LABEL,role))throw new Error('KORISNIK NEMA VALJANU YARDIVO ROLU.');
  return {
    username:String(row.username||''),
    role,
    location:String(row.location||'VG'),
    warehouses:Array.isArray(row.warehouses)?row.warehouses.map(x=>String(x).trim().toUpperCase()).filter(Boolean):[]
  };
}

async function authenticate(input={}){
  const username=String(input.username||'').trim().toLowerCase();
  const password=String(input.password||'');
  const selectedRole=normRole(input.selectedRole||'');
  const rememberMe=!!input.rememberMe;

  if(!/^[a-z0-9._-]{3,40}$/.test(username))throw new Error('UPIŠI ISPRAVNO KORISNIČKO IME.');
  if(!password)throw new Error('UPIŠI PASSWORD.');

  const base=String(window.YardivoSupabaseClient?.base||'');
  const key=String(window.YardivoSupabaseClient?.publishableKey||'');
  if(!base||!key)throw new Error('Supabase konfiguracija nije učitana.');

  const headers={apikey:key,'Content-Type':'application/json'};
  const {res:authRes,data:auth}=await fetchJSON(
    base+'/auth/v1/token?grant_type=password',
    {method:'POST',headers,body:JSON.stringify({email:username+'@yardivo.local',password})},
    10000
  );

  if(!authRes.ok||!auth?.access_token){
    if(authRes.status===402)throw new Error('SUPABASE JE PRIVREMENO ODBIO ZAHTJEV ZBOG USAGE/BILLING OGRANIČENJA. POKUŠAJ KASNIJE.');
    const raw=String(auth?.error_description||auth?.msg||auth?.message||'');
    if(/invalid login credentials/i.test(raw)||authRes.status===400||authRes.status===401){
      throw new Error('POGREŠAN USERNAME ILI PASSWORD.');
    }
    throw new Error(raw||'PRIJAVA NIJE USPJELA.');
  }

  const profileHeaders={...headers,Authorization:'Bearer '+auth.access_token};
  const {res:profileRes,data:pdata}=await fetchJSON(
    base+'/rest/v1/rpc/yardivo_my_profile',
    {method:'POST',headers:profileHeaders,body:'{}'},
    10000
  );
  if(!profileRes.ok)throw new Error(String(pdata?.message||'NE MOGU UČITATI KORISNIČKI PROFIL.'));

  const p=Array.isArray(pdata)?pdata[0]:pdata;
  if(!p||!p.active)throw new Error('KORISNIČKI RAČUN NIJE AKTIVAN.');
  const assignedRole=normRole(p.app_role);
  if(!Object.prototype.hasOwnProperty.call(ROLE_LABEL,assignedRole))throw new Error('KORISNIK NEMA VALJANU YARDIVO ROLU.');
  if(selectedRole!==assignedRole){
    throw new Error('KRIVA ROLA — ovom korisniku je dodijeljena: '+(ROLE_LABEL[assignedRole]||assignedRole)+'.');
  }

  const c=await client();
  const {error:setSessionError}=await withTimeout(c.auth.setSession({
    access_token:auth.access_token,
    refresh_token:auth.refresh_token
  }),7000,'AUTH SESSION NIJE ODGOVORIO — pokušaj ponovno.');
  if(setSessionError)throw setSessionError;

  const session={
    user:String(p.username||username),
    username:String(p.username||username),
    role:assignedRole,
    location:String(p.location||'VG'),
    warehouses:Array.isArray(p.warehouses)?p.warehouses.map(x=>String(x).trim().toUpperCase()).filter(Boolean):[],
    authUserId:auth.user?.id||'',
    loginAt:new Date().toISOString(),
    rememberMe,
    serverAuthorized:true
  };
  setAppSession(session);
  window.__yardivoSupplierAccessToken=auth.access_token;

  if(assignedRole!=='supplier'){
    if(!window.YardivoSupabase?.authenticate)throw new Error('ONLINE BAZA NIJE SPREMNA.');
    const connected=await withTimeout(
      window.YardivoSupabase.authenticate(auth.access_token,auth.refresh_token),
      10000,
      'ONLINE BAZA NIJE ODGOVORILA — pokušaj ponovno.'
    );
    if(!connected||!window.YardivoSupabase?.online?.())throw new Error('ONLINE BAZA NIJE SPOJENA.');
  }

  return session;
}

async function validate(){
  try{
    const c=await client();
    const {data,error}=await c.auth.getSession();
    if(error||!data?.session)return false;
    const p=await loadServerProfile(c);
    const session={
      user:p.username,
      username:p.username,
      role:p.role,
      location:p.location,
      warehouses:p.warehouses,
      authUserId:data.session.user?.id||'',
      loginAt:new Date().toISOString(),
      rememberMe:true,
      serverAuthorized:true
    };
    setAppSession(session);
    return session;
  }catch(_){
    clearAppSession();
    return false;
  }
}

async function logout(){
  clearAppSession();
  try{
    const c=await client();
    await c.auth.signOut({scope:'local'});
  }catch(_){}
  clearAppSession();
  try{window.dispatchEvent(new CustomEvent('yardivo:logout'))}catch(_){}
  return true;
}

window.YardivoAuth={
  owner:'services/auth.js',
  login:authenticate,
  authenticate,
  logout,
  validate,
  client,
  profile:loadServerProfile,
  normalizeRole:normRole,
  setSession:setAppSession,
  clearSession:clearAppSession,
  roleLabel:role=>ROLE_LABEL[normRole(role)]||normRole(role)
};
})();