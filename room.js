// Double the previous room's floor area, keeping character and movement scale unchanged.
export const ROOM_GROWTH=Math.SQRT2;
export const ROOM_SCALE=1.6*ROOM_GROWTH;
export const WORLD=720*ROOM_SCALE;
export const furniture=[{x:80,y:140,w:110,h:72},{x:526,y:138,w:105,h:85},{x:527,y:459,w:105,h:82}].map(r=>({x:r.x*ROOM_SCALE,y:r.y*ROOM_SCALE,w:r.w*ROOM_SCALE,h:r.h*ROOM_SCALE}));
export const healthTable={x:270*ROOM_SCALE,y:405*ROOM_SCALE,w:112,h:76};
export const obstacles=[...furniture,healthTable];
export const bounds={left:64*ROOM_SCALE,right:656*ROOM_SCALE,top:160*ROOM_SCALE,bottom:633*ROOM_SCALE};
export function blocked(x,y,padding=22){return obstacles.some(r=>x>r.x-padding&&x<r.x+r.w+padding&&y>r.y-padding&&y<r.y+r.h+padding)}
