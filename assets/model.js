// A dependency-free WebGL viewer for the shaded triangle mesh exported by SolidWorks.
// It contains display geometry only; native SolidWorks/Abaqus documents are never served.
for(const host of document.querySelectorAll('[data-model]'))init(host).catch(error=>{
 host.querySelector('.model-status').textContent='三维预览暂不可用，可查看上方模型静态图。';
 host.querySelectorAll('button').forEach(b=>b.disabled=true);
 console.warn('Model preview unavailable:',error.message);
});
async function init(host){
 const canvas=host.querySelector('canvas');
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
 if(!gl)throw new Error('WebGL unavailable');
 const response=await fetch(host.dataset.model);if(!response.ok)throw new Error('Mesh HTTP '+response.status);
 const data=new Float32Array(await response.arrayBuffer());if(!data.length||data.length%9)throw new Error('Invalid mesh');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<data.length;i+=3)for(let j=0;j<3;j++){min[j]=Math.min(min[j],data[i+j]);max[j]=Math.max(max[j],data[i+j]);}
 const ext=max.map((v,i)=>v-min[i]);const longest=ext.indexOf(Math.max(...ext));const scale=2/Math.max(...ext);const center=max.map((v,i)=>(v+min[i])/2);
 const vertices=new Float32Array(data.length*2);
 for(let i=0;i<data.length;i+=9){
  const points=[];
  for(let k=0;k<3;k++){
   const p=[0,1,2].map(j=>(data[i+k*3+j]-center[j])*scale);
   // Put the long axis on screen Y for a useful initial view of every part.
   if(longest!==1)[p[1],p[longest]]=[p[longest],p[1]];
   points.push(p);
  }
  const a=points[1].map((v,j)=>v-points[0][j]);const b=points[2].map((v,j)=>v-points[0][j]);
  const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const len=Math.hypot(...n)||1;
  for(let k=0;k<3;k++){const offset=(i/3+k)*6;vertices.set(points[k],offset);vertices.set(n.map(v=>v/len),offset+3);}
 }
 const vs=`attribute vec3 position;attribute vec3 normal;uniform mat3 rotation;uniform vec2 projection;uniform float zoom;varying vec3 n;varying vec3 p;void main(){p=rotation*position;n=rotation*normal;gl_Position=vec4(p.x*projection.x*zoom,p.y*projection.y*zoom,-p.z*.2,1.0);}`;
 const fs=`precision mediump float;varying vec3 n;varying vec3 p;void main(){vec3 N=normalize(n);float key=abs(dot(N,normalize(vec3(-.6,.8,1.0))));float fill=abs(dot(N,normalize(vec3(.9,-.1,.3))));float l=.3+.55*key+.15*fill;vec3 col=vec3(.58,.63,.63)*l+vec3(.10,.09,.07);gl_FragColor=vec4(col,1.0);}`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Shader link failed');gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
 for(const [name,offset]of [['position',0],['normal',12]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,24,offset);}
 const rloc=gl.getUniformLocation(program,'rotation'),ploc=gl.getUniformLocation(program,'projection'),zloc=gl.getUniformLocation(program,'zoom');
 gl.enable(gl.DEPTH_TEST);gl.clearColor(230/255,227/255,216/255,1);
 let yaw=-.65,pitch=.35,roll=-.16,zoom=1,auto=false,visible=true,lastTime=0,raf=0;
 function multiply(a,b){const c=Array(9).fill(0);for(let row=0;row<3;row++)for(let col=0;col<3;col++)for(let k=0;k<3;k++)c[col*3+row]+=a[k*3+row]*b[col*3+k];return c;}
 function rotation(){const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),cz=Math.cos(roll),sz=Math.sin(roll);return multiply([cz,sz,0,-sz,cz,0,0,0,1],multiply([1,0,0,0,cx,sx,0,-sx,cx],[cy,0,-sy,0,1,0,sy,0,cy]));}
 function draw(){
  raf=0;const ratio=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(canvas.clientWidth*ratio)),h=Math.max(1,Math.round(canvas.clientHeight*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix3fv(rloc,false,rotation());gl.uniform2f(ploc,.74*h/w,.74);gl.uniform1f(zloc,zoom);gl.drawArrays(gl.TRIANGLES,0,vertices.length/6);
 }
 function requestDraw(){if(!raf)raf=requestAnimationFrame(draw);}
 const pointers=new Map();let lastPinch=0;
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);lastPinch=0;});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size===1){yaw+=(e.clientX-previous[0])*.012;pitch+=(e.clientY-previous[1])*.012;}
  else{const [a,b]=[...pointers.values()];const distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(lastPinch>0)zoom=Math.max(.35,Math.min(4,zoom*distance/lastPinch));lastPinch=distance;}
  requestDraw();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);lastPinch=0;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.35,Math.min(4,zoom*Math.exp(-e.deltaY*.001)));requestDraw();},{passive:false});
 canvas.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft')yaw-=.12;else if(e.key==='ArrowRight')yaw+=.12;else if(e.key==='ArrowUp')pitch-=.12;else if(e.key==='ArrowDown')pitch+=.12;else if(['+','='].includes(e.key))zoom=Math.min(4,zoom*1.15);else if(e.key==='-')zoom=Math.max(.35,zoom/1.15);else return;e.preventDefault();requestDraw();
 });
 const rotate=host.querySelector('[data-action=rotate]');
 function animate(time){if(!auto)return;if(visible&&document.visibilityState==='visible'){if(lastTime)yaw+=(time-lastTime)*.00025;requestDraw();}lastTime=time;requestAnimationFrame(animate);}
 for(const button of host.querySelectorAll('[data-action]'))button.addEventListener('click',()=>{
  const a=button.dataset.action;
  if(a==='zoom-in')zoom=Math.min(4,zoom*1.2);
  if(a==='zoom-out')zoom=Math.max(.35,zoom/1.2);
  if(a==='reset'){yaw=-.65;pitch=.35;roll=-.16;zoom=1;auto=false;rotate.setAttribute('aria-pressed','false');}
  if(a==='rotate'){auto=!auto;rotate.setAttribute('aria-pressed',String(auto));if(auto){lastTime=0;requestAnimationFrame(animate);}}
  requestDraw();
 });
 new ResizeObserver(requestDraw).observe(canvas);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(host);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();delete host.dataset.loaded;host.querySelector('.model-status').textContent='三维显示已暂停，请刷新页面恢复。';auto=false;host.querySelectorAll('button').forEach(b=>b.disabled=true);});
 host.dataset.loaded='true';host.querySelector('.model-status').textContent='拖动旋转 · 双指缩放 · 原始零件显示网格';
 requestDraw();
}
