(()=>{'use strict';
if(window.__YARDIVO_CHAT_REALTIME_SIGNAL_FINAL__)return;
window.__YARDIVO_CHAT_REALTIME_SIGNAL_FINAL__=true;
let ch=null,reconnectTimer=0,refreshTimer=0,lastConnectAttempt=0;
const RECONNECT_BACKOFF_MS=300000;

function scheduleRefresh(kind){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{
    if(kind==='help'||kind==='chat'){
      try{window.YardivoHelpChatV583?.refresh?.(true)}catch(_){}
      try{window.YardivoHelpChatAdminPopupsV583?.refresh?.()}catch(_){}
    }
    if(kind==='operational'||kind==='chat'){
      try{window.YardivoOperationalChatV583?.refresh?.()}catch(_){}
    }
  },80);
}

async function connect(){
  if(ch)return ch;
  if(!window.currentSession)return null;
  if(document.hidden)return null;
  const now=Date.now();
  if(lastConnectAttempt && now-lastConnectAttempt<RECONNECT_BACKOFF_MS)return null;
  lastConnectAttempt=now;
  if(!window.YardivoRealtime?.connect)return null;
  try{
    const c=await window.YardivoAuth?.client?.();
    const session=(await c?.auth?.getSession?.())?.data?.session;
    if(session?.access_token)await window.YardivoRealtime.setAuth(session.access_token);
  }catch(_){}

  const next=await window.YardivoRealtime.connect({
    key:'chat',
    topic:'yardivo-chat',
    channelOptions:{config:{private:true}},
    setup(channel){
      channel.on('broadcast',{event:'changed'},payload=>{
        scheduleRefresh(String(payload?.payload?.kind||'chat'));
      });
    },
    onStatus(status){
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
        if(ch===next)ch=null;
        clearTimeout(reconnectTimer);
        void window.YardivoRealtime.remove('chat').finally(()=>{
          reconnectTimer=setTimeout(connect,RECONNECT_BACKOFF_MS);
        });
      }
    }
  });
  ch=next;
  return ch;
}

async function disconnect(){
  ch=null;
  clearTimeout(reconnectTimer);
  try{await window.YardivoRealtime?.remove?.('chat')}catch(_){}
}

['yardivo:login','yardivo:online-ready'].forEach(ev=>{
  window.addEventListener(ev,()=>{
    lastConnectAttempt=0;
    setTimeout(connect,500);
  });
});
window.addEventListener('focus',()=>{
  if(!window.currentSession)return;
  setTimeout(connect,500);
});
window.addEventListener('yardivo:logout',()=>{
  lastConnectAttempt=0;
  void disconnect();
});

window.YardivoChatRealtimeV583={
  connect,
  disconnect,
  status:()=>window.YardivoRealtime?.status?.('chat')||'OFF'
};
})();