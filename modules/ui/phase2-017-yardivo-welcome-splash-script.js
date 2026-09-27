(function(){
'use strict';

let started=false;
let finished=false;
let transitioning=false;
let rafId=0;
const WELCOME_MS=4200;
const FINAL_REVEAL_MS=2550;

function loginNode(){
  return document.getElementById('loginScreen')
    || document.getElementById('loginOverlay')
    || document.getElementById('login')
    || document.querySelector('.login-screen,.login-overlay,[data-login-screen]');
}

function mountLoginBehind(){
  const login=loginNode();
  document.body.classList.add('yardivo-prelogin');
  if(login){
    login.classList.remove('hidden');
    login.classList.add('yardon-login-arrive');
    login.style.display='flex';
    login.style.visibility='visible';
    login.style.opacity='0';
    login.setAttribute('aria-hidden','false');
    setTimeout(()=>requestAnimationFrame(()=>login.classList.add('yardon-login-arrive-active')),240);
  }
  document.documentElement.classList.add('yardivo-login-ready');
  return login;
}

function finishReveal(){
  if(finished)return;
  finished=true;
  transitioning=false;
  if(rafId){cancelAnimationFrame(rafId);rafId=0;}
  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=loginNode();
  if(splash)splash.style.display='none';
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.opacity='1';
    login.style.visibility='visible';
  }
  document.documentElement.classList.remove('yardivo-booting');
  document.documentElement.classList.add('yardivo-welcome-complete');
  document.body.classList.remove('yardivo-welcome-active');
  document.body.classList.add('yardivo-prelogin');
  try{window.dispatchEvent(new CustomEvent('yardivo:welcome-complete'))}catch(_){}
  try{YardivoLoginNotificationFix?.clearLoginOnce?.()}catch(_){}
}

function startSplitReveal(){
  if(transitioning||finished)return;
  transitioning=true;

  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');
  if(bar){bar.style.width='100%';bar.style.transform='scaleX(1)';}
  if(pct)pct.textContent='100%';
  if(status)status.textContent='Ready';

  const splash=document.getElementById('yardivoWelcomeSplash');
  const source=splash?.querySelector('.yardon-welcome-logo');
  if(splash&&source){
    const stage=document.createElement('div');
    stage.className='yardon-split-stage';
    const src=source.currentSrc||source.src;
    const left=document.createElement('img');
    const right=document.createElement('img');
    left.className='yardon-split-half left';
    right.className='yardon-split-half right';
    left.alt='';right.alt='';
    left.src=src;right.src=src;
    stage.append(left,right);
    splash.appendChild(stage);
  }

  mountLoginBehind();
  requestAnimationFrame(()=>splash?.classList.add('yardon-split-reveal'));
  setTimeout(finishReveal,FINAL_REVEAL_MS+70);
}

function forceReveal(){
  if(finished)return;
  mountLoginBehind();
  finishReveal();
}

function start(){
  if(started)return;
  started=true;

  document.documentElement.classList.add('yardivo-booting');
  document.body.classList.add('yardivo-welcome-active','yardivo-prelogin');

  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=loginNode();
  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');

  if(splash){
    splash.style.removeProperty('display');
    splash.classList.remove('hide','yardon-final-zoom','yardon-split-reveal');
  }
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.display='none';
    login.style.visibility='hidden';
    login.style.opacity='0';
  }
  if(!bar||!pct){forceReveal();return;}

  bar.style.width='100%';
  bar.style.transform='scaleX(0)';
  pct.textContent='0%';
  if(status)status.textContent='Initializing system';

  const stages=[
    [18,'Loading interface'],
    [42,'Preparing modules'],
    [67,'Checking local settings'],
    [86,'Preparing login'],
    [100,'Ready']
  ];

  const startedAt=performance.now();
  let stage=0,lastValue=-1;

  function tick(now){
    if(finished||transitioning)return;
    const elapsed=now-startedAt;
    const ratio=Math.min(1,elapsed/WELCOME_MS);
    const value=Math.min(100,Math.floor(ratio*100));
    bar.style.transform='translateZ(0) scaleX('+ratio+')';
    if(value!==lastValue){
      lastValue=value;
      pct.textContent=value+'%';
      while(stage<stages.length&&value>=stages[stage][0]){
        if(status)status.textContent=stages[stage][1];
        stage++;
      }
    }
    if(ratio>=1){
      rafId=0;
      startSplitReveal();
      return;
    }
    rafId=requestAnimationFrame(tick);
  }
  rafId=requestAnimationFrame(tick);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}

setTimeout(()=>{if(!finished&&!transitioning)forceReveal()},9500);
window.YardivoWelcomeSplash={start,hide:forceReveal};
})();