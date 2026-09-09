(() => {
 'use strict';
 const $=id=>document.getElementById(id),{groups,places}=window.CETRIOS;
 const byId=new Map(places.map(p=>[p.id,p]));let current=null,viewIndex=0,travelToken=0,returnView=null,returnFocus=null,viewerReady=false,toastTimer;
 const journey=$('journey'),sidebar=$('sidebar');
 const el=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
 function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3600);}
 function showSidebar(open){sidebar.classList.toggle('open',open);$('sidebar-backdrop').hidden=!open;$('mobile-destinations').setAttribute('aria-expanded',String(open));syncSidebar();if(open)$('close-destinations').focus();}
 function syncSidebar(){sidebar.inert=matchMedia('(max-width:760px)').matches&&!sidebar.classList.contains('open');}
 matchMedia('(max-width:760px)').addEventListener('change',syncSidebar);
 groups.forEach(group=>{
  const details=el('details','continent');details.dataset.group=group.id;details.open=group.id==='central';const summary=el('summary');const title=el('span','continent-title',group.name);summary.append(title);summary.title=group.subtitle;details.append(summary);
  places.filter(p=>p.group===group.id).forEach(p=>{const button=el('button','destination '+p.type);button.dataset.place=p.id;button.append(el('span','spot'),el('span','place-label',p.name));if(p.children.length){const count=el('span','place-count',String(p.children.length).padStart(2,'0'));count.title=p.children.length+' lugares en esta región';count.setAttribute('aria-label',count.title);button.append(count);}button.addEventListener('click',()=>travel(p));details.append(button);});$('destinations').append(details);
 });
 const viewer=new AtlasViewer({canvas:$('globe'),viewport:$('viewport'),flatStage:$('flat-stage'),flatImage:$('flat-map'),markerLayer:$('markers'),places,texture:window.CETRIOS.map,onSelect:travel,onReady:()=>{viewerReady=true;$('map-loading').hidden=true;setFeatured(places[0]);route();},onError:()=>{const box=$('map-loading');box.replaceChildren(el('p',null,'No se pudo abrir el mapa.'));const retry=el('button','button','Volver a intentar');retry.onclick=()=>{retry.disabled=true;viewer.image.src=window.CETRIOS.map+'?retry='+Date.now();};box.append(retry);}});
 window.cetriosViewer=viewer;
 function setFeatured(p){$('featured').hidden=false;$('featured-image').src=p.views[0].thumb;$('featured-title').textContent=p.name;$('featured-region').textContent=p.label.toUpperCase();$('featured').dataset.place=p.id;}
 function selectDestination(p){viewer.setSelected(p.id);$('view-title').textContent=p.name;document.querySelectorAll('.destination').forEach(b=>{const selected=b.dataset.place===p.id;b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});const group=document.querySelector('[data-group="'+p.group+'"]');if(group)group.open=true;setFeatured(p);}
 async function preload(src){return new Promise(resolve=>{const img=new Image();let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;resolve(false);}},10000);const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);resolve(ok);};img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=src;if(img.complete&&img.naturalWidth)finish(true);});}
 async function travel(p,{record=true,instant=false}={}){
  if(!p||!viewerReady)return;const token=++travelToken;if(!journey.open){returnView=viewer.snapshot();returnFocus=document.activeElement;}
  selectDestination(p);showSidebar(false);$('featured').disabled=true;$('featured').setAttribute('aria-busy','true');
  const loaded=preload(p.views[0].src);
  await viewer.focus(p,{duration:instant||journey.open?0:760,zoom:1.75});
  const ok=await loaded;if(token!==travelToken)return;
  current=p;viewIndex=0;renderJourney();$('journey-image-error').hidden=ok;
  if(!journey.open)journey.showModal();$('close-journey').focus();
  $('featured').disabled=false;$('featured').removeAttribute('aria-busy');
  if(record&&location.hash!=='#'+p.id)history.pushState({cetrios:true},'', '#'+p.id);
 }
 function renderJourney(){
  journey.classList.remove('clean-view');$('fullscreen').setAttribute('aria-pressed','false');const group=groups.find(g=>g.id===current.group);
  $('journey-region').textContent=(current.group==='mares'||current.group==='norte'?group.name:group.name+' · '+group.subtitle)+' / '+current.label;
  $('journey-title').textContent=current.name;$('journey-description').textContent=current.description;$('subplaces').replaceChildren();
  current.children.forEach(name=>{$('subplaces').append(el('span','subplace-tag',name));});
  $('thumbnails').replaceChildren();current.views.forEach((view,i)=>{const b=el('button');b.setAttribute('aria-label','Ver '+view.caption);const img=el('img');img.src=view.thumb;img.alt=view.caption;img.loading='lazy';b.append(img);b.addEventListener('click',()=>selectView(i));$('thumbnails').append(b);});
  $('journey-position').textContent=String(places.indexOf(current)+1).padStart(2,'0')+' / '+String(places.length).padStart(2,'0');selectView(0);
 }
 function selectView(index){if(!current)return;viewIndex=index;const v=current.views[index];$('journey-image-error').hidden=true;$('journey-image').alt=v.alt;$('journey-image').src=v.src;$('view-caption').textContent=v.caption;$('gallery-count').textContent=String(index+1).padStart(2,'0')+' / '+String(current.views.length).padStart(2,'0');[...$('thumbnails').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}
 $('journey-image').addEventListener('error',()=>{$('journey-image-error').hidden=false;});$('journey-image').addEventListener('load',()=>{$('journey-image-error').hidden=true;});
 $('retry-image').addEventListener('click',()=>{if(current)$('journey-image').src=current.views[viewIndex].src+'?retry='+Date.now();});
 function closeJourney({record=true}={}){++travelToken;if(journey.open)journey.close();if(returnView)viewer.restore(returnView);$('featured').disabled=false;$('featured').removeAttribute('aria-busy');if(record&&byId.has(location.hash.slice(1)))history.replaceState(null,'',location.pathname+location.search);if(returnFocus?.isConnected&&!returnFocus.closest('[inert]'))returnFocus.focus();else $('viewport').focus();current=null;}
 function sibling(direction){if(!current)return;const next=places[(places.indexOf(current)+direction+places.length)%places.length];travel(next,{instant:true});}
 function route(){if(!viewerReady)return;let key=location.hash.slice(1);try{key=decodeURIComponent(key);}catch(_){}const p=byId.get(key);if(p)travel(p,{record:false,instant:true});else if(journey.open)closeJourney({record:false});}
 window.addEventListener('popstate',route);window.addEventListener('hashchange',()=>{const p=byId.get(location.hash.slice(1));if(p&&p.id!==current?.id)route();});
 journey.addEventListener('cancel',e=>{e.preventDefault();closeJourney();});
 $('back-to-world').addEventListener('click',()=>closeJourney());$('close-journey').addEventListener('click',()=>closeJourney());$('previous-place').addEventListener('click',()=>sibling(-1));$('next-place').addEventListener('click',()=>sibling(1));
 $('fullscreen').addEventListener('click',()=>{const clean=journey.classList.toggle('clean-view');$('fullscreen').setAttribute('aria-pressed',String(clean));$('fullscreen').setAttribute('aria-label',clean?'Mostrar información del lugar':'Ver paisaje sin panel');});
 journey.addEventListener('keydown',e=>{if(e.key==='ArrowRight'&&current?.views.length>1){e.preventDefault();selectView((viewIndex+1)%current.views.length);}if(e.key==='ArrowLeft'&&current?.views.length>1){e.preventDefault();selectView((viewIndex-1+current.views.length)%current.views.length);}});
 $('featured').addEventListener('click',()=>travel(byId.get($('featured').dataset.place)));
 $('mobile-destinations').addEventListener('click',()=>showSidebar(!sidebar.classList.contains('open')));$('close-destinations').addEventListener('click',()=>showSidebar(false));$('sidebar-backdrop').addEventListener('click',()=>showSidebar(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sidebar.classList.contains('open')){showSidebar(false);$('mobile-destinations').focus();}if(e.key==='Tab'&&sidebar.classList.contains('open')&&matchMedia('(max-width:760px)').matches){const focusable=[...sidebar.querySelectorAll('button, summary')].filter(x=>x.getClientRects().length);const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 function setMode(mode){++travelToken;$('featured').disabled=false;$('featured').removeAttribute('aria-busy');viewer.setMode(mode);$('globe-mode').setAttribute('aria-pressed',String(mode==='globe'));$('map-mode').setAttribute('aria-pressed',String(mode==='map'));$('gesture-hint').replaceChildren(document.createTextNode(mode==='globe'?'Arrastrá para girar · Acercá para explorar':'Arrastrá para mover · Acercá para ver los detalles'));$('view-title').textContent=mode==='globe'?'Continente Central':'Mapa del mundo';}
 $('globe-mode').addEventListener('click',()=>setMode('globe'));$('map-mode').addEventListener('click',()=>setMode('map'));$('zoom-in').addEventListener('click',()=>viewer.zoomBy(1.22));$('zoom-out').addEventListener('click',()=>viewer.zoomBy(1/1.22));$('reset').addEventListener('click',()=>{++travelToken;viewer.reset();$('featured').disabled=false;$('view-title').textContent='Continente Central';});
 $('labels').addEventListener('click',()=>{viewer.setLabels(!viewer.labels);$('labels').setAttribute('aria-pressed',String(viewer.labels));$('labels').classList.toggle('active',viewer.labels);});
 document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();if(journey.open)closeJourney();viewer.reset();$('view-title').textContent='Continente Central';});
 // Ambiente suave activado exclusivamente por el visitante; no requiere MP3 externo.
 let audioCtx,noiseGain,soundEnabled=false;
 $('sound').addEventListener('click',async()=>{try{if(!audioCtx){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw Error('Audio not available');audioCtx=new AudioContext();const count=audioCtx.sampleRate*6,buffer=audioCtx.createBuffer(1,count,audioCtx.sampleRate),channel=buffer.getChannelData(0);let last=0;for(let i=0;i<count;i++){last=(last+Math.random()*.04-.02)/1.02;channel[i]=last*3;}const source=audioCtx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=320;noiseGain=audioCtx.createGain();noiseGain.gain.value=0;source.connect(filter);filter.connect(noiseGain);noiseGain.connect(audioCtx.destination);source.start();}await audioCtx.resume();soundEnabled=!soundEnabled;noiseGain.gain.setTargetAtTime(soundEnabled?.28:0,audioCtx.currentTime,.4);$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'Desactivar sonido ambiente':'Activar sonido ambiente');}catch(_){toast('El sonido no está disponible en este navegador.');}});
 document.addEventListener('visibilitychange',()=>{if(!audioCtx)return;if(document.hidden)audioCtx.suspend().catch(()=>{});else if(soundEnabled)audioCtx.resume().catch(()=>{});});
 syncSidebar();selectDestination(places[0]);
})();
