export function touchFrame(touches) {
  const [a,b]=touches;
  return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,angle:Math.atan2(b.clientY-a.clientY,b.clientX-a.clientX)*180/Math.PI,distance:Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)};
}
export function touchCamera(camera, previous, next) {
  const angle=((next.angle-previous.angle+540)%360)-180;
  return {bearing:camera.bearing-angle,zoom:camera.zoom+Math.log2(Math.max(1,next.distance)/Math.max(1,previous.distance))};
}
