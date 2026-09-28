(function(){
'use strict';

let started=false;
let finished=false;
let transitioning=false;
let rafId=0;
let progressAnimation=null;
const WELCOME_MS=2800;
const FINAL_REVEAL_MS=1800;

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
    requestAnimationFrame(()=>requestAnimationFrame(()=>login.classList.add('yardon-login-arrive-active')));
  }
  document.documentElement.classList.add('yardivo-login-ready');
  return login;
}

function finishReveal(){
  if(finished)return;
  finished=true;
  transitioning=false;
  if(rafId){cancelAnimationFrame(rafId);rafId=0;}
  try{progressAnimation?.finish?.()}catch(_){}
  progressAnimation=null;
  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=loginNode();
  if(splash)splash.style.display='none';
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.opacity='1';
    login.style.visibility='visible';
    const finalLogo=login.querySelector('.login-logo-combo');
    if(finalLogo){
      finalLogo.style.removeProperty('visibility');
      finalLogo.style.removeProperty('opacity');
      finalLogo.style.removeProperty('animation');
    }
  }
  document.documentElement.classList.remove('yardivo-booting');
  document.documentElement.classList.add('yardivo-welcome-complete');
  document.body.classList.remove('yardivo-welcome-active');
  document.body.classList.add('yardivo-prelogin');
  try{window.dispatchEvent(new CustomEvent('yardivo:welcome-complete'))}catch(_){}
  try{YardivoLoginNotificationFix?.clearLoginOnce?.()}catch(_){}
}

async function startSplitReveal(){
  if(transitioning||finished)return;
  transitioning=true;

  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');
  try{progressAnimation?.finish?.()}catch(_){}
  progressAnimation=null;
  if(bar){bar.style.width='100%';bar.style.transform='translate3d(0,0,0) scaleX(1)';}
  if(pct)pct.textContent='100%';
  if(status)status.textContent='Ready';

  const splash=document.getElementById('yardivoWelcomeSplash');
  const source=splash?.querySelector('.yardon-welcome-logo');
  if(splash&&source){
    splash.querySelector('.yardon-split-stage')?.remove();

    const splashRect=splash.getBoundingClientRect();
    const sourceRect=source.getBoundingClientRect();
    const stage=document.createElement('div');
    stage.className='yardon-split-stage';
    stage.style.setProperty('--yardon-split-left',(sourceRect.left-splashRect.left)+'px');
    stage.style.setProperty('--yardon-split-top',(sourceRect.top-splashRect.top)+'px');
    stage.style.setProperty('--yardon-split-width',sourceRect.width+'px');
    stage.style.setProperty('--yardon-split-height',sourceRect.height+'px');
    stage.style.setProperty('--yardon-split-center-x',(sourceRect.left-splashRect.left+sourceRect.width/2)+'px');
    stage.style.setProperty('--yardon-split-center-y',(sourceRect.top-splashRect.top+sourceRect.height/2)+'px');

    const src=source.currentSrc||source.src;
    const left=document.createElement('img');
    const right=document.createElement('img');
    left.className='yardon-split-half left';
    right.className='yardon-split-half right';
    left.alt='';right.alt='';
    left.decoding='async';right.decoding='async';
    left.loading='eager';right.loading='eager';
    left.src=src;right.src=src;

    for(const half of [left,right]){
      half.style.setProperty('left',(sourceRect.left-splashRect.left)+'px','important');
      half.style.setProperty('top',(sourceRect.top-splashRect.top)+'px','important');
      half.style.setProperty('width',sourceRect.width+'px','important');
      half.style.setProperty('height',sourceRect.height+'px','important');
      half.style.setProperty('max-width','none','important');
      half.style.setProperty('max-height','none','important');
      half.style.setProperty('margin','0','important');
      half.style.setProperty('background','transparent','important');
      half.style.setProperty('border','0','important');
      half.style.setProperty('outline','0','important');
      half.style.setProperty('box-shadow','none','important');
      half.style.setProperty('filter','none','important');
      half.style.setProperty('mix-blend-mode','normal','important');
    }

    stage.append(left,right);
    splash.appendChild(stage);

    // Keep the source visible until both split clones have decoded. This prevents
    // a blank/black compositor frame between the static logo and the moving halves.
    try{
      await Promise.all([
        typeof left.decode==='function'?left.decode():Promise.resolve(),
        typeof right.decode==='function'?right.decode():Promise.resolve()
      ]);
    }catch(_){}

    source.classList.add('yardon-split-source-hidden');
    source.style.setProperty('visibility','hidden','important');
    source.style.setProperty('opacity','0','important');
  }

  mountLoginBehind();
  requestAnimationFrame(()=>requestAnimationFrame(()=>splash?.classList.add('yardon-split-reveal')));
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
    splash.querySelector('.yardon-split-stage')?.remove();
    const oldSource=splash.querySelector('.yardon-welcome-logo');
    if(oldSource){
      oldSource.classList.remove('yardon-split-source-hidden');
      oldSource.style.removeProperty('visibility');
      oldSource.style.removeProperty('opacity');
    }
  }
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.display='none';
    login.style.visibility='hidden';
    login.style.opacity='0';
  }
  if(!bar||!pct){forceReveal();return;}

  try{bar.getAnimations?.().forEach(a=>a.cancel())}catch(_){}
  bar.style.width='100%';
  bar.style.transform='translate3d(0,0,0) scaleX(0)';
  pct.textContent='0%';
  if(status)status.textContent='Initializing system';

  const stages=[
    [18,'Loading interface'],
    [42,'Preparing modules'],
    [67,'Checking local settings'],
    [86,'Preparing login'],
    [100,'Ready']
  ];

  try{
    progressAnimation=bar.animate(
      [
        {transform:'translate3d(0,0,0) scaleX(0)'},
        {transform:'translate3d(0,0,0) scaleX(1)'}
      ],
      {duration:WELCOME_MS,easing:'linear',fill:'forwards'}
    );
  }catch(_){progressAnimation=null;}


  const startedAt=performance.now();
  let stage=0,lastValue=0;

  function tick(now){
    if(finished||transitioning)return;
    const elapsed=now-startedAt;
    const ratio=Math.min(1,elapsed/WELCOME_MS);
    const value=Math.min(100,Math.floor(ratio*100));
    if(!progressAnimation)bar.style.transform='translate3d(0,0,0) scaleX('+ratio+')';
    if(value===100||value>=lastValue+2){
      lastValue=value;
      pct.textContent=value+'%';
    }
    while(stage<stages.length&&value>=stages[stage][0]){
      if(status)status.textContent=stages[stage][1];
      stage++;
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

if(document.getElementById('yardivoWelcomeSplash')){
  start();
}else if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}

setTimeout(()=>{if(!finished&&!transitioning)forceReveal()},6500);
window.YardivoWelcomeSplash={start,hide:forceReveal};
})();