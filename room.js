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
export const rooms=roomsBase.map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE,name:r.name}));

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
  // room 2 (east): north, south, east (no connection there - mansion's exterior wall)
  {x:1140,y:-WT,w:480,h:WT},
  {x:1140,y:380,w:480,h:WT},
  {x:1620,y:-WT,w:WT,h:380+2*WT},
];
const walls=wallsBase.map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE}));

export const WORLD=1620*ROOM_SCALE;
export const furniture=[
  {x:170,y:150,w:110,h:72}, // room 0
  {x:900,y:270,w:105,h:85}, // room 1, off to the side of the table
  {x:1310,y:150,w:105,h:82}, // room 2
].map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE}));
export const healthTable={x:(570+270)*ROOM_SCALE,y:70*ROOM_SCALE,w:112,h:76};
export const obstacles=[...furniture,healthTable,...walls];
export const bounds={left:0,right:1620*ROOM_SCALE,top:0,bottom:380*ROOM_SCALE};
export function blocked(x,y,padding=22){return obstacles.some(r=>x>r.x-padding&&x<r.x+r.w+padding&&y>r.y-padding&&y<r.y+r.h+padding)}
export function roomAt(x,y){return rooms.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)||rooms[1]}
export const DOOR_GAME=[DOOR[0]*ROOM_SCALE,DOOR[1]*ROOM_SCALE];
