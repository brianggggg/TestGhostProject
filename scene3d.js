import * as THREE from './three.module.js';
import {WORLD,healthTable,rooms,roomAt,DOOR_GAME,furniture as roomFurniture,yard,shopSpot,doorUnlocked,graveyardRooms,bossRoom,graveyardDoors,graveyardObstacles,bossGate,mansionDoors,bossUnlocked,streetRoom,puzzleGlyphs,streetGate,streetUnlocked} from './room.js';
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
// west/east: 'solid' (dead-end wall), 'door' (the mansion's locked exterior threshold -
// unaffected by this change, keeps its own half-wall+sealDoor treatment), or 'skip' (a
// buildConnection()/graveyard-door call handles this side instead - no wall drawn here,
// so the two rooms don't each draw a redundant stub with a void between them).
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
const side=(atX,mode)=>{if(mode==='skip')return;if(mode==='door'){box(g,atX,1.1,(z0+doorZ0)/2,.25,2.2,doorZ0-z0+.1,darkwood);box(g,atX,1.1,(doorZ1+z1)/2,.25,2.2,z1-doorZ1+.1,darkwood)}else box(g,atX,1.1,cz,.25,2.2,d+.3,darkwood)};
side(x0-.12,west);side(x1+.12,east);
return g;
}
buildRoom(rooms[0],'solid','skip');
buildRoom(rooms[1],'skip','skip');
buildRoom(rooms[2],'skip','door');
buildRoom(yard,'door','skip');
// The mansion's two internal doorways (west<->center, center<->east): one continuous
// floor+wall spanning the whole gap between the rooms (rather than each room drawing its
// own stub with open air between them), with the door itself set into it - no more empty
// hallway between adjoining rooms, matching the graveyard's tightened thresholds.
function buildConnection(roomA,roomB,range){
const ax1=px(roomA.x+roomA.w),bx0=px(roomB.x),z0=px(roomA.y),z1=px(roomA.y+roomA.h);
const cx=(ax1+bx0)/2,gapW=bx0-ax1,rz0=px(range[0]),rz1=px(range[1]);
box(scene,cx,-.2,(z0+z1)/2,gapW+.1,.4,z1-z0+.3,timber);
box(scene,cx,1.1,(z0+rz0)/2,gapW,2.2,rz0-z0+.1,darkwood);
box(scene,cx,1.1,(rz1+z1)/2,gapW,2.2,z1-rz1+.1,darkwood);
}
buildConnection(rooms[0],rooms[1],DOOR_GAME);
buildConnection(rooms[1],rooms[2],DOOR_GAME);
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
// A real door at every mansion and graveyard threshold (except the boss doorway, which
// keeps its permanent barred gate, and the mansion's locked exterior door, its own separate
// lock mechanic) instead of an empty gap - closed, it fills the doorway flush; game.js's
// doorOpen[] (contact-triggered, signed by which side the robot bumped it from) swings it
// open with a bang either way, and shuts it again once the robot backs off. This array's
// order must match game.js's allDoors exactly: mansion doorways first, then graveyard.
const doorPanelMat=mat('#2c2118',{roughness:.85}),doorBandMat=mat('#4a4136',{metalness:.4,roughness:.6});
function buildDoorPanel(dx,dz0,dz1){
  const len=dz1-dz0;
  const hinge=new THREE.Group();hinge.position.set(dx,1.5,dz0);hinge.userData.angle=0;scene.add(hinge);
  box(hinge,0,0,len/2,.22,3,len,doorPanelMat);
  box(hinge,.13,.4,len/2,.05,.1,len-.14,doorBandMat);box(hinge,.13,-.4,len/2,.05,.1,len-.14,doorBandMat);
  ball(hinge,.15,0,len-.22,.06,doorBandMat);
  return hinge;
}
const allDoorHinges=[
  ...mansionDoors.map(d=>buildDoorPanel(px(d.x),px(d.range[0]),px(d.range[1]))),
  ...graveyardDoors.filter(d=>!d.isBoss).map(d=>buildDoorPanel(px(d.x),px(d.range[0]),px(d.range[1]))),
];
// Gravestones scattered through the graveyard rooms - simple obstacle props, same pattern
// as the mansion furniture below.
const graveStoneMat=mat('#8a93a0',{roughness:.85});
graveyardObstacles.forEach(r=>{const x=px(r.x+r.w/2),z=px(r.y+r.h/2),g=new THREE.Group();scene.add(g);box(g,x,.32,z,.4,.62,.12,graveStoneMat);ball(g,x,.62,z,.2,graveStoneMat,[1,.55,.6])});
// The boss room's entrance stays barred until all 4 graveyard ghosts are captured -
// bossUnlocked is a live ES-module binding, re-read every render() just like doorUnlocked.
// ---- The street beyond the boss room: the way out. Cobbles instead of dirt, a kerb, lamp
// posts, and building faces along the back, so stepping through reads as leaving the manor.
if(streetRoom){
  const cobble=mat('#3d4149',{roughness:.95}),kerb=mat('#5b6068',{roughness:.9}),
    facade=mat('#2b2f38',{roughness:.9}),windowLit=mat('#ffdca8',{emissive:'#ffc46a',emissiveIntensity:.9});
  const sx0=px(streetRoom.x),sx1=px(streetRoom.x+streetRoom.w),sz0=px(streetRoom.y),sz1=px(streetRoom.y+streetRoom.h);
  const scx=(sx0+sx1)/2,scz=(sz0+sz1)/2,sw=sx1-sx0,sd=sz1-sz0;
  const st=new THREE.Group();scene.add(st);
  box(st,scx,-.2,scz,sw+.3,.4,sd+.3,cobble);
  // Kerbs running along the road, and a painted centre line.
  box(st,scx,.06,sz0+.9,sw,.12,.22,kerb);box(st,scx,.06,sz1-.9,sw,.12,.22,kerb);
  for(let cx=sx0+.8;cx<sx1-.6;cx+=1.5)box(st,cx,.01,scz,.7,.02,.09,mat('#8d8f7e',{roughness:1}));
  // Building fronts along the far side, a few windows lit from within.
  for(let bx=sx0+.4;bx<sx1-1.2;bx+=2.4){
    const h=3.4+((bx*7)%10)/10*1.6;
    box(st,bx+.9,h/2,sz0-.9,1.9,h,1.3,facade);
    for(let wy=1;wy<h-.7;wy+=1.25)for(const wx of [-.45,.45])
      if((Math.round(bx*3+wy*5)%3)!==0)box(st,bx+.9+wx,wy,sz0-.26,.42,.5,.06,windowLit);
  }
  // Street lamps: the first warm, non-flashlight light the robot has seen all game.
  for(const lx of [sx0+2.2,scx,sx1-2.2]){
    const post=new THREE.Group();post.position.set(lx,0,sz1-1.25);st.add(post);
    box(post,0,1.55,0,.14,3.1,.14,kerb);
    box(post,0,3.16,.28,.16,.14,.62,kerb);
    const bulb=ball(post,0,3.02,.55,.19,mat('#fff2cf',{emissive:'#ffd98a',emissiveIntensity:2.2}));
    post.add(new THREE.PointLight('#ffd08a',3.4,7.5));
  }
}
// The four sigils on the boss room floor. Dark rings until the flashlight charges them; the
// inner disc brightens with charge and pulses once a sigil is fully lit.
const glyphRingMat=mat('#2a3340',{roughness:.8});
const glyphProps=puzzleGlyphs.map(p=>{
  const g=new THREE.Group();g.position.set(px(p.x),0,px(p.y));scene.add(g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.44,.07,8,28),glyphRingMat);
  ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);
  const coreMat=new THREE.MeshBasicMaterial({color:'#9fe4ff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const core=new THREE.Mesh(new THREE.CircleGeometry(.38,24),coreMat);
  core.rotation.x=-Math.PI/2;core.position.y=.035;g.add(core);
  for(let k=0;k<4;k++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.06,.02,.30),glyphRingMat);spoke.position.set(Math.cos(k*Math.PI/2)*.6,.045,Math.sin(k*Math.PI/2)*.6);spoke.rotation.y=-k*Math.PI/2;g.add(spoke)}
  const light=new THREE.PointLight('#9fe4ff',0,3.2);light.position.y=.5;g.add(light);
  return {group:g,coreMat,light};
});
const bossBar=mat('#2e2a24',{roughness:.85}),bossGlow=mat('#8a2f2f',{emissive:'#c23f3f',emissiveIntensity:1.1});
let bossGateProp=null;
// The exit door out to the street, barred until the sigils are all lit.
let streetGateProp=null;
if(streetGate){
  const sgx=px(streetGate.x),sgz=px(streetGate.y);
  streetGateProp=new THREE.Group();scene.add(streetGateProp);
  box(streetGateProp,sgx,1.5,sgz,.26,3,1.85,bossBar);
  for(let i=0;i<4;i++)box(streetGateProp,sgx,.45+i*.85,sgz,.3,.1,2,mat('#4a4136',{metalness:.4,roughness:.6}));
  ball(streetGateProp,sgx,1.5,sgz,.11,mat('#9fe4ff',{emissive:'#5fc8ff',emissiveIntensity:1.3}));
  streetGateProp.add(new THREE.PointLight('#5fc8ff',1.5,2.6));
}
if(bossGate){
  const bgx=px(bossGate.x),bgz=px(bossGate.y);
  bossGateProp=new THREE.Group();scene.add(bossGateProp);
  box(bossGateProp,bgx,1.6,bgz,.3,3.2,1.9,bossBar);
  for(let i=0;i<3;i++)box(bossGateProp,bgx,.5+i*1.1,bgz,.32,.14,2.1,bossBar);
  ball(bossGateProp,bgx,1.6,bgz,.13,bossGlow);
  bossGateProp.add(new THREE.PointLight('#c23f3f',1.6,2.4));
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
// ---- Ghost characters ------------------------------------------------------------------
// Three silhouettes, each with a real head/torso/arms/tail rig so they can react (crane,
// lunge, panic) rather than just bob. The archetype is index%3, which lines up exactly with
// the flee/melee/ice type cycling game.js uses across the 3 mansion + 4 graveyard ghosts:
// 0 Peeker (flee, tall and craning), 1 Grinner (melee, wide and toothy), 2 Hollow (ice, an
// open hood). The boss runs the same rig at a larger scale with horns, so it animates with
// the same vocabulary instead of needing a parallel implementation.
const ghostColors=['#a6f5cd','#ff6a5a','#ffcf92','#c9a6f5','#8fffb0','#7fd4ff','#e8dcc0'];
const ghostEyeColors=['#e8ffd1','#ffd4a3','#79e0ff','#e0b8ff','#3fffa0','#2fa8ff','#ffe0b0'];
const ARCH_NAMES=['Peeker','Grinner','Hollow'];
function ghostMesh(parent,geometry,material){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);return mesh}
function oval(parent,x,y,z,rx,ry,material){const mesh=ghostMesh(parent,new THREE.CircleGeometry(1,24),material);mesh.position.set(x,y,z);mesh.scale.set(rx,ry,1);return mesh}
function wisp(parent,points,radius,material){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const geometry=new THREE.TubeGeometry(curve,18,radius,6,false);
  // Taper the tube to a thread instead of a blunt cone.
  const positions=geometry.attributes.position;
  for(let j=0;j<=18;j++){
    const center=curve.getPointAt(j/18),taper=1-.96*Math.pow(j/18,1.25);
    for(let k=0;k<=6;k++){
      const n=j*7+k;
      positions.setXYZ(n,center.x+(positions.getX(n)-center.x)*taper,
        center.y+(positions.getY(n)-center.y)*taper,center.z+(positions.getZ(n)-center.z)*taper);
    }
  }
  geometry.computeVertexNormals();return ghostMesh(parent,geometry,material);
}
function makeGhost(arch,color,eyeColor,opts={}){
  const root=new THREE.Group();root.name=opts.name||ARCH_NAMES[arch];root.visible=false;scene.add(root);
  const skin=mat(color,{transparent:true,opacity:.72,depthWrite:false,emissive:color,emissiveIntensity:.2,roughness:.4});
  const faceMat=new THREE.MeshBasicMaterial({color:'#061017',transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide});
  const eyesMat=new THREE.MeshBasicMaterial({color:eyeColor,transparent:true,opacity:1,depthWrite:false});
  const rig=new THREE.Group();root.add(rig);
  const torso=new THREE.Group();rig.add(torso);
  const head=new THREE.Group();head.position.y=.26;rig.add(head);
  const arms=[],eyes=[],sockets=[];
  const belly=ghostMesh(torso,new THREE.SphereGeometry(1,20,14),skin);
  belly.scale.set(...[[.31,.53,.27],[.56,.34,.32],[.40,.49,.28]][arch]);
  belly.position.y=arch===1?.05:-.1;
  let mouth,teeth;
  if(arch===2){
    // An open hood, not a solid ball with a face painted on it.
    const rim=ghostMesh(head,new THREE.TorusGeometry(.34,.115,8,28),skin);
    rim.scale.set(1,1.32,.8);rim.position.set(0,.06,.18);
    const hood=ghostMesh(head,new THREE.SphereGeometry(.43,20,14),skin);
    hood.position.z=-.13;hood.scale.set(1,1.25,.67);
    oval(head,0,.055,.285,.285,.39,faceMat);
    for(const sign of [-1,1])eyes.push(oval(head,sign*.115,.07,.298,.039,.055,eyesMat));
    mouth=oval(head,0,-.16,.30,.018,.045,faceMat);
  }else{
    const skull=ghostMesh(head,new THREE.SphereGeometry(1,20,14),skin);
    skull.scale.set(...(arch===0?[.35,.48,.30]:[.48,.31,.31]));
    skull.position.y=arch===0?.07:.03;
    for(const sign of [-1,1]){
      const socket=oval(head,sign*(arch===0?.145:.20),.12,.29,arch===0?.12:.13,arch===0?.18:.095,faceMat);
      socket.rotation.z=arch===0?sign*.12:-sign*.27;sockets.push(socket);
      eyes.push(oval(head,socket.position.x,.12,.302,arch===0?.033:.043,arch===0?.057:.032,eyesMat));
    }
    mouth=oval(head,0,arch===0?-.19:-.12,.31,arch===0?.062:.31,arch===0?.10:.10,faceMat);
    mouth.rotation.z=arch===1?-.14:0;
    if(arch===1){
      teeth=new THREE.Group();mouth.add(teeth);
      for(let j=0;j<5;j++){
        const tooth=ghostMesh(teeth,new THREE.ConeGeometry(.11,.45,3),eyesMat);
        tooth.position.set((j-2)*.31,.40,.025);tooth.rotation.z=Math.PI;
      }
    }
  }
  if(opts.horns){
    const hornMat=mat('#3a1418',{roughness:.7});
    for(const sign of [-1,1]){const horn=ghostMesh(head,new THREE.BoxGeometry(.10,.42,.10),hornMat);horn.position.set(sign*.30,.30,-.02);horn.rotation.z=-sign*.42}
  }
  for(const sign of [-1,1]){
    const arm=new THREE.Group();arm.position.set(sign*(arch===1?.49:.30),arch===1?.16:.02,0);rig.add(arm);
    const length=arch===0?(sign<0?.66:.42):arch===1?.51:.39;
    wisp(arm,[[0,0,0],[sign*.09,-length*.4,.04],[sign*.17,-length,.09]],arch===1?.105:.073,skin);
    if(arch!==2){
      for(let j=0;j<3;j++)wisp(arm,[[sign*.17+(j-1)*.055,-length,.09],
        [sign*.20+(j-1)*.08,-length-.12,.13],
        [sign*.14+(j-1)*.08,-length-(arch===1?.28:.17),.18]],.026,skin);
    }
    arms.push(arm);
  }
  const tail=new THREE.Group();tail.position.y=-.32;rig.add(tail);
  const tailShape=arch===0?[[0,0,0],[.05,-.45,0],[.28,-.70,.05],[.39,-.46,.1],[.25,-.42,.1]]:
    arch===1?[[0,0,0],[-.08,-.35,0],[-.27,-.51,-.08],[-.38,-.40,-.08]]:
    [[0,0,0],[0,-.39,0],[.17,-.66,-.04],[.32,-.78,0]];
  wisp(tail,tailShape,arch===1?.24:.23,skin);
  if(arch===2)for(const sign of [-1,1])wisp(tail,[[sign*.25,.05,0],[sign*.32,-.28,.02],[sign*.30,-.58,.1]],.09,skin);
  // A short, reusable spiral shows the final capture without changing ghost state.
  const spiral=new THREE.Group();root.add(spiral);spiral.visible=false;
  for(let j=0;j<9;j++){
    const mote=ghostMesh(spiral,new THREE.OctahedronGeometry(.055,0),eyesMat);
    mote.userData.phase=j/9*Math.PI*2;
  }
  const light=new THREE.PointLight(color,.1,opts.boss?4.5:2);root.add(light);
  return {root,rig,head,torso,arms,eyes,sockets,mouth,teeth,tail,skin,faceMat,eyesMat,light,spiral,arch,
    boss:!!opts.boss,scale:opts.scale||1,baseY:opts.baseY||1.30,
    state:null,wasCaught:false,captureAt:-1,visibility:0,lastTime:0,snapAngle:0};
}
const ghostRigs=ghostColors.map((color,i)=>makeGhost(i%3,color,ghostEyeColors[i]));
// The boss is a Grinner grown huge and horned - same rig, same reactions, far more of it.
const bossRig=makeGhost(1,'#c23f3f','#ffcf3f',{name:'Warden',boss:true,scale:2.1,baseY:1.9,horns:true});
const captureNozzle=new THREE.Vector3();
// A telegraph for the melee/boss claw swipe: a warning wedge on the floor during the
// wind-up, then claw arcs on the commit frame.
const slashIndicator=new THREE.Group();scene.add(slashIndicator);slashIndicator.visible=false;
// Additive, not normal-blended: this game's floors are far darker than the room this
// telegraph was first drawn for, and a low-opacity red over near-black just reads as a
// smudge. Additive makes it glow as an actual warning.
const slashWarningMaterial=new THREE.MeshBasicMaterial({color:'#ff634f',transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
const slashWarning=new THREE.Mesh(new THREE.RingGeometry(.32,125/60,36,1,-1,2),slashWarningMaterial);
slashWarning.rotation.x=-Math.PI/2;slashWarning.position.y=.045;slashIndicator.add(slashWarning);
const clawMaterial=new THREE.MeshBasicMaterial({color:'#ffb591',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
const clawTrails=[];for(let i=0;i<3;i++){
  const claw=new THREE.Mesh(new THREE.RingGeometry(1.25+i*.16,1.30+i*.16,30,1,-1,2),clawMaterial);
  claw.rotation.x=-Math.PI/2;claw.position.y=.7+i*.14;slashIndicator.add(claw);clawTrails.push(claw);
}
const iceMat=mat('#bdeeff',{transparent:true,opacity:.9,emissive:'#7fd4ff',emissiveIntensity:1.8,roughness:.15});const iceBoltMesh=new THREE.Mesh(new THREE.OctahedronGeometry(.14,0),iceMat);iceBoltMesh.add(new THREE.PointLight('#8fdcff',2.5,2));iceBoltMesh.visible=false;scene.add(iceBoltMesh);
// A reusable wind funnel replacing the old single tether line: broad translucent flow,
// luminous helical ribbons, moving wind streaks, and floor dust converging on the nozzle.
// All buffers are allocated once and rewritten in place.
const suction=new THREE.Group();suction.visible=false;scene.add(suction);
const flowEnd=new THREE.Vector3(),flowAxis=new THREE.Vector3(),flowSide=new THREE.Vector3(),flowUp=new THREE.Vector3();
const upAxis=new THREE.Vector3(0,1,0),flowPoint=new THREE.Vector3(),flowColor=new THREE.Color();
function ribbon(width,opacity,phase,turns){
  const segments=40,positions=new Float32Array((segments+1)*6),indices=[];
  for(let j=0;j<segments;j++){const n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const material=new THREE.MeshBasicMaterial({color:'#b5eee2',transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;suction.add(mesh);
  return {mesh,positions,width,opacity,phase,turns,segments};
}
const windRibbons=[ribbon(.16,.07,0,1.4),ribbon(.14,.06,Math.PI,1.4),
  ribbon(.025,.58,0,2.4),ribbon(.019,.42,2.1,2.4),ribbon(.023,.50,4.2,2.4)];
const streakGeometry=new THREE.BufferGeometry(),streakPositions=new Float32Array(38*6);
streakGeometry.setAttribute('position',new THREE.BufferAttribute(streakPositions,3));streakGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
const streakMaterial=new THREE.LineBasicMaterial({color:'#d8fff3',transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending});
const streaks=new THREE.LineSegments(streakGeometry,streakMaterial);streaks.frustumCulled=false;suction.add(streaks);
const vacuumDustGeometry=new THREE.BufferGeometry(),vacuumDustPositions=new Float32Array(70*3);
vacuumDustGeometry.setAttribute('position',new THREE.BufferAttribute(vacuumDustPositions,3));vacuumDustGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
const vacuumDustMaterial=new THREE.PointsMaterial({color:'#d8c6a0',size:.065,transparent:true,opacity:.65,depthWrite:false});
const vacuumDust=new THREE.Points(vacuumDustGeometry,vacuumDustMaterial);vacuumDust.frustumCulled=false;suction.add(vacuumDust);
const fract=value=>value-Math.floor(value);
let windStrength=0,windLastTime=0;
function flowSample(t,angle,radius,out){
  out.copy(captureNozzle).lerp(flowEnd,t);
  out.addScaledVector(flowSide,Math.cos(angle)*radius);
  out.addScaledVector(flowUp,Math.sin(angle)*radius);
  // A shallow bowed centerline gives the stream a feeling of tension.
  out.y+=Math.sin(t*Math.PI)*.075;
  return out;
}
function updateSuction(time,vac,ghost,player){
  const dt=time<windLastTime?0:Math.min(time-windLastTime,.05);
  if(time<windLastTime)windStrength=0;
  windLastTime=time;windStrength+=((vac?1:0)-windStrength)*(1-Math.exp(-dt*14));
  suction.visible=windStrength>.015;if(!suction.visible)return;
  const linked=!!ghost,tension=linked?(ghost.tension??.7):.2;
  if(linked)flowEnd.set(px(ghost.x),1.01,px(ghost.y));
  else flowEnd.set(captureNozzle.x+Math.cos(player.a)*2.7,.20,captureNozzle.z+Math.sin(player.a)*2.7);
  flowAxis.subVectors(flowEnd,captureNozzle).normalize();
  flowSide.crossVectors(flowAxis,upAxis);if(flowSide.lengthSq()<.001)flowSide.set(1,0,0);else flowSide.normalize();
  flowUp.crossVectors(flowSide,flowAxis).normalize();
  flowColor.set(linked?ghost.color:'#a9d9d0');
  const rate=linked?1.25+tension*.45:.85;
  for(const r of windRibbons){
    r.mesh.material.color.copy(flowColor);r.mesh.material.opacity=r.opacity*windStrength*(linked?1:.5);
    for(let j=0;j<=r.segments;j++){
      const t=j/r.segments,angle=r.phase+t*Math.PI*2*r.turns+time*8*rate;
      const radius=(.025+.26*t)*(linked?1:1.4);
      flowSample(t,angle,radius,flowPoint);
      const width=r.width*(.25+.75*Math.sin(Math.PI*t))*(.6+.4*t);
      const ox=flowSide.x*Math.cos(angle)*width+flowUp.x*Math.sin(angle)*width;
      const oy=flowSide.y*Math.cos(angle)*width+flowUp.y*Math.sin(angle)*width;
      const oz=flowSide.z*Math.cos(angle)*width+flowUp.z*Math.sin(angle)*width;
      const n=j*6;r.positions[n]=flowPoint.x-ox;r.positions[n+1]=flowPoint.y-oy;r.positions[n+2]=flowPoint.z-oz;
      r.positions[n+3]=flowPoint.x+ox;r.positions[n+4]=flowPoint.y+oy;r.positions[n+5]=flowPoint.z+oz;
    }
    r.mesh.geometry.attributes.position.needsUpdate=true;
  }
  streakMaterial.color.copy(flowColor);streakMaterial.opacity=windStrength*(linked?.8:.38);
  for(let j=0;j<38;j++){
    const t=1-fract(time*rate*.85+j*.618033),angle=j*2.4+time*4+t*10;
    for(let end=0;end<2;end++){
      const s=Math.min(1,t+end*.045);
      flowSample(s,angle+end*.22,.035+s*(.13+(j%4)*.055),flowPoint);
      const n=j*6+end*3;streakPositions[n]=flowPoint.x;streakPositions[n+1]=flowPoint.y;streakPositions[n+2]=flowPoint.z;
    }
  }
  streakGeometry.attributes.position.needsUpdate=true;
  vacuumDustMaterial.opacity=windStrength*.65;
  for(let j=0;j<70;j++){
    const t=1-fract(time*(.48+(j%5)*.07)*rate+j*.618033),angle=j*2.399+time*3.5;
    flowSample(t,angle,t*(.2+(j%7)*.10),flowPoint);
    // Dust lifts off the floor and converges into the nozzle, not away from it.
    flowPoint.y=captureNozzle.y*(1-t)+.045*t+Math.sin(t*Math.PI)*(.13+(j%3)*.07);
    const n=j*3;vacuumDustPositions[n]=flowPoint.x;vacuumDustPositions[n+1]=flowPoint.y;vacuumDustPositions[n+2]=flowPoint.z;
  }
  vacuumDustGeometry.attributes.position.needsUpdate=true;
}
// A small reusable preallocated point cloud - avoids a per-frame buffer reallocation (was a stutter source).
function makeParticleSystem(max,color,size,opacity){const geo=new THREE.BufferGeometry();const pos=new Float32Array(max*3);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setDrawRange(0,0);const points=new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity}));scene.add(points);return {geo,pos,points,max}}
const sparkSys=makeParticleSystem(170,'#c8fbe0',.07,.8);
const dustSys=makeParticleSystem(90,'#8a7a63',.1,.5);
function drawParticles(sys,list,heightFn){let n=0;for(let k=0;k<list.length&&n<sys.max;k++){const p=list[k];if(p.life<=0)continue;const o3=n*3;sys.pos[o3]=px(p.x);sys.pos[o3+1]=heightFn(p);sys.pos[o3+2]=px(p.y);n++}sys.geo.attributes.position.needsUpdate=true;sys.geo.setDrawRange(0,n)}
// A small dropped note - appears once the final ghost is captured.
const noteMat=mat('#e9dcb8',{roughness:.9});const noteProp=new THREE.Group();scene.add(noteProp);box(noteProp,0,0,0,.34,.02,.44,noteMat);box(noteProp,0,.011,0,.22,.002,.02,mat('#8a7350'));box(noteProp,0,.011,-.08,.16,.002,.015,mat('#8a7350'));noteProp.add(new THREE.PointLight('#fff3cf',1.4,1.6));noteProp.visible=false;
let previous=new THREE.Vector3(),first=true;
// Damped spring for the run lean: kicking the velocity on the frame run engages gives a
// sharp rock backwards that overshoots and settles, rather than a flat tilt.
let runLean=0,runLeanVel=0,wasRunning=false;
return {render({player,ghosts:states,particles,time,dt=0,lightOn,lightCharge,maxLightCharge=100,vac,running=false,lockedGhost,scare,battery,tableUsed,iceBolt,note,key,coinPickups=[],doorOpen=[],glyphCharge=[],puzzleActive=false}){
sealDoor.visible=!doorUnlocked;
if(bossGateProp)bossGateProp.visible=!bossUnlocked;
if(streetGateProp)streetGateProp.visible=!streetUnlocked;
// Sigils: dim while charging, then a steady pulse once one is fully lit.
glyphProps.forEach((gp,i)=>{
const c=glyphCharge[i]||0,lit=c>=1;
gp.group.visible=puzzleActive;
if(!puzzleActive)return;
const pulse=lit?.86+Math.sin(time*4+i)*.14:c*.65;
gp.coreMat.opacity=pulse;
gp.light.intensity=lit?2.4+Math.sin(time*4+i)*.6:c*1.2;
gp.group.rotation.y=time*(lit?.7:.25)+i;
});
// doorOpen[i] is a signed, continuous push in [-1,1] - which side the robot met the door on
// and how far it has shouldered through. Track the push quickly so the panel stays with the
// robot, then let it fall shut slowly behind it.
allDoorHinges.forEach((hinge,i)=>{
const s=doorOpen[i]||0,target=s*2.05,held=hinge.userData.angle;
const rate=Math.abs(target)>=Math.abs(held)?20:6;
hinge.userData.angle+=(target-held)*Math.min(1,dt*rate);hinge.rotation.y=hinge.userData.angle;});
keyProp.visible=!!key;if(key){keyProp.position.set(px(key.x),.35+Math.sin(time*3)*.08,px(key.y));keyProp.rotation.y=time*1.6;}
coinPickups.forEach((c,i)=>{const m=coinProps[i];if(!m)return;m.visible=!c.taken;if(!c.taken){m.position.set(px(c.x),.3+Math.sin(time*4+i)*.05,px(c.y));m.rotation.y=time*2.2;const silver=c.kind==='silver';m.material.color.copy(silver?silverColor:goldColor);m.material.emissive.copy(silver?silverEmissive:goldEmissive);}});const x=px(player.x),z=px(player.y);robot.position.set(x,0,z);body.rotation.y=Math.PI/2-player.a;if(!first){roller.rotation.x+=(z-previous.z)/.32;roller.rotation.z-=(x-previous.x)/.32}previous.set(x,0,z);first=false;
robot.visible=player.hurt<=0||Math.floor(time*18)%2===0;marker.visible=!tableUsed;pickup.visible=!!battery;if(battery){pickup.position.set(px(battery.x),.65+Math.sin(time*4)*.1,px(battery.y));pickup.rotation.y=time*1.8;}
const lowBattery=lightOn&&lightCharge<maxLightCharge*.2;const flicker=lowBattery?.75+Math.random()*.35:1;
beam.intensity=lightOn?150*flicker:0;beam.distance=lightOn?7.6:6.4;lamp.material.emissiveIntensity=lightOn?6*flicker:.8;
metal.emissive.set(player.slow>0?'#3aa0ff':'#000000');
captureNozzle.set(.32,.85,.64);body.localToWorld(captureNozzle);
const captureTarget=vac&&lockedGhost&&!lockedGhost.caught&&lockedGhost.stun>0&&
  !['warning','hidden'].includes(lockedGhost.state)&&
  Math.hypot(lockedGhost.x-player.x,lockedGhost.y-player.y)<380?lockedGhost:null;
// Rock back when run engages: an impulse into the spring on the rising edge, settling into
// a slight held lean while the throttle is down. Combines with the capture lean-back.
if(running&&!wasRunning)runLeanVel-=3.4;
wasRunning=running;
{const stiff=42,damp=8.5,rest=running?-.09:0,step=Math.min(dt,.05);
runLeanVel+=((rest-runLean)*stiff-runLeanVel*damp)*step;runLean+=runLeanVel*step;}
// Lean back against the pull while the roller ball keeps turning naturally.
body.rotation.x=(captureTarget?-.13*(captureTarget.tension??0):0)+runLean;
// Ghost rigs: eased visibility, per-archetype idle behaviour, panic faces while being
// vacuumed, and a short spiral dissolve on capture. The boss runs the same pass at 2.1x.
states.forEach((g,i)=>{
  const v=g.type==='boss'?bossRig:ghostRigs[i];if(!v)return;
  const o=v.root;
  // reset() creates fresh gameplay objects; don't carry a capture into a replay.
  if(v.state!==g||time<v.lastTime){v.state=g;v.wasCaught=g.caught;v.captureAt=-1;v.visibility=0;v.snapAngle=0}
  const rdt=Math.max(0,Math.min(time-v.lastTime,.05));v.lastTime=time;
  if(g.caught&&!v.wasCaught){v.captureAt=time;v.captureFrom=o.position.clone()}
  v.wasCaught=g.caught;
  const capturing=g.caught&&v.captureAt>=0&&time-v.captureAt<.65;
  o.visible=(!g.caught&&g.state!=='hidden')||capturing;
  if(!o.visible)return;
  o.scale.setScalar(v.scale);o.rotation.z=0;v.rig.visible=!g.caught;v.spiral.visible=capturing;
  if(capturing){
    const t=(time-v.captureAt)/.65;
    o.position.lerpVectors(v.captureFrom,captureNozzle,1-Math.pow(1-t,2));
    o.rotation.set(0,0,0);v.rig.visible=t<.48;v.rig.scale.setScalar(Math.max(.01,1-t*2.05));
    v.rig.rotation.z=t*9;v.skin.opacity=.7*(1-t);v.faceMat.opacity=1-t;
    v.eyesMat.opacity=1-t;v.light.intensity=(1-t)*.6;
    v.spiral.children.forEach((m,j)=>{
      const a=m.userData.phase+t*18,r=(.37+j*.013)*(1-t);
      m.position.set(Math.cos(a)*r,Math.sin(a)*r,(j-4)*.045*(1-t));
      m.scale.setScalar(1-t*.8);
    });
    return;
  }
  const arch=v.arch,gMax=g.maxHpBoss||100;
  const distance=Math.hypot(g.x-player.x,g.y-player.y);
  const inLight=lightOn&&distance<350&&Math.cos(Math.atan2(g.y-player.y,g.x-player.x)-player.a)>Math.cos(.53);
  const awake=g.state!=='warning'&&g.state!=='hidden';
  const stunned=g.stun>0,beingSucked=captureTarget===g,lunging=g.state==='lunge'&&!stunned;
  const enraged=(g.stunImmuneCd||0)>0,reveal=awake?(g.reveal??1):0;
  // Dark ghosts stay readable but stop behaving like permanent lamps. The boss never hides -
  // it keeps a high floor so you can always see what's charging you.
  let visibility=(beingSucked||stunned||inLight)?.95:lunging?.70:awake?.27:.025;
  if(v.boss)visibility=Math.max(visibility,enraged?1:.78);
  v.visibility+=(visibility-v.visibility)*(1-Math.exp(-rdt*12));
  const vis=v.visibility;
  v.skin.opacity=.018+vis*.77;v.skin.emissiveIntensity=(enraged?.45:.025)+vis*.29;
  v.faceMat.opacity=THREE.MathUtils.clamp(vis*1.8,0,1);
  const eyeGlimpse=Math.pow(Math.max(0,Math.sin(time*1.2+g.seed)),18)*.28;
  v.eyesMat.opacity=awake?Math.min(1,vis*1.6+.08):eyeGlimpse;
  v.light.intensity=vis*(v.boss?(enraged?2.8:1.5):beingSucked?.7:.22);
  const bob=stunned?0:Math.sin(time*(arch===2?1.3:2.7)+g.seed)*(arch===2?.035:.10);
  o.position.set(px(g.x),v.baseY+bob,px(g.y));
  o.rotation.y=Math.atan2(x-o.position.x,z-o.position.z);
  v.rig.rotation.set(0,0,0);v.rig.scale.set(1,1,1);v.head.rotation.set(0,0,0);
  v.head.position.set(0,.26,0);v.head.scale.set(1,1,1);v.torso.rotation.set(0,0,0);
  v.tail.rotation.set(0,0,0);v.tail.scale.set(1,1,1);
  const panic=beingSucked?1:stunned?.65:0;
  if(arch===0){
    // The Peeker cranes its head independently of its drooping body.
    v.head.rotation.z=stunned?-.16:Math.sin(time*1.6+g.seed)*.28;
    v.head.position.x=stunned?0:Math.sin(time*1.6+g.seed)*.075;
    v.rig.scale.y=1+(stunned?.14:Math.max(0,Math.sin(time*2))*.06*reveal);
  }else if(arch===1){
    v.torso.rotation.x=lunging?-.20:.17;
    v.head.position.z=lunging?.13:.055;
    v.head.rotation.z=stunned?.12:-.08;
    v.rig.scale.set(lunging?1.19:1,lunging?1.12:1,1);
  }else{
    // Deliberate stepped head turns, with a soft interpolation inside each snap.
    const snap=Math.sin(Math.floor(time*1.4)+g.seed)*.28;
    v.snapAngle+=(snap-v.snapAngle)*(1-Math.exp(-rdt*23));
    v.head.rotation.y=stunned?0:v.snapAngle;
    v.head.rotation.z=stunned?-.10:.035;
  }
  v.eyes.forEach(eye=>{
    const width=arch===2?.039:arch===0?.033:.043,height=arch===2?.055:arch===0?.057:.032;
    eye.scale.set(width*(1+panic*.50),height*(1+panic*.95),1);
    eye.position.y=.12-(arch===2?.05:0);
  });
  v.sockets.forEach(socket=>{socket.scale.y=(arch===0?.18:.095)*(1+panic*.4)});
  v.mouth.scale.set(arch===0?.062*(1+panic*.6):arch===1?(panic?.16:.31):.018,
    arch===0?.10*(1+panic*.85):arch===1?(panic?.22:lunging?.20:.10):.045,1);
  if(v.teeth)v.teeth.visible=panic<.5;
  v.arms.forEach((arm,j)=>{
    const side=j===0?-1:1;
    arm.rotation.set(0,0,0);
    arm.rotation.z=side*(beingSucked?1.35+Math.sin(time*5+j*2)*.16:stunned?1.12:lunging?1.65:.20+Math.sin(time*2+g.seed+j)*.12);
    arm.rotation.x=beingSucked?-.40+Math.cos(time*4+j)*.10:0;
  });
  if(beingSucked){
    const strain=1-THREE.MathUtils.clamp(g.hp/gMax,0,1);
    v.rig.scale.set(.94-strain*.16,.95-strain*.10,1.08+strain*.35);
    v.head.rotation.z+=Math.sin(time*4+g.seed)*.025;
    // Local +Z faces the robot. Swing the lower tail toward the actual nozzle; the head
    // stays behind it, rather than stretching the face into a tube.
    v.tail.rotation.x=-1.12;
    v.tail.rotation.z=Math.sin(time*5)*.04;
    v.tail.scale.set(.85,1.4+strain*.65+Math.sin(time*5)*.04,1);
  }else if(!stunned){
    v.tail.rotation.z=Math.sin(time*(arch===2?1.4:3.2)+g.seed)*.12;
    v.tail.rotation.x=Math.cos(time*2+g.seed)*.08;
  }
});
iceBoltMesh.visible=!!iceBolt;if(iceBolt){iceBoltMesh.position.set(px(iceBolt.x),1.1,px(iceBolt.y));iceBoltMesh.rotation.y=time*6;iceBoltMesh.rotation.x=time*4;}
// Claw telegraph for whichever ghost is mid-swipe (melee ghosts or the boss, which has a
// longer reach and a shorter wind-up - see redSlash() in game.js).
const slasher=states.find(s=>!s.caught&&(s.slashTime||0)>0&&s.state!=='warning'&&s.state!=='hidden');
slashIndicator.visible=!!slasher;
if(slasher){
  const isBoss=slasher.type==='boss',reach=isBoss?190:125,windup=isBoss?.55:.73,commit=windup*.4;
  slashIndicator.position.set(px(slasher.x),0,px(slasher.y));
  slashIndicator.rotation.y=-slasher.slashAngle;
  slashIndicator.scale.setScalar(reach/125);
  const st=slasher.slashTime,winding=st>commit;
  const progress=winding?(windup-st)/(windup-commit):1-st/commit;
  slashWarningMaterial.opacity=winding?.10+progress*.26:.06;
  clawMaterial.opacity=winding?0:.85*(1-progress);
  clawTrails.forEach(claw=>{claw.visible=!winding;claw.rotation.z=progress*1.5-.75});
  const rig=isBoss?bossRig:ghostRigs[states.indexOf(slasher)];
  if(rig){const arm=rig.arms[1];arm.rotation.z=winding?2.3:2.3-progress*2.8;arm.rotation.x=winding?-.65:.2}
}
updateSuction(time,vac,captureTarget,player);
halo.intensity=captureTarget?4.5+(captureTarget.tension??0)*1.2:3.5;
drawParticles(sparkSys,particles.filter(p=>p.kind!=='dust'),p=>.8+p.life*.5);
drawParticles(dustSys,particles.filter(p=>p.kind==='dust'),p=>.05+p.life*.2);
noteProp.visible=!!note;if(note){noteProp.position.set(px(note.x),.05+Math.sin(time*2)*.015,px(note.y));noteProp.rotation.y=Math.sin(time*.7)*.2;}
const curRoom=roomAt(player.x,player.y),rx0=px(curRoom.x),rx1=px(curRoom.x+curRoom.w),rz0=px(curRoom.y),rz1=px(curRoom.y+curRoom.h),margin=1.3;
const focusX=THREE.MathUtils.clamp(x,rx0+margin,rx1-margin),focusZ=THREE.MathUtils.clamp(z,rz0+margin,rz1-margin);camera.position.set(focusX,9.6,focusZ+9.8);camera.lookAt(focusX,.6,focusZ-.8);if(scare>0)camera.position.x+=Math.sin(time*65)*scare*.14;renderer.render(scene,camera);
}};
}
