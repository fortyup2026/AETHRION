/* Motor de proyección esférica sin dependencias externas.
   La textura y los puntos usan exactamente la misma transformación.
   WebGL dispone de una alternativa Canvas 2D para equipos sin aceleración. */
(() => {
 'use strict';
 const PI=Math.PI,TAU=PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const fragment=`precision highp float;
 uniform vec2 resolution;uniform vec2 center;uniform float radius;
 uniform vec3 basisR;uniform vec3 basisU;uniform vec3 basisF;
 uniform sampler2D atlas;
 void main(){
  vec2 p=(gl_FragCoord.xy-center)/radius;float d=length(p);
  if(d>1.13){gl_FragColor=vec4(0.0);return;}
  if(d>1.0){float glow=exp(-(d-1.0)*42.0)*0.29;gl_FragColor=vec4(0.25,0.48,0.62,glow);return;}
  vec3 n=vec3(p,sqrt(max(0.0,1.0-dot(p,p))));
  vec3 world=normalize(n.x*basisR+n.y*basisU+n.z*basisF);
  vec2 uv=vec2(atan(world.x,world.z)/6.28318530718+0.5,0.5-asin(clamp(world.y,-1.0,1.0))/3.14159265359);
  vec3 land=texture2D(atlas,uv).rgb;
  float light=0.70+0.43*max(0.0,dot(n,normalize(vec3(-0.5,0.6,1.4))));
  vec3 color=land*light*1.18;
  float rim=pow(1.0-n.z,4.0);color=mix(color,vec3(0.18,0.32,0.40),rim*0.48);
  gl_FragColor=vec4(color,1.0-smoothstep(0.997,1.0,d));
 }`;
 class AtlasViewer{
  constructor(options){
   Object.assign(this,options);this.mode='globe';this.lon=-.025*TAU;this.lat=.08;this.zoom=1;this.pan={x:0,y:0};this.labels=true;this.ready=false;this.selected='aethrion';this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.pointers=new Map();this.dirty=false;
   this.nodes=[];this.createRenderer();this.createMarkers();this.bind();this.resize();
   this.image=new Image();this.image.onload=()=>this.loadTexture();this.image.onerror=()=>this.onError?.();this.image.src=this.texture;
  }
  createRenderer(){
   try{
    const gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');
    const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(program);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    this.gl=gl;this.program=program;this.uniforms={};['resolution','center','radius','basisR','basisU','basisF','atlas'].forEach(k=>this.uniforms[k]=gl.getUniformLocation(program,k));
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.useCanvasFallback();});
   }catch(_){this.useCanvasFallback();}
  }
  useCanvasFallback(){
   const c=document.createElement('canvas');c.id='globe';c.setAttribute('aria-hidden','true');this.canvas.replaceWith(c);this.canvas=c;this.gl=null;this.ctx=c.getContext('2d');if(this.ready){this.loadPixels();this.resize();}
  }
  loadTexture(){
   if(this.gl){const gl=this.gl;this.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,this.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
   else this.loadPixels();
   this.flatImage.src=this.texture;this.ready=true;this.resize();this.onReady?.();
  }
  loadPixels(){const c=document.createElement('canvas');c.width=this.image.naturalWidth;c.height=this.image.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(this.image,0,0);this.pixels=ctx.getImageData(0,0,c.width,c.height);this.cpu=document.createElement('canvas');}
  createMarkers(){this.places.forEach(p=>{const button=document.createElement('button');button.className='marker '+p.type;button.setAttribute('aria-label','Viajar a '+p.name);button.dataset.place=p.id;const dot=document.createElement('span');dot.className='marker-dot';const name=document.createElement('span');name.className='name';name.textContent=p.name;button.append(dot,name);button.addEventListener('click',()=>this.onSelect(p));this.markerLayer.append(button);this.nodes.push({place:p,button,name,width:p.name.length*6.4+18});});}
  basis(){const s=Math.sin(this.lon),c=Math.cos(this.lon),sl=Math.sin(this.lat),cl=Math.cos(this.lat);return {R:[c,0,-s],U:[-sl*s,cl,-sl*c],F:[cl*s,sl,cl*c]};}
  dimensions(){this.cx=this.width*(this.width>760?.52:.5);this.cy=this.height*(this.width>760?.51:.46);this.radius=Math.min(this.width*(this.width<550?.475:.395),this.height*.407)*this.zoom;}
  resize(){const r=this.viewport.getBoundingClientRect();this.width=r.width;this.height=r.height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.flatHeight=1600*((this.image?.naturalHeight||1024)/(this.image?.naturalWidth||1536));this.baseScale=Math.min((this.width-40)/1600,(this.height-120)/this.flatHeight);this.dimensions();this.invalidate();}
  invalidate(){if(this.dirty)return;this.dirty=true;requestAnimationFrame(()=>{this.dirty=false;this.draw();});}
  draw(){if(!this.ready||!this.width||!this.height)return;this.dimensions();if(this.mode==='globe')this.drawGlobe();else{const s=this.baseScale*this.zoom;const x=(this.width-1600*s)/2+this.pan.x,y=(this.height-this.flatHeight*s)/2+this.pan.y;this.flatStage.style.transform=`translate(${x}px,${y}px) scale(${s})`;this.flatGeometry={x,y,s};}this.drawMarkers();}
  drawGlobe(){const b=this.basis();if(this.gl){const gl=this.gl,u=this.uniforms,d=this.dpr;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);gl.uniform2f(u.center,this.cx*d,(this.height-this.cy)*d);gl.uniform1f(u.radius,this.radius*d);gl.uniform3fv(u.basisR,b.R);gl.uniform3fv(u.basisU,b.U);gl.uniform3fv(u.basisF,b.F);gl.drawArrays(gl.TRIANGLES,0,6);}else this.drawCPU(b);}
  drawCPU(b){
   if(!this.pixels)return;const ctx=this.ctx,d=this.dpr;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,this.width,this.height);
   const glow=ctx.createRadialGradient(this.cx,this.cy,this.radius*.92,this.cx,this.cy,this.radius*1.13);glow.addColorStop(0,'#39708500');glow.addColorStop(.5,'#39708540');glow.addColorStop(1,'#39708500');ctx.fillStyle=glow;ctx.fillRect(0,0,this.width,this.height);
   const size=this.pointers.size?320:Math.min(720,Math.round(this.radius*2));this.cpu.width=this.cpu.height=size;const c=this.cpu.getContext('2d');const out=c.createImageData(size,size),pix=this.pixels,src=pix.data;
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=2*(x+.5)/size-1,ny=1-2*(y+.5)/size,r=nx*nx+ny*ny;if(r>=1)continue;const nz=Math.sqrt(1-r),wx=nx*b.R[0]+ny*b.U[0]+nz*b.F[0],wy=nx*b.R[1]+ny*b.U[1]+nz*b.F[1],wz=nx*b.R[2]+ny*b.U[2]+nz*b.F[2];
    const u=(Math.atan2(wx,wz)/TAU+.5),v=.5-Math.asin(clamp(wy,-1,1))/PI;const ix=clamp(Math.floor(u*pix.width),0,pix.width-1),iy=clamp(Math.floor(v*pix.height),0,pix.height-1);const si=(iy*pix.width+ix)*4,di=(y*size+x)*4,l=(.70+.43*Math.max(0,(-.5*nx+.6*ny+1.4*nz)/1.603))*1.18,rim=Math.pow(1-nz,4)*.48;
    out.data[di]=src[si]*l*(1-rim)+46*rim;out.data[di+1]=src[si+1]*l*(1-rim)+82*rim;out.data[di+2]=src[si+2]*l*(1-rim)+102*rim;out.data[di+3]=255;
   }
   c.putImageData(out,0,0);ctx.drawImage(this.cpu,this.cx-this.radius,this.cy-this.radius,this.radius*2,this.radius*2);
  }
  project(p){if(this.mode==='map'){const f=this.flatGeometry;if(!f)return {x:0,y:0,z:-1};return{x:f.x+p.x*1600*f.s,y:f.y+p.y*this.flatHeight*f.s,z:1};}
   const lon=(p.x-.5)*TAU,lat=(.5-p.y)*PI;const v=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)],b=this.basis(),dot=a=>a[0]*v[0]+a[1]*v[1]+a[2]*v[2];return{x:this.cx+dot(b.R)*this.radius,y:this.cy-dot(b.U)*this.radius,z:dot(b.F)};
  }
  drawMarkers(){const occupied=[];const nodes=[...this.nodes].sort((a,b)=>(b.place.id===this.selected?10:b.place.type==='capital'?5:0)-(a.place.id===this.selected?10:a.place.type==='capital'?5:0));nodes.forEach(n=>{const p=this.project(n.place),visible=p.z>.13&&p.x>10&&p.x<this.width-10&&p.y>10&&p.y<this.height-40;n.button.hidden=!visible;if(!visible)return;n.button.style.left=p.x+'px';n.button.style.top=p.y+'px';n.button.classList.toggle('selected',n.place.id===this.selected);const box={x:p.x-n.width/2,y:p.y+15,w:n.width,h:26};const overlap=occupied.some(o=>box.x<o.x+o.w&&box.x+box.w>o.x&&box.y<o.y+o.h&&box.y+box.h>o.y);const show=this.labels&&!overlap&&(this.mode==='map'||p.z>.28);n.name.classList.toggle('suppressed',!show);if(show)occupied.push(box);});}
  setMode(mode){this.stop();this.mode=mode;this.zoom=1;this.pan={x:0,y:0};this.canvas.hidden=mode!=='globe';this.flatStage.hidden=mode!=='map';this.invalidate();}
  snapshot(){return{lon:this.lon,lat:this.lat,zoom:this.zoom,pan:{...this.pan},mode:this.mode};}
  restore(state){if(!state)return;this.stop();this.lon=state.lon;this.lat=state.lat;this.zoom=state.zoom;this.pan={...state.pan};this.invalidate();}
  reset(){this.stop();this.lon=-.025*TAU;this.lat=.08;this.zoom=1;this.pan={x:0,y:0};this.invalidate();}
  setSelected(id){this.selected=id;this.invalidate();}
  setLabels(value){this.labels=value;this.invalidate();}
  zoomBy(f){this.stop();const next=clamp(this.zoom*f,.7,this.mode==='map'?7:3.5);if(this.mode==='map'){const factor=next/this.zoom;this.pan.x*=factor;this.pan.y*=factor;this.constrainPan();}this.zoom=next;this.invalidate();}
  constrainPan(){const sx=1600*this.baseScale*this.zoom,sy=this.flatHeight*this.baseScale*this.zoom;this.pan.x=clamp(this.pan.x,-sx*.7,sx*.7);this.pan.y=clamp(this.pan.y,-sy*.7,sy*.7);}
  stop(){if(this.animation){cancelAnimationFrame(this.animation);this.animation=null;}if(this.complete){this.complete(false);this.complete=null;}}
  focus(p,{duration=720,zoom=1.8}={}){
   this.stop();if(this.reduced)duration=0;const start=this.snapshot(),targetLon=(p.x-.5)*TAU,targetLat=clamp((.5-p.y)*PI,-1.42,1.42);const dl=((targetLon-start.lon+PI)%TAU+TAU)%TAU-PI;
   const endZoom=this.mode==='map'?Math.max(2,zoom):zoom;const s=this.baseScale*endZoom,endPan={x:(.5-p.x)*1600*s,y:(.5-p.y)*this.flatHeight*s};
   return new Promise(resolve=>{this.complete=resolve;const begin=performance.now();const step=t=>{const a=duration?Math.min(1,(t-begin)/duration):1,e=1-Math.pow(1-a,3);this.lon=start.lon+dl*e;this.lat=start.lat+(targetLat-start.lat)*e;this.zoom=start.zoom+(endZoom-start.zoom)*e;if(this.mode==='map'){this.pan.x=start.pan.x+(endPan.x-start.pan.x)*e;this.pan.y=start.pan.y+(endPan.y-start.pan.y)*e;}this.draw();if(a<1)this.animation=requestAnimationFrame(step);else{this.animation=null;this.complete=null;resolve(true);}};this.animation=requestAnimationFrame(step);});
  }
  bind(){
   new ResizeObserver(()=>this.resize()).observe(this.viewport);
   const xy=e=>({x:e.clientX,y:e.clientY});
   this.viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;this.stop();this.pointers.set(e.pointerId,xy(e));this.viewport.setPointerCapture(e.pointerId);this.viewport.classList.add('dragging');});
   this.viewport.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;const prev=this.pointers.get(e.pointerId);const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(this.pointers.size===2){const other=[...this.pointers].find(([id])=>id!==e.pointerId)[1];const oldDist=Math.hypot(prev.x-other.x,prev.y-other.y),newDist=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(oldDist>5)this.zoom=clamp(this.zoom*newDist/oldDist,.7,this.mode==='map'?7:3.5);}else if(this.mode==='globe'){this.lon-=dx/Math.max(120,this.radius);this.lat=clamp(this.lat+dy/Math.max(120,this.radius),-1.42,1.42);}else{this.pan.x+=dx;this.pan.y+=dy;this.constrainPan();}this.pointers.set(e.pointerId,xy(e));this.invalidate();});
   const end=e=>{this.pointers.delete(e.pointerId);if(!this.pointers.size)this.viewport.classList.remove('dragging');this.invalidate();};['pointerup','pointercancel','lostpointercapture'].forEach(t=>this.viewport.addEventListener(t,end));
   this.viewport.addEventListener('wheel',e=>{e.preventDefault();this.zoomBy(Math.exp(-e.deltaY*.0013));},{passive:false});
   this.viewport.addEventListener('keydown',e=>{if(e.target!==this.viewport)return;let handled=true;if(e.key==='+'||e.key==='=')this.zoomBy(1.2);else if(e.key==='-')this.zoomBy(1/1.2);else if(e.key==='Home')this.reset();else if(e.key.startsWith('Arrow')){this.stop();const right=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,up=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;if(this.mode==='globe'){this.lon+=right*.1;this.lat=clamp(this.lat+up*.1,-1.42,1.42);}else{this.pan.x-=right*45;this.pan.y+=up*45;this.constrainPan();}this.invalidate();}else handled=false;if(handled)e.preventDefault();});
   document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();else this.invalidate();});
  }
 }
 window.AtlasViewer=AtlasViewer;
})();
