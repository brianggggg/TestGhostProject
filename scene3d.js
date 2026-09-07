import * as THREE from './three.module.js';
import {WORLD,ROOM_GROWTH,healthTable} from './room.js';
export function createHaunt(canvas){
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(720,720,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color('#080c15');scene.fog=new THREE.FogExp2('#080c15',.026);
const camera=new THREE.PerspectiveCamera(43,1,.1,70);const scale=60,world=WORLD;const px=x=>(x-world/2)/scale;
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
const wood=new THREE.TextureLoader().load('wood.png');wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(2,2);wood.anisotropy=4;
const timber=mat('#82745b',{map:wood}),darkwood=mat('#4b3a30',{map:wood}),metal=mat('#8caaa6',{metalness:.65,roughness:.37}),black=mat('#101b26'),brass=mat('#c39250',{metalness:.55});
function box(parent,x,y,z,w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function ball(parent,x,y,z,r,m,s=[1,1,1]){const o=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),m);o.position.set(x,y,z);o.scale.set(...s);o.castShadow=true;parent.add(o);return o}
const room=new THREE.Group();room.scale.set(ROOM_GROWTH,1,ROOM_GROWTH);scene.add(room);const oldPx=x=>(x-576)/60;
box(room,0,-.2,1,17.5,.4,14.4,timber);
// A cutaway front keeps the room playable from the angled camera.
box(room,0,2,-6.4,17.5,4,.3,darkwood);box(room,-8.65,1.1,1,.25,2.2,14.5,darkwood);box(room,8.65,1.1,1,.25,2.2,14.5,darkwood);
for(let x=-8;x<=8;x+=2){box(room,x,2,-6.16,.13,4,.13,brass);box(room,x,.55,-6.1,1.75,.85,.1,mat('#293638'))}
box(room,0,.13,-6.13,17.2,.16,.2,brass);box(room,0,3.9,-6.15,17.3,.16,.22,brass);
const windowMat=mat('#7b9abd',{emissive:'#527dae',emissiveIntensity:.65});box(room,0,2.6,-6.17,2.4,2.1,.08,black);box(room,0,2.6,-6.08,2.1,1.9,.05,windowMat);box(room,0,2.6,-5.99,.09,1.9,.1,brass);box(room,0,2.6,-5.98,2.1,.09,.1,brass);
const rug=mat('#283e3b');box(room,-.05,.025,.38,6.15,.025,6.25,rug);for(const x of [-3,3])box(room,x,.044,.38,.06,.014,6.1,brass);for(const z of [-2.61,3.37])box(room,0,.044,z,6,.014,.06,brass);
const furniture=[{x:80,y:140,w:110,h:72},{x:526,y:138,w:105,h:85},{x:527,y:459,w:105,h:82}];furniture.forEach((r,i)=>{const x=oldPx((r.x+r.w/2)*1.6),z=oldPx((r.y+r.h/2)*1.6),w=r.w*1.6/scale,d=r.h*1.6/scale;box(room,x,.65,z,w,1.3,d,darkwood);box(room,x,1.36,z,w+.12,.16,d+.12,timber);for(let j=0;j<2;j++){box(room,x,.4+j*.57,z+d/2+.015,w-.18,.44,.07,timber);ball(room,x,.4+j*.57,z+d/2+.08,.055,brass)}if(i===0)for(let j=0;j<5;j++)box(room,x-.8+j*.32,1.7,z,.21,.57,.65,mat(['#576d65','#7a4947','#927745'][j%3]));});
box(room,oldPx(136*1.6),.03,oldPx(548*1.6),2.55,.06,2.1,darkwood);for(let i=0;i<5;i++)box(room,oldPx(136*1.6),.07,oldPx(515*1.6)+i*.43,2.4,.035,.035,brass);
scene.add(new THREE.HemisphereLight('#8babc5','#25202b',.32));const moon=new THREE.DirectionalLight('#9bbaf3',.78);moon.position.set(-3,10,-5);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);Object.assign(moon.shadow.camera,{left:-17,right:17,top:17,bottom:-17});moon.shadow.bias=-.001;scene.add(moon);
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
return {render({player,ghosts:states,particles,time,lightOn,vac,lockedGhost,scare,battery,tableUsed,iceBolt,note}){const x=px(player.x),z=px(player.y);robot.position.set(x,0,z);body.rotation.y=Math.PI/2-player.a;if(!first){roller.rotation.x+=(z-previous.z)/.32;roller.rotation.z-=(x-previous.x)/.32}previous.set(x,0,z);first=false;
robot.visible=player.hurt<=0||Math.floor(time*18)%2===0;marker.visible=!tableUsed;pickup.visible=!!battery;if(battery){pickup.position.set(px(battery.x),.65+Math.sin(time*4)*.1,px(battery.y));pickup.rotation.y=time*1.8;}
beam.intensity=lightOn?150:0;beam.distance=lightOn?7.6:6.4;lamp.material.emissiveIntensity=lightOn?6:.8;
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
ghostEyeMat[i].emissiveIntensity=eyeIntensity;o.scale.setScalar(size);
ghostTails[i].forEach((tail,ti)=>{const ph=g.seed+ti*1.3,tSpeed=hunting?7+revealed*3:2.5,tAmp=hunting?.16+revealed*.14:.06;tail.rotation.x=Math.sin(time*tSpeed+ph)*tAmp;tail.rotation.y=Math.cos(time*tSpeed*.8+ph)*tAmp*.8;});
});
iceBoltMesh.visible=!!iceBolt;if(iceBolt){iceBoltMesh.position.set(px(iceBolt.x),1.1,px(iceBolt.y));iceBoltMesh.rotation.y=time*6;iceBoltMesh.rotation.x=time*4;}
tether.visible=!!(vac&&lockedGhost&&!lockedGhost.caught&&lockedGhost.stun>0&&Math.hypot(lockedGhost.x-player.x,lockedGhost.y-player.y)<340);if(tether.visible){const a=new THREE.Vector3(.32,.85,.64);body.localToWorld(a);tether.geometry.setFromPoints([a,new THREE.Vector3(px(lockedGhost.x),1.15,px(lockedGhost.y))]);}
drawParticles(sparkSys,particles.filter(p=>p.kind!=='dust'),p=>.8+p.life*.5);
drawParticles(dustSys,particles.filter(p=>p.kind==='dust'),p=>.05+p.life*.2);
noteProp.visible=!!note;if(note){noteProp.position.set(px(note.x),.05+Math.sin(time*2)*.015,px(note.y));noteProp.rotation.y=Math.sin(time*.7)*.2;}
const focusX=THREE.MathUtils.clamp(x,-4.5*ROOM_GROWTH,4.5*ROOM_GROWTH),focusZ=THREE.MathUtils.clamp(z,-2*ROOM_GROWTH,4*ROOM_GROWTH);camera.position.set(focusX,9.6,focusZ+9.8);camera.lookAt(focusX,.6,focusZ-.6);if(scare>0)camera.position.x+=Math.sin(time*65)*scare*.14;renderer.render(scene,camera);
}};
}
