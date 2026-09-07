import {createHaunt} from './scene3d.js';
import {ROOM_SCALE,WORLD,healthTable,bounds,blocked} from './room.js';
const canvas=document.querySelector('#game'),$=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),colors=['#a6f5cd','#bdb1ff','#ffcf92'];
let player,ghosts,particles,time=0,last=0,flashTimer=0,cooldown=0,vac=false,keys={},joy={x:0,y:0},caught=0,active=true,sound=false,ac,noticeTime=0,lockedGhost=null,scare=0,battery=null,tableUsed=false;
function say(t,d=2.5){noticeTime=d;$('#message').textContent=t}
function tone(f,d=.1){if(!sound)return;try{ac??=new(window.AudioContext||window.webkitAudioContext)();ac.resume();const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(f,ac.currentTime);o.frequency.exponentialRampToValueAtTime(f*1.3,ac.currentTime+d);g.gain.setValueAtTime(.055,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch{}}
function burst(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*200,vy:(Math.random()-.5)*200,life:.5+Math.random()*.5,color})}
function ui(){
$('#count').textContent='●'.repeat(caught)+'○'.repeat(3-caught)+'   '+caught+' / 3 captured';
$('#health-text').textContent=player.hp+' / 100 HP';$('#health-fill').style.width=player.hp+'%';$('#health').setAttribute('aria-valuenow',player.hp);$('#health').classList.toggle('low',player.hp<=25);
$('#battery-status').textContent=tableUsed?(battery?'Battery ready · +50 HP':'Battery used'):'Bump the green-marked table · +50 HP';
}
function finish(won){active=false;lockedGhost=null;release();$('#win small').textContent=won?'ROOM CLEAR':'POWER DEPLETED';$('#win h2').textContent=won?'A tidy little haunting.':'Robot offline.';$('#win p').textContent=won?'Three ghosts safely bottled. '+player.hp+' HP remaining.':'The ghosts got you. Restart with 100 HP and a fresh battery.';$('#again').textContent=won?'Play again':'Try again';$('#win').hidden=false}
function reset(){
lockedGhost=null;player={x:340*ROOM_SCALE,y:526*ROOM_SCALE,a:-Math.PI/2,hp:100,hurt:0};particles=[];scare=0;time=0;caught=0;active=true;vac=false;keys={};joy={x:0,y:0};flashTimer=0;cooldown=0;battery=null;tableUsed=false;
ghosts=colors.map((color,i)=>({x:[210,505,500][i]*ROOM_SCALE,y:[215,228,465][i]*ROOM_SCALE,state:'warning',wait:.45+i*.35,color,hp:100,stun:0,caught:false,seed:i*2.3,noSuction:0,touching:false,attackTime:0}));
$('#win').hidden=true;$('#knob').style.transform='';$('#vacuum').classList.remove('active');$('#fill').style.width='0%';$('#label').textContent='AIM → FLASH TO LOCK → VACUUM';say('Ghosts can hurt you. Bump the green-marked table for a battery.',5);ui();
}
function inBeam(g,range=250,angle=.48){const dx=g.x-player.x,dy=g.y-player.y;return Math.hypot(dx,dy)<range&&Math.cos(Math.atan2(dy,dx)-player.a)>Math.cos(angle)}
function lockValid(){return lockedGhost&&!lockedGhost.caught&&lockedGhost.stun>0&&lockedGhost.state==='roam'&&Math.hypot(lockedGhost.x-player.x,lockedGhost.y-player.y)<300}
function target(){if(lockValid())return lockedGhost;return ghosts.filter(g=>!g.caught&&g.state!=='warning'&&inBeam(g)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]}
function flash(){if(!active||cooldown>0)return;cooldown=1.5;flashTimer=.25;tone(620,.15);const hits=ghosts.filter(g=>!g.caught&&g.state!=='warning'&&inBeam(g,240,.52)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));hits.forEach(g=>{g.state='roam';g.stun=4.5;burst(g.x,g.y,g.color,16)});if(hits.length){lockedGhost=hits[0];player.a=Math.atan2(lockedGhost.y-player.y,lockedGhost.x-player.x)}say(hits.length?'Ghost locked! Hold VACUUM before it relocates.':'No hit. Aim at a ghost, then FLASH.',2)}
function spawnBattery(){
if(tableUsed)return;tableUsed=true;
// Eject on the side the robot touched, into reachable floor space.
const r=healthTable,candidates=[{x:r.x-65,y:clamp(player.y,r.y,r.y+r.h)},{x:r.x+r.w+65,y:clamp(player.y,r.y,r.y+r.h)},{x:clamp(player.x,r.x,r.x+r.w),y:r.y-65},{x:clamp(player.x,r.x,r.x+r.w),y:r.y+r.h+65}];
candidates.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));const spot=candidates.find(p=>!blocked(p.x,p.y,18));battery={...spot,age:0};burst(battery.x,battery.y,'#8effbc',22);tone(650,.2);say('Battery released! Roll over it for up to +50 HP.',3);ui();
}
function move(dx,dy){
const r=healthTable;const valid=(x,y)=>{if(x>r.x-22&&x<r.x+r.w+22&&y>r.y-22&&y<r.y+r.h+22)spawnBattery();return !blocked(x,y)};
const nx=clamp(player.x+dx,bounds.left,bounds.right),ny=clamp(player.y+dy,bounds.top,bounds.bottom);if(dx&&valid(nx,player.y))player.x=nx;if(dy&&valid(player.x,ny))player.y=ny;
}
function respawn(g){
if(g.caught)return;const old={x:g.x,y:g.y};let point=null;
for(let i=0;i<80;i++){let x,y;if(i<50&&Math.random()<.7){const a=Math.random()*Math.PI*2,d=210+Math.random()*240;x=player.x+Math.cos(a)*d;y=player.y+Math.sin(a)*d}else{x=bounds.left+Math.random()*(bounds.right-bounds.left);y=bounds.top+Math.random()*(bounds.bottom-bounds.top)}if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom||blocked(x,y,40)||Math.hypot(x-player.x,y-player.y)<175||Math.hypot(x-old.x,y-old.y)<200||ghosts.some(h=>h!==g&&!h.caught&&Math.hypot(x-h.x,y-h.y)<85))continue;point={x,y};break}
if(!point){for(let x=bounds.left+50;x<bounds.right&&!point;x+=95)for(let y=bounds.top+50;y<bounds.bottom;y+=95)if(!blocked(x,y,40)&&Math.hypot(x-player.x,y-player.y)>175&&Math.hypot(x-old.x,y-old.y)>200){point={x,y};break}}
if(!point)return;burst(g.x,g.y,g.color,15);if(lockedGhost===g)lockedGhost=null;Object.assign(g,point,{hp:100,stun:0,state:'warning',wait:.35,noSuction:0,touching:false,attackTime:0});burst(g.x,g.y,g.color,15);
}
function contact(g){const touching=!g.caught&&g.state!=='warning'&&g.stun<=0&&Math.hypot(g.x-player.x,g.y-player.y)<45;
// One hit per contact, rather than subtracting health on every animation frame.
if(touching&&!g.touching){player.hp=Math.max(0,player.hp-5);player.hurt=.45;scare=.35;tone(95,.15);say('Ghost hit! −5 HP',1.1);ui();if(player.hp===0)finish(false)}g.touching=touching;
}
function update(dt){time+=dt;scare=Math.max(0,scare-dt);cooldown=Math.max(0,cooldown-dt);flashTimer=Math.max(0,flashTimer-dt);noticeTime-=dt;player.hurt=Math.max(0,player.hurt-dt);if(!active)return;
let mx=joy.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),my=joy.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0);const mag=Math.hypot(mx,my);if(mag>1){mx/=mag;my/=mag}if(!lockValid())lockedGhost=null;if(mag>.12&&!lockedGhost)player.a=Math.atan2(my,mx);move(mx*dt*(vac?118:185),my*dt*(vac?118:185));if(lockValid())player.a=Math.atan2(lockedGhost.y-player.y,lockedGhost.x-player.x);else lockedGhost=null;
if(battery){battery.age+=dt;if(battery.age>.35&&player.hp<100&&Math.hypot(player.x-battery.x,player.y-battery.y)<42){const gain=Math.min(50,100-player.hp);player.hp+=gain;burst(battery.x,battery.y,'#8effbc',30);battery=null;tone(850,.3);say('Recharged +'+gain+' HP!',2);ui()}}
const g=target();const linked=!!(g&&vac&&g.stun>0&&inBeam(g));
if(linked){g.noSuction=0;g.stun=Math.max(g.stun,.4);const dx=g.x-player.x,dy=g.y-player.y,d=Math.hypot(dx,dy)||1;g.hp-=dt*29;g.x-=dx/d*dt*23;g.y-=dy/d*dt*23;if(Math.random()<.4)particles.push({x:g.x,y:g.y,vx:-dx*2,vy:-dy*2,life:.45,color:g.color});if(g.hp<=0){g.caught=true;if(lockedGhost===g)lockedGhost=null;caught++;burst(g.x,g.y,g.color,40);tone(880,.3);say('Ghost bottled!',2);ui();if(caught===3){finish(true);return}}}
for(const h of ghosts){if(h.caught)continue;
if(!(linked&&h===g)){h.noSuction+=dt;if(h.noSuction>2){const wasLocked=lockedGhost===h;respawn(h);if(wasLocked)say('It escaped! Keep suction going to stop it relocating.',2);continue}h.stun=Math.max(0,h.stun-dt)}
if(h.state==='warning'){h.wait-=dt;if(h.wait<=0){h.state='roam';h.attackTime=0}continue}
contact(h);if(!active)return;if(h.stun>0)continue;
const dx=player.x-h.x,dy=player.y-h.y,d=Math.hypot(dx,dy)||1;h.attackTime-=dt;
if(h.state==='lunge'){h.x+=h.vx*dt;h.y+=h.vy*dt;h.rush-=dt;if(h.rush<=0){h.state='roam';h.attackTime=.65}}
else if(d<390&&h.attackTime<=0){h.state='lunge';h.rush=.6;h.vx=dx/d*320;h.vy=dy/d*320;tone(110,.12)}
else{h.x+=dx/d*dt*120;h.y+=dy/d*dt*120}
h.x=clamp(h.x,bounds.left,bounds.right);h.y=clamp(h.y,bounds.top,bounds.bottom);contact(h);if(!active)return;
}
const current=target();$('#fill').style.width=current?(100-current.hp)+'%':'0%';$('#label').textContent=linked&&g&&!g.caught?'CAPTURING · '+Math.floor(100-g.hp)+'%':current?.stun>0?'LOCKED · VACUUM NOW · '+Math.max(0,2-current.noSuction).toFixed(1)+'s':'AIM → FLASH TO LOCK → VACUUM';
if(noticeTime<=0)$('#message').textContent=linked?'Keep holding VACUUM. Don’t let it escape!':current?.stun>0?'Hold VACUUM — ghosts relocate after 2 seconds without suction.':'Watch for lunges. FLASH to stun, then hold VACUUM.';
$('#flash').style.opacity=cooldown>0?.55:1;
}
let world3d;try{world3d=createHaunt(canvas)}catch(error){$('#message').textContent='3D needs WebGL. Try opening this page in Safari or Chrome.';throw error}
function render(dt){particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt});world3d.render({player,ghosts,particles,time,flashTimer,vac,lockedGhost,scare,battery,tableUsed})}
function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;update(dt);render(dt);requestAnimationFrame(frame)}
let pointer=null;const stick=$('#stick');function stickMove(e){const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y),scale=d>38?38/d:1;joy={x:x*scale/38,y:y*scale/38};$('#knob').style.transform=`translate(${x*scale}px,${y*scale}px)`}stick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);stickMove(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)stickMove(e)});function endStick(){pointer=null;joy={x:0,y:0};$('#knob').style.transform=''}stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);stick.addEventListener('lostpointercapture',endStick);
$('#flash').addEventListener('pointerdown',e=>{e.preventDefault();flash()});$('#flash').addEventListener('click',e=>{if(e.detail===0)flash()});$('#vacuum').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);vac=true;e.currentTarget.classList.add('active')});function endVac(){vac=false;$('#vacuum').classList.remove('active')}['pointerup','pointercancel','lostpointercapture'].forEach(s=>$('#vacuum').addEventListener(s,endVac));window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','v'].includes(k))e.preventDefault();keys[k]=true;if(k===' '&&!e.repeat)flash();if(k==='v')vac=true});window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;if(k==='v')endVac()});function release(){keys={};endVac();endStick()}window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});$('#reset').onclick=reset;$('#again').onclick=reset;$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';tone(440)};reset();requestAnimationFrame(frame);
