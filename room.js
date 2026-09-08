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
  // yard: north, south, east (its own outer boundary - west is the exterior doorway)
  {x:1710,y:-WT,w:400+WT,h:WT},
  {x:1710,y:380,w:400+WT,h:WT},
  {x:1710+400,y:-WT,w:WT,h:380+2*WT},
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
export const bounds={left:0,right:(1710+400)*ROOM_SCALE,top:0,bottom:380*ROOM_SCALE};
export function blocked(x,y,padding=22){return obstacles.some(r=>x>r.x-padding&&x<r.x+r.w+padding&&y>r.y-padding&&y<r.y+r.h+padding)||lockSeal.some(r=>x>r.x-padding&&x<r.x+r.w+padding&&y>r.y-padding&&y<r.y+r.h+padding)}
export function roomAt(x,y){return [...rooms,yard].find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)||rooms[1]}
export const DOOR_GAME=[DOOR[0]*ROOM_SCALE,DOOR[1]*ROOM_SCALE];
