import * as THREE from './three.module.js';
import {WORLD,healthTable,rooms,roomAt,DOOR_GAME,furniture as roomFurniture,yard,shopSpot,doorUnlocked,graveyardRooms,bossRoom,graveyardDoors,graveyardObstacles,bossGate} from './room.js';
export function createHaunt(canvas){
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(720,720,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color('#080c15');scene.fog=new THREE.FogExp2('#080c15',.026);
const camera=new THREE.PerspectiveCamera(43,1,.1,70);const scale=60,world=WORLD;const px=x=>(x-world/2)/scale;
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
const wood=new THREE.TextureLoader().load('wood.png');wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(2,2);wood.anisotropy=4;
const timber=mat('#82745b',{map:wood}),darkwood=mat('#4b3a30',{map:wood}),metal=mat('#8caaa6',{metalness:.65,roughness:.37}),black=mat('#101b26'),brass=mat('#c39250',{metalness:.55});
function box(parent,x,y,z,w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function ball(parent,x,y,z,r,m,s=[1,1,1]){const o=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),m);o.position.set(x,y,z);o.scale.set(...s);o.castShadow=true;parent.add(o);return o}
// One mansion room's shell, built directly in scene units via px() - the same conversion used
// for every entity, so static geometry and collision always agree. West/east can each be a
// solid wall or an open doorway (matching room.js's wall-gap collision); south stays open
// (the camera-facing cutaway) and north always gets the back wall + window treatment.
function buildRoom(rect,west,east){
const x0=px(rect.x),x1=px(rect.x+rect.w),z0=px(rect.y),z1=px(rect.y+rect.h);
const cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,d=z1-z0;
const g=new THREE.Group();scene.add(g);
box(g,cx,-.2,cz,w+.3,.4,d+.3,timber);
box(g,cx,2,z0-.15,w+.3,4,.3,darkwood);
for(let fx=x0+1;fx<=x1-1;fx+=2){box(g,fx,2,z0-.02,.13,4,.13,brass);box(g,fx,.55,z0+.04,1.75,.85,.1,mat('#293638'))}
box(g,cx,.13,z0+.02,w+.2,.16,.2,brass);box(g,cx,3.9,z0,w+.2,.16,.22,brass);
const windowMat=mat('#7b9abd',{emissive:'#527dae',emissiveIntensity:.65});box(g,cx,2.6,z0-.17,2.4,2.1,.08,black);box(g,cx,2.6,z0-.08,2.1,1.9,.05,windowMat);box(g,cx,2.6,z0+.01,.09,1.9,.1,brass);box(g,cx,2.6,z0+.02,2.1,.09,.1,brass);
const rugW=Math.max(1,w-1.2),rugD=Math.max(1,d-1.4);box(g,cx,.025,cz+.15,rugW,.025,rugD,mat('#283e3b'));
const doorZ0=px(DOOR_GAME[0]),doorZ1=px(DOOR_GAME[1]);
const side=(atX,open)=>{if(open){box(g,atX,1.1,(z0+doorZ0)/2,.25,2.2,doorZ0-z0+.1,darkwood);box(g,atX,1.1,(doorZ1+z1)/2,.25,2.2,z1-doorZ1+.1,darkwood)}else box(g,atX,1.1,cz,.25,2.2,d+.3,darkwood)};
side(x0-.12,west==='door');side(x1+.12,east==='door');
return g;
}
buildRoom(rooms[0],'solid','door');
buildRoom(rooms[1],'door','door');
buildRoom(rooms[2],'door','door');
buildRoom(yard,'door','solid');
// The exterior doorway (room 2 <-> yard) starts sealed behind a barred door until the
// mansion key is found - doorUnlocked is a live ES-module binding, re-read every render().
const exteriorX=px(rooms[2].x+rooms[2].w),exDoorZ0=px(DOOR_GAME[0]),exDoorZ1=px(DOOR_GAME[1]);
const sealMat=mat('#5a4632',{roughness:.85}),lockGlow=mat('#ffcf5c',{emissive:'#ffb92e',emissiveIntensity:1.4});
const sealDoor=new THREE.Group();scene.add(sealDoor);
box(sealDoor,exteriorX,1.1,(exDoorZ0+exDoorZ1)/2,.22,2.2,exDoorZ1-exDoorZ0-.1,sealMat);
ball(sealDoor,exteriorX,1.1,(exDoorZ0+exDoorZ1)/2,.09,lockGlow);
// The little shop on wheels, parked out in the yard.
const shopWood=mat('#8a5a3c',{roughness:.8}),shopRoof=mat('#c94f4f',{roughness:.7}),wheelMat=mat('#2a2019',{roughness:.9});
const shop=new THREE.Group();shop.position.set(px(shopSpot.x),0,px(shopSpot.y));scene.add(shop);
box(shop,0,.55,0,1.5,.75,.85,shopWood);
box(shop,0,.98,0,1.65,.1,.95,darkwood);
for(const wx of [-.6,.6])for(const wz of [-.35,.35]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.12,16),wheelMat);wheel.rotation.z=Math.PI/2;wheel.position.set(wx,.22,wz);wheel.castShadow=true;shop.add(wheel)}
for(const px2 of [-.68,.68])box(shop,px2,1.6,-.38,.06,1.3,.06,darkwood);
box(shop,0,2.28,0,1.7,.08,1.05,shopRoof);
box(shop,0,1.25,.45,.7,.42,.04,mat('#f4e6c1',{roughness:.9}));
shop.add(new THREE.PointLight('#ffd98a',2.2,3));
// A dropped mansion key - walk-over pickup, same pattern as the health-table battery.
const keyMat=mat('#ffd35c',{metalness:.6,roughness:.3,emissive:'#c9932e',emissiveIntensity:.5});
const keyProp=new THREE.Group();scene.add(keyProp);
ball(keyProp,0,0,0,.12,keyMat);box(keyProp,0,0,.16,.05,.05,.24,keyMat);box(keyProp,.05,0,.3,.02,.08,.03,keyMat);box(keyProp,-.05,0,.32,.02,.06,.03,keyMat);
keyProp.add(new THREE.PointLight('#ffd35c',2,2));keyProp.visible=false;
// Coin pickups - 3 fixed mansion spots plus the procedural graveyard's larger treasure
// haul. Preallocate generously since the graveyard's count varies per generation; each
// mesh gets its own material clone so gold vs silver can be recolored independently.
const coinMat=mat('#ffd35c',{metalness:.5,roughness:.3,emissive:'#e0a92e',emissiveIntensity:.6});
const coinGeo=new THREE.CylinderGeometry(.13,.13,.035,18);
const coinProps=Array.from({length:32},()=>{const c=new THREE.Mesh(coinGeo,coinMat.clone());c.rotation.x=Math.PI/2;c.visible=false;c.castShadow=true;scene.add(c);return c});
const goldColor=new THREE.Color('#ffd35c'),goldEmissive=new THREE.Color('#e0a92e'),silverColor=new THREE.Color('#d8e0e6'),silverEmissive=new THREE.Color('#9aa6ad');
// ---- The procedural graveyard, past the yard, and its reserved boss room ----
// Same construction approach as buildRoom() (built via px(), open/solid sides mirroring
// room.js's collision gaps) but themed for the outdoors: bare ground, low stone/hedge
// walls, no window. Unlike the mansion's shared fixed DOOR_GAME, each graveyard doorway
// has its own randomized opening range, passed in directly rather than assumed.
const stoneMat=mat('#6b7580',{roughness:.9}),dirtMat=mat('#3a3226',{roughness:1}),hedgeMat=mat('#243422',{roughness:.95});
function buildGraveRoom(rect,westRange,eastRange){
  const x0=px(rect.x),x1=px(rect.x+rect.w),z0=px(rect.y),z1=px(rect.y+rect.h);
  const cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,d=z1-z0;
  const g=new THREE.Group();scene.add(g);
  box(g,cx,-.2,cz,w+.3,.4,d+.3,dirtMat);
  box(g,cx,1.6,z0-.15,w+.3,3.2,.3,stoneMat);
  const side=(atX,range)=>{
    if(range){const rz0=px(range[0]),rz1=px(range[1]);box(g,atX,1.6,(z0+rz0)/2,.25,3.2,rz0-z0+.1,hedgeMat);box(g,atX,1.6,(rz1+z1)/2,.25,3.2,z1-rz1+.1,hedgeMat)}
    else box(g,atX,1.6,cz,.25,3.2,d+.3,hedgeMat);
  };
  side(x0-.12,westRange);side(x1+.12,eastRange);
  return g;
}
const graveChain=[...graveyardRooms,bossRoom];
graveChain.forEach((r,i)=>buildGraveRoom(r,graveyardDoors[i]?graveyardDoors[i].range:null,graveyardDoors[i+1]?graveyardDoors[i+1].range:null));
// A real door at every graveyard threshold (yard->grave1 through grave4->grave5) instead of
// an empty gap - closed, it fills the doorway flush; game.js's doorOpen[] (proximity-driven)
// swings it open with a bang as the robot approaches, and shut again once it moves off. The
// boss doorway is excluded - that one stays behind the permanent barred gate above/below.
const doorPanelMat=mat('#2c2118',{roughness:.85}),doorBandMat=mat('#4a4136',{metalness:.4,roughness:.6});
const graveDoors=graveyardDoors.map(d=>{
  if(d.isBoss)return null;
  const dz0=px(d.range[0]),dz1=px(d.range[1]),dx=px(d.x),len=dz1-dz0;
  const hinge=new THREE.Group();hinge.position.set(dx,1.5,dz0);hinge.userData.angle=0;scene.add(hinge);
  box(hinge,0,0,len/2,.22,3,len,doorPanelMat);
  box(hinge,.13,.4,len/2,.05,.1,len-.14,doorBandMat);box(hinge,.13,-.4,len/2,.05,.1,len-.14,doorBandMat);
  ball(hinge,.15,0,len-.22,.06,doorBandMat);
  return hinge;
});
// Gravestones scattered through the graveyard rooms - simple obstacle props, same pattern
// as the mansion furniture below.
const graveStoneMat=mat('#8a93a0',{roughness:.85});
graveyardObstacles.forEach(r=>{const x=px(r.x+r.w/2),z=px(r.y+r.h/2),g=new THREE.Group();scene.add(g);box(g,x,.32,z,.4,.62,.12,graveStoneMat);ball(g,x,.62,z,.2,graveStoneMat,[1,.55,.6])});
// The boss room's entrance stays permanently barred this phase - the room is reserved,
// not yet playable. A bigger, more ominous cousin of the mansion's sealed-door prop.
const bossBar=mat('#2e2a24',{roughness:.85}),bossGlow=mat('#8a2f2f',{emissive:'#c23f3f',emissiveIntensity:1.1});
if(bossGate){
  const bgx=px(bossGate.x),bgz=px(bossGate.y);
  const gate=new THREE.Group();scene.add(gate);
  box(gate,bgx,1.6,bgz,.3,3.2,1.9,bossBar);
  for(let i=0;i<3;i++)box(gate,bgx,.5+i*1.1,bgz,.32,.14,2.1,bossBar);
  ball(gate,bgx,1.6,bgz,.13,bossGlow);
  gate.add(new THREE.PointLight('#c23f3f',1.6,2.4));
}
roomFurniture.forEach((r,i)=>{const x=px(r.x+r.w/2),z=px(r.y+r.h/2),w=(r.w)/scale,d=(r.h)/scale,g=new THREE.Group();scene.add(g);box(g,x,.65,z,w,1.3,d,darkwood);box(g,x,1.36,z,w+.12,.16,d+.12,timber);for(let j=0;j<2;j++){box(g,x,.4+j*.57,z+d/2+.015,w-.18,.44,.07,timber);ball(g,x,.4+j*.57,z+d/2+.08,.055,brass)}if(i===0)for(let j=0;j<5;j++)box(g,x-.8+j*.32,1.7,z,.21,.57,.65,mat(['#576d65','#7a4947','#927745'][j%3]));});
scene.add(new THREE.HemisphereLight('#8babc5','#25202b',.32));const moon=new THREE.DirectionalLight('#9bbaf3',.78);moon.position.set(-3,10,-5);moon.castShadow=true;moon.shadow.mapSize.set(2048,1024);Object.assign(moon.shadow.camera,{left:-40,right:40,top:20,bottom:-20});moon.shadow.bias=-.001;scene.add(moon);
// A real collision table with a glowing battery marker and four legs.
const table=new THREE.Group();table.position.set(px(healthTable.x+healthTable.w/2),0,px(healthTable.y+healthTable.h/2));scene.add(table);
const tw=healthTable.w/60,td=healthTable.h/60;box(table,0,.94,0,tw,.16,td,timber);for(const x of [-tw/2+.13,tw/2-.13])for(const z of [-td/2+.13,td/2-.13])box(table,x,.43,z,.14,.86,.14,darkwood);
const batteryGreen=mat('#86ffb2',{emissive:'#35ff7c',emissiveIntensity:1.2});const marker=new THREE.Group();table.add(marker);box(marker,0,1.04,0,.42,.02,.12,batteryGreen);box(marker,0,1.04,0,.12,.02,.42,batteryGreen);
const pickup=new THREE.Group();scene.add(pickup);box(pickup,0,0,0,.32,.52,.27,metal);box(pickup,0,.3,0,.16,.07,.15,brass);box(pickup,0,0,.143,.23,.35,.025,batteryGreen);box(pickup,0,0,.166,.15,.045,.025,black);box(pickup,0,0,.17,.045,.15,.025,black);pickup.add(new THREE.PointLight('#66ffaa',3,2.5));pickup.visible=false;
// Roller-ball robot: the ball rotates independently beneath the swiveling body.
const robot=new THREE.Group();scene.add(robot);robot.scale.setScalar(1.3);const roller=ball(robot,0,.31,0,.32,metal);for(const axis of [0,1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.322,.022,8,32),black);if(axis)ring.rotation.y=Math.PI/2;roller.add(ring)}
const body=new THREE.Group();robot.add(body);box(body,0,.78,0,.68,.59,.47,metal);ball(body,0,1.28,0,.45,metal,[1,.76,.76]);box(body,0,1.29,.303,.64,.27,.07,black);const eye=mat('#a8ffe2',{emissive:'#78edcc',emissiveIntensity:2});for(const x of [-.16,.16])box(body,x,1.29,.35,.095,.125,.025,eye);box(body,0,.85,-.36,.47,.6,.25,brass);for(const x of [-.43,.43])ball(body,x,.82,0,.14,metal,[.8,1.4,1]);box(body,0,1.67,0,.035,.2,.035,brass);ball(body,0,1.79,0,.065,eye);
const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.17,.12,.45,20),metal);nozzle.rotation.x=Math.PI/2;nozzle.position.set(.32,.85,.4);body.add(nozzle);const opening=new THREE.Mesh(new THREE.CircleGeometry(.14,20),black);opening.position.set(.32,.85,.63);body.add(opening);
const lamp=ball(body,0,1.53,.22,.11,mat('#fff0ba',{emissive:'#ffe4a1',emissiveIntensity:2}));const beam=new THREE.SpotLight('#fff0c0',65,6.4,.53,.65,1.2);beam.position.set(0,1.5,.35);body.add(beam);body.add(beam.target);beam.target.position.set(0,.65,6);const halo=new THREE.PointLight('#b2d6e0',3.5,3.2,2);halo.position.set(0,1,0);robot.add(halo);
const ghosts=[],ghostGlow=[],ghostEyeMat=[],ghostLight=[],ghostTails=[];const ghostColors=['#a6f5cd','#ff6a5a','#ffcf92'];const ghostEyeColors=['#ffd35c','#ff2f22','#79e0ff'];ghostColors.forEach((color,gi)=>{const root=new THREE.Group();scene.add(root);const glow=mat(color,{transparent:true,opacity:.86,emissive:color,emissiveIntensity:.65,roughness:.2});ball(root,0,0,0,.47,glow,[1,1.22,.75]);const tails=[];for(let i=0;i<5;i++){const tail=new THREE.Mesh(new THREE.ConeGeometry(.15,.45+(i%2)*.18,10),glow);tail.rotation.z=Math.PI;tail.position.set((i-2)*.17,-.55,0);root.add(tail);tails.push(tail)}const eyeColor=ghostEyeColors[gi];const eyeMat=mat(eyeColor,{transparent:true,opacity:1,emissive:eyeColor,emissiveIntensity:3});for(const x of [-.17,.17]){ball(root,x,.12,.32,.14,black,[1,1.25,.45]);ball(root,x,.12,.38,.045,eyeMat);ball(root,x*3,-.15,0,.16,glow,[.65,1.8,.65])}ball(root,0,-.18,.34,.13,black,[.85,1.5,.3]);const light=new THREE.PointLight(color,2,2.3);root.add(light);ghosts.push(root);ghostGlow.push(glow);ghostEyeMat.push(eyeMat);ghostLight.push(light);ghostTails.push(tails)});
const iceMat=mat('#bdeeff',{transparent:true,opacity:.9,emissive:'#7fd4ff',emissiveIntensity:1.8,roughness:.15});const iceBoltMesh=new THREE.Mesh(new THREE.OctahedronGeometry(.14,0),iceMat);iceBoltMesh.add(new THREE.PointLight('#8fdcff',2.5,2));iceBoltMesh.visible=false;scene.add(iceBoltMesh);
const tetherGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const tether=new THREE.Line(tetherGeometry,new THREE.LineBasicMaterial({color:'#b8ffe3',transparent:true,opacity:.9}));scene.add(tether);
// A small reusable preallocated point cloud - avoids a per-frame buffer reallocation (was a stutter source).
function makeParticleSystem(max,color,size,opacity){const geo=new THREE.BufferGeometry();const pos=new Float32Array(max*3);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setDrawRange(0,0);const points=new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity}));scene.add(points);return {geo,pos,points,max}}
const sparkSys=makeParticleSystem(170,'#c8fbe0',.07,.8);
const dustSys=makeParticleSystem(90,'#8a7a63',.1,.5);
function drawParticles(sys,list,heightFn){let n=0;for(let k=0;k<list.length&&n<sys.max;k++){const p=list[k];if(p.life<=0)continue;const o3=n*3;sys.pos[o3]=px(p.x);sys.pos[o3+1]=heightFn(p);sys.pos[o3+2]=px(p.y);n++}sys.geo.attributes.position.needsUpdate=true;sys.geo.setDrawRange(0,n)}
// A small dropped note - appears once the final ghost is captured.
const noteMat=mat('#e9dcb8',{roughness:.9});const noteProp=new THREE.Group();scene.add(noteProp);box(noteProp,0,0,0,.34,.02,.44,noteMat);box(noteProp,0,.011,0,.22,.002,.02,mat('#8a7350'));box(noteProp,0,.011,-.08,.16,.002,.015,mat('#8a7350'));noteProp.add(new THREE.PointLight('#fff3cf',1.4,1.6));noteProp.visible=false;
let previous=new THREE.Vector3(),first=true;
return {render({player,ghosts:states,particles,time,dt=0,lightOn,lightCharge,maxLightCharge=100,vac,lockedGhost,scare,battery,tableUsed,iceBolt,note,key,coinPickups=[],doorOpen=[]}){
sealDoor.visible=!doorUnlocked;
// Bang open fast (with a slight overshoot past perpendicular for punch), ease shut slower.
graveDoors.forEach((hinge,i)=>{if(!hinge)return;const target=doorOpen[i]?-2.05:0;const rate=doorOpen[i]?16:5;hinge.userData.angle+=(target-hinge.userData.angle)*Math.min(1,dt*rate);hinge.rotation.y=hinge.userData.angle;});
keyProp.visible=!!key;if(key){keyProp.position.set(px(key.x),.35+Math.sin(time*3)*.08,px(key.y));keyProp.rotation.y=time*1.6;}
coinPickups.forEach((c,i)=>{const m=coinProps[i];if(!m)return;m.visible=!c.taken;if(!c.taken){m.position.set(px(c.x),.3+Math.sin(time*4+i)*.05,px(c.y));m.rotation.y=time*2.2;const silver=c.kind==='silver';m.material.color.copy(silver?silverColor:goldColor);m.material.emissive.copy(silver?silverEmissive:goldEmissive);}});const x=px(player.x),z=px(player.y);robot.position.set(x,0,z);body.rotation.y=Math.PI/2-player.a;if(!first){roller.rotation.x+=(z-previous.z)/.32;roller.rotation.z-=(x-previous.x)/.32}previous.set(x,0,z);first=false;
robot.visible=player.hurt<=0||Math.floor(time*18)%2===0;marker.visible=!tableUsed;pickup.visible=!!battery;if(battery){pickup.position.set(px(battery.x),.65+Math.sin(time*4)*.1,px(battery.y));pickup.rotation.y=time*1.8;}
const lowBattery=lightOn&&lightCharge<maxLightCharge*.2;const flicker=lowBattery?.75+Math.random()*.35:1;
beam.intensity=lightOn?150*flicker:0;beam.distance=lightOn?7.6:6.4;lamp.material.emissiveIntensity=lightOn?6*flicker:.8;
metal.emissive.set(player.slow>0?'#3aa0ff':'#000000');
states.forEach((g,i)=>{const o=ghosts[i];o.visible=!g.caught&&g.state!=='hidden';if(!o.visible)return;
const revealed=g.state==='warning'?0:(g.reveal??1);const hunting=g.state!=='warning';
const bobSpeed=hunting?4.4+revealed*1.8:1.6,bobAmp=hunting?.15+revealed*.06:.08;
const jitterX=hunting?Math.sin(time*15+g.seed*4)*.025*revealed:0,jitterZ=hunting?Math.cos(time*13+g.seed*3)*.025*revealed:0;
o.position.set(px(g.x)+jitterX,1.2+Math.sin(time*bobSpeed+g.seed)*bobAmp,px(g.y)+jitterZ);
o.rotation.y=Math.atan2(x-o.position.x,z-o.position.z);
o.rotation.z=g.stun>0?Math.sin(time*22)*.07:hunting?Math.sin(time*(3+revealed*2)+g.seed)*.09:Math.sin(time*1.4+g.seed)*.04;
ghostGlow[i].opacity=.035+.825*revealed;ghostGlow[i].emissiveIntensity=.02+.63*revealed;ghostEyeMat[i].opacity=Math.max(0,revealed*1.5-.5);ghostLight[i].intensity=.04+1.96*revealed;
const eyePulse=hunting?1+Math.sin(time*9+g.seed*1.7)*.35:1;let eyeIntensity=3*eyePulse,size=hunting?1.08:1;
if(g.state==='lunge'){const t=(g.rush??0)/.6,spike=Math.max(0,t-.7)/.3;size=1.5+spike*.4;eyeIntensity=3*(1+spike*2.2)}
const beingSucked=vac&&lockedGhost===g&&!g.caught&&g.stun>0&&Math.hypot(g.x-player.x,g.y-player.y)<340;
if(beingSucked){
// Spaghettify toward the nozzle and flail in a panic - the "small thrilling battle" read.
const strain=1-g.hp/100,stretch=1.3+Math.sin(time*13+g.seed)*.25+strain*.3;
o.scale.set(size*.8,size*.8,size*stretch);
eyeIntensity=3*(1.5+Math.sin(time*20+g.seed)*.7);
}else o.scale.setScalar(size);
ghostEyeMat[i].emissiveIntensity=eyeIntensity;
ghostTails[i].forEach((tail,ti)=>{const ph=g.seed+ti*1.3,tSpeed=beingSucked?18:hunting?7+revealed*3:2.5,tAmp=beingSucked?.34:hunting?.16+revealed*.14:.06;tail.rotation.x=Math.sin(time*tSpeed+ph)*tAmp;tail.rotation.y=Math.cos(time*tSpeed*.8+ph)*tAmp*.8;});
});
iceBoltMesh.visible=!!iceBolt;if(iceBolt){iceBoltMesh.position.set(px(iceBolt.x),1.1,px(iceBolt.y));iceBoltMesh.rotation.y=time*6;iceBoltMesh.rotation.x=time*4;}
tether.visible=!!(vac&&lockedGhost&&!lockedGhost.caught&&lockedGhost.stun>0&&Math.hypot(lockedGhost.x-player.x,lockedGhost.y-player.y)<340);if(tether.visible){const a=new THREE.Vector3(.32,.85,.64);body.localToWorld(a);tether.geometry.setFromPoints([a,new THREE.Vector3(px(lockedGhost.x),1.15,px(lockedGhost.y))]);tether.material.opacity=.7+Math.sin(time*26)*.3;halo.intensity=6+Math.sin(time*22)*2.5;}else halo.intensity=3.5;
drawParticles(sparkSys,particles.filter(p=>p.kind!=='dust'),p=>.8+p.life*.5);
drawParticles(dustSys,particles.filter(p=>p.kind==='dust'),p=>.05+p.life*.2);
noteProp.visible=!!note;if(note){noteProp.position.set(px(note.x),.05+Math.sin(time*2)*.015,px(note.y));noteProp.rotation.y=Math.sin(time*.7)*.2;}
const curRoom=roomAt(player.x,player.y),rx0=px(curRoom.x),rx1=px(curRoom.x+curRoom.w),rz0=px(curRoom.y),rz1=px(curRoom.y+curRoom.h),margin=1.3;
const focusX=THREE.MathUtils.clamp(x,rx0+margin,rx1-margin),focusZ=THREE.MathUtils.clamp(z,rz0+margin,rz1-margin);camera.position.set(focusX,9.6,focusZ+9.8);camera.lookAt(focusX,.6,focusZ-.8);if(scare>0)camera.position.x+=Math.sin(time*65)*scare*.14;renderer.render(scene,camera);
}};
}
