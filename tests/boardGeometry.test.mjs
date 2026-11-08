import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eraseStroke,sweepHitsItem,polygonPoints,starPoints,segmentDistance} from '../src/lib/boardGeometry.js';
test('sweep intersects crossing line',()=>assert.equal(segmentDistance({x:0,y:0},{x:20,y:20},{x:0,y:20},{x:20,y:0}),0));
test('erase middle of pen only, retaining both sides',()=>{
  const payload={x:0,y:0,points:[0,0,100,0],color:'#000000',width:3};
  const changed=eraseStroke(payload,{x:50,y:-10},{x:50,y:10},6);
  assert.ok(changed?.payload?.segments?.length===2);
  assert.ok(changed.payload.segments[0].at(-2)<50);
  assert.ok(changed.payload.segments[1][0]>50);
});
test('no change when eraser misses line',()=>{
  assert.equal(eraseStroke({x:0,y:0,points:[0,0,100,0]}, {x:0,y:50},{x:100,y:50},3),null);
});
test('full erase reports deleted',()=>{
  assert.deepEqual(eraseStroke({x:0,y:0,points:[0,0,10,0],width:2},{x:0,y:0},{x:10,y:0},10),{deleted:true});
});
test('object eraser crosses shape bounding box',()=>{
  assert.equal(sweepHitsItem({kind:'rect',payload:{x:20,y:20,width:100,height:60}},{x:0,y:50},{x:160,y:50},4),true);
});
test('polygon path data',()=>{
  assert.equal(polygonPoints('hexagon',100,80).length,12);
  assert.equal(starPoints(100,80).length,20);
});
test('precise erase keeps existing separate segments intact',()=>{
  const payload={x:0,y:0,width:3,segments:[[0,0,30,0],[70,0,100,0]]};
  const r=eraseStroke(payload,{x:50,y:-10},{x:50,y:10},4);
  assert.equal(r,null);
});
test('object sweep skips distant handwriting',()=>{
  assert.equal(sweepHitsItem({kind:'pen',payload:{x:0,y:0,points:[0,0,100,0],width:3}},{x:0,y:50},{x:100,y:50},5),false);
});
