/** Geometry utilities: coordinates are in stage/world units, not screen pixels. */
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);

export function distanceToSegment(p,a,b) {
  const dx = b.x-a.x, dy = b.y-a.y, d = dx*dx+dy*dy;
  if (d < 1e-10) return distance(p,a);
  const t = clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1);
  return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
}
function orient(a,b,c) { return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x); }
function intersects(a,b,c,d) {
  const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
  return (o1*o2 < 0 && o3*o4 < 0);
}
export function segmentDistance(a,b,c,d) {
  if (intersects(a,b,c,d)) return 0;
  return Math.min(distanceToSegment(a,c,d), distanceToSegment(b,c,d),distanceToSegment(c,a,b),distanceToSegment(d,a,b));
}
export function strokeSegments(payload) {
  if (Array.isArray(payload.segments)) return payload.segments;
  return Array.isArray(payload.points) ? [payload.points] : [];
}
export function linePairs(flat, payload) {
  const pts=[];
  for(let i=0;i<flat.length-1;i+=2) pts.push({x:(payload.x||0)+flat[i],y:(payload.y||0)+flat[i+1]});
  return pts;
}
function flatPoints(pts,p) { const out=[]; for(const pt of pts) out.push(+((pt.x-(p.x||0)).toFixed(1)),+((pt.y-(p.y||0)).toFixed(1)));return out; }
function nearPath(flat,p,a,b,r) {
  const pts=linePairs(flat,p);
  for (let i=1;i<pts.length;i++) if (segmentDistance(pts[i-1],pts[i],a,b) <= r) return true;
  return pts.length===1 && distanceToSegment(pts[0],a,b)<=r;
}

/** Erase portions of pen/highlighter strokes, preserving unaffected strokes as segments.
 * Returns null if unchanged; {deleted:true} if fully erased; or {payload} for an update.
 */
export function eraseStroke(payload,a,b,radius) {
  const r = radius + (payload.width||3)*0.38;
  const oldSegments=strokeSegments(payload);
  if (!oldSegments.some(part=>nearPath(part,payload,a,b,r))) return null;
  const result=[];
  for(const old of oldSegments) {
    const points=linePairs(old,payload);
    if (points.length<2) continue;
    let active=[];
    const flush=()=>{if(active.length>=2 && active.some((p,i)=>i&&distance(p,active[i-1])>.5)) result.push(flatPoints(active,payload));active=[];};
    const put=pt=>{if(!active.length || distance(active[active.length-1],pt)>.7)active.push(pt);};
    const visible=pt=>distanceToSegment(pt,a,b)>r;
    if(visible(points[0]))put(points[0]);
    for(let i=1;i<points.length;i++) {
      const prev=points[i-1],end=points[i];
      if(segmentDistance(prev,end,a,b) > r) {
        if(!active.length && visible(prev))put(prev);
        put(end); continue;
      }
      // Only subdivide the parts that intersect the eraser path; preserve other coordinates.
      const length=distance(prev,end);
      const steps=Math.max(1,Math.min(180,Math.ceil(length/2.5)));
      for(let j=1;j<=steps;j++) {
        const t=j/steps,pt={x:prev.x+(end.x-prev.x)*t,y:prev.y+(end.y-prev.y)*t};
        if(visible(pt))put(pt); else flush();
      }
    }
    flush();
  }
  if(!result.length) return {deleted:true};
  const next={...payload,segments:result}; delete next.points;
  return {payload:next};
}

function approxBBox(item) {
  const p=item.payload||{}, x=p.x||0,y=p.y||0;
  if(item.kind==='ellipse') return {left:x-(p.radiusX||1),right:x+(p.radiusX||1),top:y-(p.radiusY||1),bottom:y+(p.radiusY||1)};
  if(item.kind==='text') return {left:x,right:x+(p.text||'').length*(p.fontSize||22)*.65,top:y,bottom:y+(p.fontSize||22)*1.5};
  return {left:x,right:x+(p.width||0),top:y,bottom:y+(p.height||0)};
}
function pointInBox(pt,box,r) { return pt.x>=box.left-r && pt.x<=box.right+r && pt.y>=box.top-r && pt.y<=box.bottom+r; }
/** Test whether a sweep touches an object, for object eraser and non-stroke fine erase. */
export function sweepHitsItem(item,a,b,radius) {
  const p=item.payload||{};
  if(['pen','highlighter','line'].includes(item.kind)) {
    return strokeSegments(p).some(part=>nearPath(part,p,a,b,radius+(p.width||p.strokeWidth||3)/2));
  }
  const box=approxBBox(item), len=distance(a,b), steps=Math.max(1,Math.ceil(len/Math.max(3,radius*.5)));
  for(let i=0;i<=steps;i++) {
    const t=i/steps,pt={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    if(pointInBox(pt,box,radius)) return true;
  }
  return false;
}

export function polygonPoints(shape,width,height) {
  const count=shape==='triangle'?3:shape==='pentagon'?5:shape==='hexagon'?6:shape==='diamond'?4:0;
  const points=[];
  if(!count) return points;
  for(let i=0;i<count;i++) {
    const angle=-Math.PI/2+i*2*Math.PI/count;
    points.push(width/2+Math.cos(angle)*width/2,height/2+Math.sin(angle)*height/2);
  }
  return points;
}

export function starPoints(width,height) {
  const points=[];
  for(let i=0;i<10;i++) {
    const angle=-Math.PI/2+i*Math.PI/5,r=i%2?0.46:1;
    points.push(width/2+Math.cos(angle)*width*r/2,height/2+Math.sin(angle)*height*r/2);
  }
  return points;
}
