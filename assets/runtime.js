'use strict';
const lesson = JSON.parse(document.getElementById('lesson-data').textContent);
const $ = id => document.getElementById(id);
const state = {scene:0, spot:null, teacher:false, visited:new Set(), entries:new Map(), answers:new Map(), revealed:new Set(), drafts:new Map(), zoom:1, x:0, y:0, yaw:0, pitch:0, fov:72};
let audio = null, renderer = null, sceneToken = 0, cameraToken = 0;
const wrap = a => ((a + 180) % 360 + 360) % 360 - 180;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const currentScene = () => lesson.scenes[state.scene];
const key = h => currentScene().id + '/' + h.id;
function element(tag, text, cls) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(cls)e.className=cls; return e; }
function button(text, fn) { const b=element('button',text); b.type='button'; b.onclick=fn; return b; }
function stopAudio() { if(audio){audio.pause();audio.currentTime=0;audio=null;} }
function saveDraft() { if(state.spot)state.drafts.set(key(state.spot),{note:$('note').value,category:$('category').value}); }
function updateProgress() {
  const total=lesson.scenes.reduce((n,s)=>n+s.hotspots.length,0);
  $('progress').textContent=`已观察 ${state.visited.size} / ${total} 处 · 已记 ${state.entries.size} 条证据`;
  $('count').textContent=state.entries.size;
}
function renderNavigation() {
  $('scenes').replaceChildren(...lesson.scenes.map((s,i)=>{
    const b=button(`${String(i+1).padStart(2,'0')}  ${s.title}`,()=>openScene(i));
    b.setAttribute('aria-pressed',String(i===state.scene));return b;
  }));
}
function point(h,i) {
  const b=button(String(i+1),()=>openSpot(h));b.className='point';b.dataset.spot=h.id;
  b.setAttribute('aria-label',h.label);b.title=h.label;
  b.classList.toggle('visited',state.visited.has(key(h)));b.classList.toggle('selected',state.spot===h);return b;
}
function renderPointStates() {
  document.querySelectorAll('[data-spot]').forEach(b=>{
    const h=currentScene().hotspots.find(h=>h.id===b.dataset.spot);
    if(h){b.classList.toggle('visited',state.visited.has(key(h)));b.classList.toggle('selected',state.spot===h);}
  });
}
function fitPlane() {
  const img=$('scene-image'), layer=$('plane-points'),stage=$('stage');
  if(!img.naturalWidth)return;
  const scale=Math.min(stage.clientWidth/img.naturalWidth,stage.clientHeight/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  Object.assign(layer.style,{width:w+'px',height:h+'px',left:(stage.clientWidth-w)/2+'px',top:(stage.clientHeight-h)/2+'px'});
}
function drawView() {
  if(currentScene().mode==='panorama'&&renderer){renderer.draw();return;}
  state.x=clamp(state.x,-$('stage').clientWidth*(state.zoom-1)/2,$('stage').clientWidth*(state.zoom-1)/2);
  state.y=clamp(state.y,-$('stage').clientHeight*(state.zoom-1)/2,$('stage').clientHeight*(state.zoom-1)/2);
  $('plane').style.transform=`translate(${state.x}px,${state.y}px) scale(${state.zoom})`;fitPlane();
}
function resetView() {cameraToken++;state.zoom=1;state.x=state.y=0;state.pitch=currentScene().startPitch||0;state.yaw=currentScene().startYaw||0;state.fov=72;drawView();}
function moveCamera(yaw,pitch) {
  const token=++cameraToken,fromYaw=state.yaw,fromPitch=state.pitch,delta=wrap(yaw-fromYaw),start=performance.now();
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:500;
  function frame(now){if(token!==cameraToken)return;const t=duration?Math.min(1,(now-start)/duration):1,k=t*t*(3-2*t);state.yaw=wrap(fromYaw+delta*k);state.pitch=fromPitch+(clamp(pitch,-50,50)-fromPitch)*k;drawView();if(t<1)requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}
function openScene(i) {
  saveDraft();stopAudio();state.scene=i;state.spot=null;sceneToken++;
  const s=currentScene();$('scene-title').textContent=s.title;$('scene-note').textContent=s.note;
  $('card').hidden=true;$('empty').hidden=false;$('status').textContent='';renderNavigation();
  $('hotspot-list').replaceChildren(...s.hotspots.map((h,j)=>{const b=button(`${j+1} · ${h.label}`,()=>openSpot(h));b.dataset.spot=h.id;return b;}));
  $('plane-points').replaceChildren(...s.hotspots.map((h,j)=>{const b=point(h,j);b.style.left=(h.x??50)+'%';b.style.top=(h.y??50)+'%';return b;}));
  $('pano-points').replaceChildren(...s.hotspots.map((h,j)=>point(h,j)));
  $('scene-image').alt=s.alt;$('scene-image').onload=()=>{drawView();$('stage').dataset.ready='true';};
  $('scene-image').onerror=()=>{$('status').textContent='场景图片未加载，请先使用文字观察点；制作端需修复资源。';};
  $('stage').dataset.ready='false';$('scene-image').src=s.image;
  const panoramic=s.mode==='panorama';
  if(panoramic&&!renderer){try{renderer=createPanorama();}catch(e){$('status').textContent='此设备不支持 WebGL，已切换静态示意与文字观察点。';}}
  const active=panoramic&&!!renderer;
  $('plane').hidden=active;$('panorama').hidden=!active;$('pano-points').hidden=!active;
  $('plane-points').hidden=panoramic; // 球面坐标不能当静态图片百分比点位。
  $('mode-label').textContent=active?'固定机位 360°':panoramic?'静态阅读降级':'可拖动教学示意';
  $('view-hint').textContent=active?'拖动环视 · 滚轮缩放 · 方向键':'放大后可拖动 · 下方也可选观察点';
  resetView();if(active)renderer.load(s.image,sceneToken);renderPointStates();updateProgress();
}
function openSpot(h) {
  saveDraft();stopAudio();state.spot=h;state.visited.add(key(h));
  $('empty').hidden=true;$('card').hidden=false;$('spot-index').textContent=`观察点 ${currentScene().hotspots.indexOf(h)+1} · ${currentScene().title}`;
  $('spot-title').textContent=h.label;$('quote').textContent=h.quote;$('question').textContent=h.question;
  $('source').textContent=lesson.source.label;$('analysis').textContent=h.analysis;updateReveal();
  $('challenge').hidden=!h.challenge;$('choices').replaceChildren();$('feedback').textContent='';
  if(h.challenge){$('challenge-prompt').textContent=h.challenge.prompt;h.challenge.choices.forEach((c,i)=>{
    const b=button(c.label,()=>{state.answers.set(key(h),i);showAnswer(h,i);});$('choices').append(b);
  });if(state.answers.has(key(h)))showAnswer(h,state.answers.get(key(h)));}
  $('category').replaceChildren(element('option','先选一个角度'));
  $('category').firstChild.value='';(lesson.categories||[]).forEach(c=>{const o=element('option',c);o.value=c;$('category').append(o);});
  const draft=state.drafts.get(key(h))||state.entries.get(key(h));$('note').value=draft?.note||'';$('category').value=draft?.category||'';
  $('collect').textContent=state.entries.has(key(h))?'更新这条证据':'加入证据笔记';
  $('audio-controls').hidden=!h.audio;$('slow-audio').hidden=!h.audioSlow;
  renderPointStates();updateProgress();
  if(currentScene().mode==='panorama'&&renderer)moveCamera(h.yaw,h.pitch);
}
function showAnswer(h,i) {
  $('feedback').textContent=h.challenge.choices[i].feedback;
  [...$('choices').children].forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
}
function updateReveal() {
  const visible=state.teacher||state.revealed.has(key(state.spot));
  $('analysis').hidden=!visible;$('reveal').hidden=state.teacher;
  $('reveal').textContent=visible?'收起参考解读':'看看参考解读';
}
function collect() {
  const h=state.spot;saveDraft();state.entries.set(key(h),{scene:currentScene().title,label:h.label,quote:h.quote,note:$('note').value,category:$('category').value});
  $('collect').textContent='更新这条证据';$('status').textContent='已保存到本页证据笔记。关闭或刷新页面后不保留。';updateProgress();
}
function notebook() {
  saveDraft();$('entries').replaceChildren();$('board-task').textContent=lesson.goal;$('copy-status').textContent='';
  if(!state.entries.size)$('entries').append(element('p','还没有证据。先观察一处细节，写下你的解释。'));
  for(const e of state.entries.values()){
    const box=element('section',undefined,'entry');box.append(element('small',e.scene+' · '+(e.category||'未归类')),element('h3',e.label),element('p','原文：'+e.quote),element('p','我的解释：'+(e.note||'待补充')));$('entries').append(box);
  }$('board').showModal();
}
function play(slow=false) {
  stopAudio();const src=slow?state.spot.audioSlow:state.spot.audio;if(!src)return;
  audio=new Audio(src);audio.play().then(()=>{$('status').textContent='正在播放';}).catch(()=>{$('status').textContent='音频播放失败，请检查浏览器声音设置或内嵌文件。';});
}
function createPanorama() {
  const canvas=$('panorama'),gl=canvas.getContext('webgl',{alpha:false,antialias:false});if(!gl)throw Error('WebGL unavailable');
  const vs='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const fs='precision highp float;uniform sampler2D tex;uniform vec2 res;uniform float yaw,pitch,fov;void main(){vec2 p=2.*gl_FragCoord.xy/res-1.;p.x*=res.x/res.y;vec3 r=normalize(vec3(p*tan(fov*.5),-1.));float c=cos(pitch),s=sin(pitch);vec3 q=vec3(r.x,r.y*c-r.z*s,r.y*s+r.z*c);c=cos(yaw);s=sin(yaw);vec3 d=vec3(q.x*c-q.z*s,q.y,q.x*s+q.z*c);vec2 uv=vec2(atan(d.x,-d.z)/6.28318530718+.5,.5+asin(clamp(d.y,-1.,1.))/3.14159265359);gl_FragColor=texture2D(tex,uv);}';
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
  const loc=Object.fromEntries(['res','yaw','pitch','fov'].map(n=>[n,gl.getUniformLocation(program,n)]));let loaded=false;
  return {
    load(src,token){loaded=false;const img=new Image();img.onload=()=>{if(token!==sceneToken)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);loaded=true;this.draw();$('stage').dataset.ready='true';};img.onerror=()=>{$('status').textContent='全景纹理无法加载，请用文字列表阅读，并在制作端修复素材。';};img.src=src;},
    draw(){if(!loaded)return;const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(loc.res,canvas.width,canvas.height);gl.uniform1f(loc.yaw,state.yaw*Math.PI/180);gl.uniform1f(loc.pitch,state.pitch*Math.PI/180);gl.uniform1f(loc.fov,state.fov*Math.PI/180);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      const yaw=state.yaw*Math.PI/180,pitch=state.pitch*Math.PI/180,t=Math.tan(state.fov*Math.PI/360),aspect=w/h;
      currentScene().hotspots.forEach((spot,i)=>{const a=spot.yaw*Math.PI/180,b=spot.pitch*Math.PI/180;
        const dx=Math.sin(a)*Math.cos(b),dy=Math.sin(b),dz=-Math.cos(a)*Math.cos(b);
        // 逆 yaw 后逆 pitch；与 shader 完全相同的相机模型。
        const qx=dx*Math.cos(yaw)+dz*Math.sin(yaw),qz=-dx*Math.sin(yaw)+dz*Math.cos(yaw);
        const ry=dy*Math.cos(pitch)+qz*Math.sin(pitch),rz=-dy*Math.sin(pitch)+qz*Math.cos(pitch);
        const x=.5+qx/(-rz*2*aspect*t),y=.5-ry/(-rz*2*t),node=$('pano-points').children[i];
        node.hidden=rz>=0||x<.04||x>.96||y<.07||y>.93;node.style.left=x*100+'%';node.style.top=y*100+'%';
      });
    }
  };
}
$('title').textContent=lesson.title;document.title=lesson.title+'｜互动课件';$('grade').textContent=lesson.grade;$('goal').textContent=lesson.goal;$('task').textContent=lesson.task;
$('teacher').onclick=()=>{state.teacher=!state.teacher;$('teacher').textContent='教师解读：'+(state.teacher?'开':'关');$('teacher').setAttribute('aria-pressed',String(state.teacher));if(state.spot)updateReveal();};
$('reveal').onclick=()=>{const k=key(state.spot);state.revealed.has(k)?state.revealed.delete(k):state.revealed.add(k);updateReveal();};
$('collect').onclick=collect;$('notebook').onclick=notebook;$('close-board').onclick=()=>$('board').close();
$('board').addEventListener('click',e=>{if(e.target===$('board')){const r=$('board').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('board').close();}});
$('copy-notes').onclick=async()=>{const text=[lesson.title,...[...state.entries.values()].map(e=>`【${e.scene} / ${e.category||'待归类'}】${e.label}\n原文：${e.quote}\n我的解释：${e.note||'待补充'}`)].join('\n\n');try{await navigator.clipboard.writeText(text);$('copy-status').textContent='已复制。';}catch(e){$('copy-status').textContent='此浏览器不允许直接复制，请选中下方文字手动复制。';const t=element('textarea');t.value=text;t.readOnly=true;$('copy-status').append(t);t.select();}};
$('reset').onclick=()=>{if((state.entries.size||$('note').value)&&!confirm('重新开始会清空本页笔记，是否继续？'))return;stopAudio();state.spot=null;state.visited.clear();state.entries.clear();state.answers.clear();state.revealed.clear();state.drafts.clear();state.teacher=false;$('teacher').textContent='教师解读：关';$('teacher').setAttribute('aria-pressed','false');openScene(0);};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){$('status').textContent='此环境无法进入全屏，可使用浏览器 F11。';}};
$('next').onclick=()=>{const items=lesson.scenes.flatMap((s,i)=>s.hotspots.map(h=>({scene:i,h})));let at=items.findIndex(e=>e.scene===state.scene&&e.h===state.spot);const item=items[(at+1)%items.length];if(item.scene!==state.scene)openScene(item.scene);openSpot(item.h);};
function zoom(delta){cameraToken++;if(currentScene().mode==='panorama'&&renderer)state.fov=clamp(state.fov-delta*15,45,95);else state.zoom=clamp(state.zoom+delta,1,2.5);drawView();}
$('zoom-in').onclick=()=>zoom(.25);$('zoom-out').onclick=()=>zoom(-.25);$('view-reset').onclick=resetView;
$('play-audio').onclick=()=>play();$('slow-audio').onclick=()=>play(true);
let drag=null;
$('stage').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;cameraToken++;drag={x:e.clientX,y:e.clientY};$('stage').setPointerCapture(e.pointerId);$('stage').classList.add('dragging');});
$('stage').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};if(currentScene().mode==='panorama'&&renderer){state.yaw=wrap(state.yaw-dx*.16);state.pitch=clamp(state.pitch+dy*.12,-50,50);}else{state.x+=dx;state.y+=dy;}drawView();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('stage').addEventListener(event,()=>{drag=null;$('stage').classList.remove('dragging');});
$('stage').addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.15:-.15);},{passive:false});
$('stage').addEventListener('keydown',e=>{if(e.target!==$('stage')||!e.key.startsWith('Arrow'))return;e.preventDefault();cameraToken++;if(currentScene().mode==='panorama'&&renderer){if(e.key==='ArrowLeft')state.yaw=wrap(state.yaw-10);if(e.key==='ArrowRight')state.yaw=wrap(state.yaw+10);if(e.key==='ArrowUp')state.pitch=clamp(state.pitch+8,-50,50);if(e.key==='ArrowDown')state.pitch=clamp(state.pitch-8,-50,50);}else{if(e.key==='ArrowLeft')state.x+=40;if(e.key==='ArrowRight')state.x-=40;if(e.key==='ArrowUp')state.y+=40;if(e.key==='ArrowDown')state.y-=40;}drawView();});
window.addEventListener('resize',drawView);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
openScene(0);
