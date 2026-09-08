import {createHaunt} from './scene3d.js';
import {ROOM_SCALE,WORLD,healthTable,bounds,blocked,shopSpot,unlockExteriorDoor,lockExteriorDoor,roomAt,generateGraveyard,graveyardCoinSpots,graveyardDoors,bossGate} from './room.js';
const canvas=document.querySelector('#game'),$=s=>document.querySelector(s);
// Generated once at load (not per-restart) so scene3d's static procedural geometry, built
// once in createHaunt() below, always matches room.js's layout/collision.
generateGraveyard();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),colors=['#a6f5cd','#ff6a5a','#ffcf92'],types=['flee','melee','ice'];
let player,ghosts,particles,time=0,last=0,lightOn=false,lightCharge=100,maxLightCharge=100,vac=false,keys={},joy={x:0,y:0},caught=0,active=true,sound=false,ac,noticeTime=0,lockedGhost=null,scare=0,battery=null,tableUsed=false,iceBolt=null,dustCd=0,note=null,maxHp=100,coins=0,hasKey=false,key=null,coinPickups=[],shopOpen=false,upgrades={},announcedGraveyard=false,announcedBoss=false;
// One entry per graveyard doorway (yard->grave1 through grave5->boss, boss excluded below) -
// whether that door is currently banged open. scene3d.js only handles the swing animation;
// this is the actual game-state toggle, driven purely by player proximity.
let doorOpen=graveyardDoors.map(()=>false);
// One-time shop upgrades, bought with coins found around the mansion.
const UPGRADES=[
{id:'battery',label:'Battery Pack',desc:'+30 max flashlight charge',cost:20,apply:()=>{maxLightCharge+=30;lightCharge=Math.min(maxLightCharge,lightCharge+30)}},
{id:'suction',label:'Suction Boost',desc:'Capture ghosts faster',cost:25,apply:()=>{suctionMul+=.35}},
{id:'hp',label:'Reinforced Plating',desc:'+25 max HP',cost:20,apply:()=>{maxHp+=25;player.hp=Math.min(maxHp,player.hp+25)}},
];
let suctionMul=1;
function say(t,d=2.5){noticeTime=d;$('#message').textContent=t}
function tone(f,d=.1){if(!sound)return;try{ac??=new(window.AudioContext||window.webkitAudioContext)();ac.resume();const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(f,ac.currentTime);o.frequency.exponentialRampToValueAtTime(f*1.3,ac.currentTime+d);g.gain.setValueAtTime(.055,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch{}}
function burst(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*200,vy:(Math.random()-.5)*200,life:.5+Math.random()*.5,color})}
function syncLight(){const pct=Math.round(clamp(lightCharge/maxLightCharge*100,0,100));$('#light-text').textContent=pct+'%';$('#light-fill').style.width=pct+'%';$('#light').setAttribute('aria-valuenow',pct);$('#light').classList.toggle('low',lightCharge<=maxLightCharge*.2)}
function updateShop(near){
if(near&&!shopOpen){shopOpen=true;$('#shop').hidden=false;tone(600,.15);say('Traveling shop! Spend your coins wisely.',2.2)}
else if(!near&&shopOpen){shopOpen=false;$('#shop').hidden=true}
if(!near)return;
$('#shop-coins').textContent=coins+' coins';
UPGRADES.forEach(u=>{const btn=$('#buy-'+u.id);const owned=!!upgrades[u.id];btn.disabled=owned||coins<u.cost;btn.textContent=owned?u.label+' ✓ installed':u.label+' — '+u.desc+' ('+u.cost+'c)'});
}
function buyUpgrade(id){const u=UPGRADES.find(u=>u.id===id);if(!u||upgrades[u.id]||coins<u.cost)return;coins-=u.cost;upgrades[u.id]=true;u.apply();tone(760,.25);say(u.label+' installed!',2);ui();updateShop(true)}
function ui(){
$('#count').textContent='●'.repeat(caught)+'○'.repeat(3-caught)+'   '+caught+' / 3 captured';
$('#health-text').textContent=player.hp+' / '+maxHp+' HP';$('#health-fill').style.width=(player.hp/maxHp*100)+'%';$('#health').setAttribute('aria-valuemax',maxHp);$('#health').setAttribute('aria-valuenow',player.hp);$('#health').classList.toggle('low',player.hp<=maxHp*.25);
$('#battery-status').textContent=tableUsed?(battery?'Battery ready · +50 HP':'Battery used'):'Bump the green-marked table · +50 HP';
$('#coins-text').textContent=(hasKey?'🔑 ':'')+'🪙 '+coins;
syncLight();
}
function finish(){active=false;lockedGhost=null;release();$('#win small').textContent='POWER DEPLETED';$('#win h2').textContent='Robot offline.';$('#win p').textContent='The ghosts got you. Restart with '+maxHp+' HP and a fresh battery.';$('#again').textContent='Try again';$('#win').hidden=false}
function reset(){
maxHp=100;maxLightCharge=100;suctionMul=1;upgrades={};coins=0;hasKey=false;key=null;shopOpen=false;$('#shop').hidden=true;lockExteriorDoor();announcedGraveyard=false;announcedBoss=false;doorOpen=graveyardDoors.map(()=>false);
lockedGhost=null;player={x:810*ROOM_SCALE,y:190*ROOM_SCALE,a:-Math.PI/2,hp:maxHp,hurt:0,slow:0};particles=[];scare=0;time=0;caught=0;active=true;vac=false;keys={};joy={x:0,y:0};lightOn=false;lightCharge=maxLightCharge;battery=null;tableUsed=false;iceBolt=null;dustCd=0;note=null;
// One ghost per mansion room (west/center/east), matching the flee/melee/ice type order.
ghosts=colors.map((color,i)=>({x:[350,650,1450][i]*ROOM_SCALE,y:[280,280,280][i]*ROOM_SCALE,state:'warning',color,type:types[i],hp:100,stun:0,caught:false,seed:i*2.3,noSuction:0,touching:false,attackTime:0,locked:false,reveal:0,fireCd:1.2,struggleCd:.9}));
// Three fixed coin pickups in the mansion, plus the procedural graveyard's gold/silver
// treasure (generated once at load - see generateGraveyard() below - so its layout matches
// what scene3d already built; only the taken/collected state resets here).
coinPickups=[{x:380*ROOM_SCALE,y:300*ROOM_SCALE,v:15,taken:false},{x:650*ROOM_SCALE,y:320*ROOM_SCALE,v:15,taken:false},{x:1450*ROOM_SCALE,y:300*ROOM_SCALE,v:15,taken:false},
...graveyardCoinSpots.map(c=>({...c,taken:false}))];
$('#win').hidden=true;$('#knob').style.transform='';$('#vacuum').classList.remove('active');$('#fill').style.width='0%';$('#label').textContent='LIGHT ON TO SPOT · VACUUM TO CAPTURE';$('#flash').innerHTML='<b>✦</b> LIGHT OFF';$('#flash').classList.remove('active');say('It’s dark in here. Click LIGHT to see — but its battery drains, so use it wisely.',5);ui();
}
function inBeam(g,range=250,angle=.48){const dx=g.x-player.x,dy=g.y-player.y;return Math.hypot(dx,dy)<range&&Math.cos(Math.atan2(dy,dx)-player.a)>Math.cos(angle)}
function lockValid(){return lockedGhost&&!lockedGhost.caught&&lockedGhost.stun>0&&!['warning','hidden'].includes(lockedGhost.state)&&Math.hypot(lockedGhost.x-player.x,lockedGhost.y-player.y)<380}
function target(){if(lockValid())return lockedGhost;if(!lightOn)return undefined;return ghosts.filter(g=>!g.caught&&g.state!=='warning'&&inBeam(g)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]}
function toggleLight(){if(!active)return;if(!lightOn&&lightCharge<=maxLightCharge*.04){say('Battery too low — let it recharge in the dark.',1.6);tone(160,.2);return}lightOn=!lightOn;tone(lightOn?620:280,.15);$('#flash').innerHTML='<b>✦</b> '+(lightOn?'LIGHT ON':'LIGHT OFF');$('#flash').classList.toggle('active',lightOn);say(lightOn?'Light on — anything it touches wakes up or gets stunned.':'Light off. Dark and quiet... for now.',1.8)}
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
// Same per-axis collision approach as move(), so ghosts can't phase through furniture or the table.
function ghostMove(h,dx,dy){
const nx=clamp(h.x+dx,bounds.left,bounds.right),ny=clamp(h.y+dy,bounds.top,bounds.bottom);
if(dx&&!blocked(nx,h.y,22))h.x=nx;if(dy&&!blocked(h.x,ny,22))h.y=ny;
}
function respawn(g){
if(g.caught)return;const old={x:g.x,y:g.y};let point=null;
for(let i=0;i<80;i++){let x,y;if(i<50&&Math.random()<.7){const a=Math.random()*Math.PI*2,d=210+Math.random()*240;x=player.x+Math.cos(a)*d;y=player.y+Math.sin(a)*d}else{x=bounds.left+Math.random()*(bounds.right-bounds.left);y=bounds.top+Math.random()*(bounds.bottom-bounds.top)}if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom||blocked(x,y,40)||Math.hypot(x-player.x,y-player.y)<175||Math.hypot(x-old.x,y-old.y)<200||ghosts.some(h=>h!==g&&!h.caught&&Math.hypot(x-h.x,y-h.y)<85))continue;point={x,y};break}
if(!point){for(let x=bounds.left+50;x<bounds.right&&!point;x+=95)for(let y=bounds.top+50;y<bounds.bottom;y+=95)if(!blocked(x,y,40)&&Math.hypot(x-player.x,y-player.y)>175&&Math.hypot(x-old.x,y-old.y)>200){point={x,y};break}}
if(!point)return;burst(g.x,g.y,g.color,15);if(lockedGhost===g)lockedGhost=null;Object.assign(g,point,{hp:100,stun:0,state:'warning',noSuction:0,touching:false,attackTime:0,locked:false,reveal:0,fireCd:1.2,struggleCd:.9,slashTime:0,slashCooldown:0,slashAngle:0});burst(g.x,g.y,g.color,15);
}
function contact(g){const touching=!g.caught&&g.state!=='warning'&&g.stun<=0&&Math.hypot(g.x-player.x,g.y-player.y)<45;
// One hit per contact, rather than subtracting health on every animation frame.
if(touching&&!g.touching&&player.hurt<=0){player.hp=Math.max(0,player.hp-5);player.hurt=.45;scare=.35;tone(95,.15);say('Ghost hit! −5 HP',1.1);ui();if(player.hp===0)finish()}g.touching=touching;
}
function redSlash(h,dt){
if(h.type!=='melee'||h.caught||h.stun>0)return;
h.slashCooldown=Math.max(0,(h.slashCooldown||0)-dt);
const dx=player.x-h.x,dy=player.y-h.y,d=Math.hypot(dx,dy);
if((h.slashTime||0)>0){
  const before=h.slashTime;h.slashTime=Math.max(0,h.slashTime-dt);
  // Direction is committed during the wind-up: sidestepping can evade it.
  if(before>.28&&h.slashTime<=.28){
    tone(145,.13);
    if(d<125&&Math.cos(Math.atan2(dy,dx)-h.slashAngle)>Math.cos(1)&&player.hurt<=0){
      player.hp=Math.max(0,player.hp-5);player.hurt=.55;scare=.16;
      say('Claw slash! −5 HP. Keep your distance!',1.3);ui();if(player.hp===0)finish();
    }else say('Slash dodged! Keep reeling it in.',1);
  }
}else if(d<105&&h.slashCooldown===0){
  h.slashTime=.73;h.slashCooldown=1.9;h.slashAngle=Math.atan2(dy,dx);
  say('Claws raised! Back away or sidestep!',.65);tone(260,.10);
}
}
function update(dt){time+=dt;scare=Math.max(0,scare-dt);noticeTime-=dt;player.hurt=Math.max(0,player.hurt-dt);player.slow=Math.max(0,player.slow-dt);if(!active)return;
const slowMul=player.slow>0?.55:1;
if(lightOn){lightCharge=Math.max(0,lightCharge-dt*7);if(lightCharge<=0){lightOn=false;$('#flash').innerHTML='<b>✦</b> LIGHT OFF';$('#flash').classList.remove('active');say('Battery drained! It only recharges while the light is off.',2.2);tone(150,.3)}}
else lightCharge=Math.min(maxLightCharge,lightCharge+dt*4);
syncLight();
let mx=joy.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),my=joy.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0);const mag=Math.hypot(mx,my);if(mag>1){mx/=mag;my/=mag}
if(!lockValid())lockedGhost=null;
// Acquire before joystick movement can rotate the flashlight away.
if(!lockedGhost&&vac){const candidate=target();if(candidate&&candidate.stun>0&&inBeam(candidate,340,.5))lockedGhost=candidate}
if(mag>.12&&!lockedGhost)player.a=Math.atan2(my,mx);
move(mx*dt*(vac?118:185)*slowMul,my*dt*(vac?118:185)*slowMul);
if(lockValid())player.a=Math.atan2(lockedGhost.y-player.y,lockedGhost.x-player.x);else lockedGhost=null;
dustCd-=dt;if(mag>.12&&dustCd<=0){dustCd=.06;const back=player.a+Math.PI;for(let i=0;i<2;i++){const ang=back+(Math.random()-.5)*1.4;particles.push({x:player.x+Math.cos(ang)*14,y:player.y+Math.sin(ang)*14,vx:Math.cos(ang)*30+(Math.random()-.5)*20,vy:Math.sin(ang)*30+(Math.random()-.5)*20,life:.35+Math.random()*.25,color:'#8a7a63',kind:'dust'})}}
if(battery){battery.age+=dt;if(battery.age>.35&&player.hp<maxHp&&Math.hypot(player.x-battery.x,player.y-battery.y)<42){const gain=Math.min(50,maxHp-player.hp);player.hp+=gain;burst(battery.x,battery.y,'#8effbc',30);battery=null;tone(850,.3);say('Recharged +'+gain+' HP!',2);ui()}}
for(const c of coinPickups){if(!c.taken&&Math.hypot(player.x-c.x,player.y-c.y)<38){c.taken=true;coins+=c.v;burst(c.x,c.y,c.kind==='silver'?'#d8e0e6':'#ffd35c',16);tone(820,.12);say('+'+c.v+' coins',1.3);ui()}}
if(!announcedGraveyard&&roomAt(player.x,player.y).name.startsWith('grave')){announcedGraveyard=true;say('A graveyard beyond the mansion... treasure glints among the headstones.',3.5)}
if(!announcedBoss&&bossGate&&Math.hypot(player.x-bossGate.x,player.y-bossGate.y)<170){announcedBoss=true;say('The far gate is sealed shut. Something bigger sleeps beyond — not yet.',3.5)}
// Graveyard doors bang open as the robot approaches and swing shut again once it moves off -
// a startle each time, not a one-shot. The boss gate stays out of this (it never opens).
graveyardDoors.forEach((d,i)=>{
if(d.isBoss)return;
const dy=(d.range[0]+d.range[1])/2,dist=Math.hypot(player.x-d.x,player.y-dy);
if(!doorOpen[i]&&dist<150){doorOpen[i]=true;burst(d.x,dy,'#6b5a42',14);tone(82,.32);scare=Math.max(scare,.22)}
else if(doorOpen[i]&&dist>260)doorOpen[i]=false;
});
if(key&&!hasKey&&Math.hypot(player.x-key.x,player.y-key.y)<42){hasKey=true;const kx=key.x,ky=key.y;key=null;unlockExteriorDoor();burst(kx,ky,'#ffe9a8',26);tone(760,.3);say('Key acquired! The exterior door has unlocked — head east to the yard.',3.5);ui()}
updateShop(hasKey&&Math.hypot(player.x-shopSpot.x,player.y-shopSpot.y)<150);
if(iceBolt){iceBolt.x+=iceBolt.vx*dt;iceBolt.y+=iceBolt.vy*dt;iceBolt.life-=dt;if(Math.hypot(iceBolt.x-player.x,iceBolt.y-player.y)<40){player.slow=2.2;burst(iceBolt.x,iceBolt.y,'#bdeeff',18);tone(300,.25);say('Frozen! Moving slower for a moment.',1.5);iceBolt=null}else if(iceBolt.life<=0)iceBolt=null}
const g=target();const linked=!!(g&&vac&&g.stun>0&&(g===lockedGhost?lockValid():inBeam(g,340,.5)));
if(linked){
lockedGhost=g;
g.noSuction=0;g.stun=Math.max(g.stun,.4);
const dx=g.x-player.x,dy=g.y-player.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
const counter=clamp(-(mx*nx+my*ny),0,1);
g.captureAge=(g.captureAge||0)+dt;
const ramp=1-Math.exp(-g.captureAge*7),strength=clamp(g.hp/100,0,1);
const finishPull=clamp((.30-strength)/.30,0,1);
// Approximately 3 seconds when bracing, 4.5 when simply holding suction.
// Smooth forces replace the old instantaneous 42px ghost / 24px robot jumps.
g.hp-=dt*(21+12*counter+5*finishPull)*suctionMul;
g.pullingBack=counter;g.tension=ramp*(.45+.55*strength);
const wave=Math.sin(g.captureAge*3.4+g.seed)*.5+.5;
const drag=(62+34*strength+12*wave)*ramp*(1-counter*.28)*(1-finishPull*.7);
const desiredX=nx*drag,desiredY=ny*drag,blend=1-Math.exp(-dt*9);
g.pullVX=(g.pullVX||0)+(desiredX-(g.pullVX||0))*blend;
g.pullVY=(g.pullVY||0)+(desiredY-(g.pullVY||0))*blend;
move(g.pullVX*dt,g.pullVY*dt);
const spring=clamp((d-145)*.65,-65,90);
const radial=(35*strength-55*counter-85*finishPull-spring)*ramp;
const sideways=Math.sin(g.captureAge*2.5+g.seed)*22*strength*ramp;
const gx=nx*radial-ny*sideways,gy=ny*radial+nx*sideways;
g.captureVX=(g.captureVX||0)+(gx-(g.captureVX||0))*blend;
g.captureVY=(g.captureVY||0)+(gy-(g.captureVY||0))*blend;
// Prevent the ghost crossing through the robot during the final reel-in.
const inward=g.captureVX*nx+g.captureVY*ny;
if(d<85&&inward<0){g.captureVX-=inward*nx;g.captureVY-=inward*ny}
ghostMove(g,g.captureVX*dt,g.captureVY*dt);
if(g.hp<=0){g.caught=true;if(lockedGhost===g)lockedGhost=null;caught++;burst(g.x,g.y,g.color,40);tone(880,.3);say('Ghost bottled!',2);ui();if(caught===3){note={x:g.x,y:g.y};key={x:g.x+26,y:g.y};burst(g.x,g.y,'#f5e4b8',24);tone(700,.4);say('The last ghost drops a note — and a key glints beside it!',3);ui()}}}
for(const h of ghosts){if(h.caught)continue;
if(!(linked&&h===g)){h.captureAge=0;h.pullVX=0;h.pullVY=0;h.captureVX=0;h.captureVY=0;h.tension=0;h.pullingBack=0}
if(h.locked&&!(linked&&h===g)){h.noSuction+=dt;if(h.noSuction>2){const wasLocked=lockedGhost===h;respawn(h);if(wasLocked)say('It escaped! Keep suction going to stop it relocating.',2);continue}h.stun=Math.max(0,h.stun-dt);if(h.stun<=0)h.locked=false}
if(h.state==='warning'){
if(lightOn&&inBeam(h)){h.state='roam';h.attackTime=0;burst(h.x,h.y,h.color,10);tone(140,.2);say('It saw your light — now it’s hunting you!',2)}
else{
// Hidden ghosts stay harmless (state stays 'warning'), but sense the player up close and creep in - unsettling, not dangerous.
const pdx=player.x-h.x,pdy=player.y-h.y,pd=Math.hypot(pdx,pdy)||1;
if(pd<220){const creep=14+40*(1-pd/220);ghostMove(h,pdx/pd*dt*creep,pdy/pd*dt*creep)}
}
continue;
}
const lit=lightOn&&inBeam(h,240,.52);
if(lit){if(h.stun<=0){burst(h.x,h.y,h.color,6);tone(500,.08)}if(!lockValid())lockedGhost=h;if(h.state==='lunge')h.state='roam';h.stun=Math.max(h.stun,1);h.locked=true;h.noSuction=0}
h.reveal=Math.min(1,h.reveal+dt/.4);
redSlash(h,dt);if(!active)return;
if((h.slashTime||0)>0)continue;
contact(h);if(!active)return;if(h.stun>0)continue;
const dx=player.x-h.x,dy=player.y-h.y,d=Math.hypot(dx,dy)||1;h.attackTime-=dt;
if(h.type==='flee'){
if(d<260)ghostMove(h,-dx/d*dt*85,-dy/d*dt*85);
}else if(h.type==='ice'){
h.fireCd-=dt;
if(d>380)ghostMove(h,dx/d*dt*70,dy/d*dt*70);else if(d<260)ghostMove(h,-dx/d*dt*55,-dy/d*dt*55);
if(!iceBolt&&h.fireCd<=0&&d<650){iceBolt={x:h.x,y:h.y,vx:dx/d*260,vy:dy/d*260,life:2.2};h.fireCd=2.6;tone(500,.15)}
}else if(h.state==='lunge'){ghostMove(h,h.vx*dt,h.vy*dt);h.rush-=dt;if(h.rush<=0){h.state='roam';h.attackTime=.65}}
else if(d<390&&h.attackTime<=0){h.state='lunge';h.rush=.6;h.vx=dx/d*200;h.vy=dy/d*200;tone(110,.12)}
else ghostMove(h,dx/d*dt*72,dy/d*dt*72);
contact(h);if(!active)return;
}
if(lockValid())player.a=Math.atan2(lockedGhost.y-player.y,lockedGhost.x-player.x);
const current=target();$('#fill').style.width=current?(100-current.hp)+'%':'0%';$('#label').textContent=linked&&g&&!g.caught?'LOCKED ON · '+Math.floor(100-g.hp)+'% · PULL BACK':current?.stun>0?'LOCKED · VACUUM NOW · '+Math.max(0,2-current.noSuction).toFixed(1)+'s':'LIGHT ON TO SPOT · VACUUM TO CAPTURE';
if(noticeTime<=0)$('#message').textContent=linked?(g.hp<30?'Almost in! Keep pulling!':g.pullingBack>.45?'Good brace! You’re reeling it in.':'It’s dragging you! Pull away with the joystick.') :current?.stun>0?'Hold VACUUM — ghosts relocate after 2 seconds without suction.':lightOn?(lightCharge<maxLightCharge*.2?'Battery low! It’ll cut out soon — find a target fast.':'Sweep the light around — it stuns whatever it touches.'):shopOpen?'Welcome! Spend your coins on upgrades.':'Turn the light on to see. It wakes hidden ghosts and stuns awake ones.';
}
let world3d;try{world3d=createHaunt(canvas)}catch(error){$('#message').textContent='3D needs WebGL. Try opening this page in Safari or Chrome.';throw error}
function render(dt){particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt});world3d.render({player,ghosts,particles,time,dt,lightOn,lightCharge,maxLightCharge,vac,lockedGhost,scare,battery,tableUsed,iceBolt,note,key,coinPickups,doorOpen})}
function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;update(dt);render(dt);requestAnimationFrame(frame)}
let pointer=null;const stick=$('#stick');function stickMove(e){const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y),scale=d>38?38/d:1;joy={x:x*scale/38,y:y*scale/38};$('#knob').style.transform=`translate(${x*scale}px,${y*scale}px)`}stick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);stickMove(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)stickMove(e)});function endStick(){pointer=null;joy={x:0,y:0};$('#knob').style.transform=''}stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);stick.addEventListener('lostpointercapture',endStick);
$('#flash').addEventListener('pointerdown',e=>{e.preventDefault();toggleLight()});$('#flash').addEventListener('click',e=>{if(e.detail===0)toggleLight()});$('#vacuum').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);vac=true;e.currentTarget.classList.add('active')});function endVac(){vac=false;$('#vacuum').classList.remove('active')}['pointerup','pointercancel','lostpointercapture'].forEach(s=>$('#vacuum').addEventListener(s,endVac));window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','v'].includes(k))e.preventDefault();keys[k]=true;if(k===' '&&!e.repeat)toggleLight();if(k==='v')vac=true});window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;if(k==='v')endVac()});function release(){keys={};endVac();endStick()}window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});$('#reset').onclick=reset;$('#again').onclick=reset;$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';tone(440)};UPGRADES.forEach(u=>$('#buy-'+u.id).addEventListener('click',()=>buyUpgrade(u.id)));reset();requestAnimationFrame(frame);
