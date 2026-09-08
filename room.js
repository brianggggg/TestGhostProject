// The mansion is 3 fixed rooms in a row - west / center (spawn) / east - connected by
// doorway gaps in their shared walls. Walls are ordinary obstacle rects (same blocked()
// mechanism as furniture) with a gap left open where a doorway should be, so no new
// collision system is needed - just more rects.
export const ROOM_GROWTH=Math.SQRT2*1.15;
export const ROOM_SCALE=1.6*ROOM_GROWTH;
const WT=24; // wall thickness, base units (pre-ROOM_SCALE)
const DOOR=[135,245]; // doorway vertical opening range, shared by both connections

const roomsBase=[
  {x:0,y:0,w:480,h:380,name:'west'},
  {x:570,y:0,w:480,h:380,name:'center'}, // the shaft lands the robot here
  {x:1140,y:0,w:480,h:380,name:'east'},
];
// The yard sits outside the mansion, past a locked exterior door on room 2's east wall -
// where the wheeled shop lives. Reachable only after the mansion key unlocks the door.
const yardBase={x:1710,y:0,w:400,h:380,name:'yard'};
export const rooms=roomsBase.map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE,name:r.name}));
export const yard={x:yardBase.x*ROOM_SCALE,y:yardBase.y*ROOM_SCALE,w:yardBase.w*ROOM_SCALE,h:yardBase.h*ROOM_SCALE,name:yardBase.name};
export const shopSpot={x:(1710+140)*ROOM_SCALE,y:190*ROOM_SCALE};

const wallsBase=[
  // room 0 (west): north, south, west (no connection there)
  {x:-WT,y:-WT,w:480+2*WT,h:WT},
  {x:-WT,y:380,w:480+2*WT,h:WT},
  {x:-WT,y:-WT,w:WT,h:380+2*WT},
  // doorway room0 <-> room1, flanking the opening
  {x:480,y:-WT,w:90,h:DOOR[0]-(-WT)},
  {x:480,y:DOOR[1],w:90,h:(380+WT)-DOOR[1]},
  // room 1 (center): north, south only (east/west are the doorways)
  {x:570,y:-WT,w:480,h:WT},
  {x:570,y:380,w:480,h:WT},
  // doorway room1 <-> room2
  {x:1050,y:-WT,w:90,h:DOOR[0]-(-WT)},
  {x:1050,y:DOOR[1],w:90,h:(380+WT)-DOOR[1]},
  // room 2 (east): north, south. East is the exterior doorway, flanked the same as the
  // internal ones (the gap itself is sealed separately below until the key unlocks it).
  {x:1140,y:-WT,w:480,h:WT},
  {x:1140,y:380,w:480,h:WT},
  {x:1620,y:-WT,w:90,h:DOOR[0]-(-WT)},
  {x:1620,y:DOOR[1],w:90,h:(380+WT)-DOOR[1]},
  // yard: north, south (its own outer boundary). East is a permanently-open doorway into
  // the graveyard beyond - no separate key needed, since reaching the yard already means
  // the mansion is cleared.
  {x:1710,y:-WT,w:400+WT,h:WT},
  {x:1710,y:380,w:400+WT,h:WT},
  {x:1710+400,y:-WT,w:WT,h:DOOR[0]-(-WT)},
  {x:1710+400,y:DOOR[1],w:WT,h:(380+WT)-DOOR[1]},
];
const walls=wallsBase.map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE}));
// Seals the exterior doorway gap until the mansion key is found - removed from the
// collision list (not just visually) by unlockExteriorDoor(), so blocked() needs no
// extra parameter and every existing call site keeps working unchanged. lockExteriorDoor()
// restores the seal, so a full game reset also re-locks the mansion.
const sealRect={x:1620*ROOM_SCALE,y:DOOR[0]*ROOM_SCALE,w:90*ROOM_SCALE,h:(DOOR[1]-DOOR[0])*ROOM_SCALE};
let lockSeal=[sealRect];
export let doorUnlocked=false;
export function unlockExteriorDoor(){doorUnlocked=true;lockSeal=[]}
export function lockExteriorDoor(){doorUnlocked=false;lockSeal=[sealRect]}

export const WORLD=1620*ROOM_SCALE;
export const furniture=[
  {x:170,y:150,w:110,h:72}, // room 0
  {x:900,y:270,w:105,h:85}, // room 1, off to the side of the table
  {x:1310,y:150,w:105,h:82}, // room 2
].map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE}));
export const healthTable={x:(570+270)*ROOM_SCALE,y:70*ROOM_SCALE,w:112,h:76};
export const obstacles=[...furniture,healthTable,...walls];
// bounds grows once generateGraveyard() runs (mutable so blocked()/movement clamps pick up
// the new outer edge live); starts at the mansion+yard extent as a safe default.
export let bounds={left:0,right:(1710+400)*ROOM_SCALE,top:0,bottom:380*ROOM_SCALE};
const hit=(r,x,y,padding)=>x>r.x-padding&&x<r.x+r.w+padding&&y>r.y-padding&&y<r.y+r.h+padding;
export function blocked(x,y,padding=22){
  return obstacles.some(r=>hit(r,x,y,padding))||lockSeal.some(r=>hit(r,x,y,padding))||
    graveyardWalls.some(r=>hit(r,x,y,padding))||graveyardObstacles.some(r=>hit(r,x,y,padding))||bossSeal.some(r=>hit(r,x,y,padding));
}
export function roomAt(x,y){return [...rooms,yard,...graveyardRooms,bossRoom].filter(Boolean).find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)||rooms[1]}
export const DOOR_GAME=[DOOR[0]*ROOM_SCALE,DOOR[1]*ROOM_SCALE];

// ---- Procedural graveyard, past the yard - regenerated fresh each game via generateGraveyard().
// Continues the same row/doorway/blocked() model as the mansion (rooms in a shared y band,
// connected by wall gaps) so no new collision system is needed. Room widths and each
// doorway's vertical placement are randomized per generation for real per-run variety. The
// chain ends in a boss room that stays permanently sealed this phase - the space is
// reserved, not the fight itself (that's a later phase).
// GY_GAP is deliberately thin (a doorway threshold, not a corridor) - each connection gets
// an actual door panel (scene3d.js) that bangs open as the player approaches, rather than
// reading as an empty hallway stretch between rooms.
const GY_COUNT=5,GY_MIN_W=380,GY_MAX_W=560,GY_GAP=24,GY_DOOR_H=110,GY_MARGIN=30,BOSS_W=440;
export let graveyardRooms=[],bossRoom=null,graveyardCoinSpots=[],graveyardDoors=[],bossGate=null,graveyardObstacles=[];
let graveyardWalls=[],bossSeal=[];
const rand=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rand(a,b+1));
export function generateGraveyard(){
  const rooms_=[],walls_=[],stones_=[],coins_=[],doors_=[];
  let cursorX=1710+400+GY_GAP; // base units, right after the yard's east wall+doorway gap
  for(let i=0;i<GY_COUNT;i++){
    const w=ri(GY_MIN_W,GY_MAX_W);
    rooms_.push({x:cursorX,y:0,w,h:380,name:'grave'+(i+1)});
    cursorX+=w+GY_GAP;
  }
  const boss={x:cursorX,y:0,w:BOSS_W,h:380,name:'boss'};
  const chain=[...rooms_,boss];
  for(const r of chain){walls_.push({x:r.x,y:-WT,w:r.w,h:WT});walls_.push({x:r.x,y:380,w:r.w,h:WT})}
  // The yard/grave1 seam is already opened (fixed DOOR range) in the static wallsBase above.
  doors_.push({x:(1710+400+GY_GAP/2)*ROOM_SCALE,range:[DOOR[0]*ROOM_SCALE,DOOR[1]*ROOM_SCALE],isBoss:false});
  for(let i=1;i<chain.length;i++){
    const left=chain[i-1],right=chain[i],gapX=left.x+left.w;
    const doorStart=ri(GY_MARGIN,380-GY_MARGIN-GY_DOOR_H);
    walls_.push({x:gapX,y:-WT,w:GY_GAP,h:doorStart-(-WT)});
    walls_.push({x:gapX,y:doorStart+GY_DOOR_H,w:GY_GAP,h:(380+WT)-(doorStart+GY_DOOR_H)});
    doors_.push({x:(gapX+GY_GAP/2)*ROOM_SCALE,range:[doorStart*ROOM_SCALE,(doorStart+GY_DOOR_H)*ROOM_SCALE],isBoss:right===boss});
  }
  // Gravestones: a handful of small obstacles per graveyard room (not the boss room).
  for(const r of rooms_){
    const n=ri(3,6);
    for(let k=0;k<n;k++)stones_.push({x:r.x+rand(60,r.w-60),y:rand(60,380-60),w:34,h:34});
  }
  // Treasure: several gold/silver pickups per room - much more than the mansion's 3 coins.
  for(const r of rooms_){
    const n=ri(2,4);
    for(let k=0;k<n;k++){
      const gold=Math.random()<0.5;
      coins_.push({x:r.x+rand(60,r.w-60),y:rand(60,380-60),v:gold?ri(18,30):ri(8,14),kind:gold?'gold':'silver'});
    }
  }
  const scale=r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE,name:r.name});
  graveyardRooms=rooms_.map(scale);
  bossRoom=scale(boss);
  graveyardWalls=walls_.map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE}));
  graveyardObstacles=stones_.map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE}));
  graveyardCoinSpots=coins_.map(c=>({x:c.x*ROOM_SCALE,y:c.y*ROOM_SCALE,v:c.v,kind:c.kind}));
  graveyardDoors=doors_;
  const bossDoor=doors_.find(d=>d.isBoss);
  bossSeal=[{x:bossDoor.x-GY_GAP*ROOM_SCALE/2,y:bossDoor.range[0],w:GY_GAP*ROOM_SCALE,h:bossDoor.range[1]-bossDoor.range[0]}];
  bossGate={x:bossDoor.x,y:(bossDoor.range[0]+bossDoor.range[1])/2};
  bounds={left:0,right:(boss.x+boss.w)*ROOM_SCALE,top:0,bottom:380*ROOM_SCALE};
  return {rooms:graveyardRooms,bossRoom};
}
