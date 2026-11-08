import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicatePayload, resizePayload, isPayloadTooLarge } from '../src/lib/itemTransforms.js';

const item=(kind,payload)=>({kind,payload});
test('duplicate deep copies points, preserves style and offsets both axes',()=>{
  const p={x:12,y:30,color:'#aa44cc',segments:[[0,0,12,15]]};
  const clone=duplicatePayload(p);
  assert.equal(clone.x,40);assert.equal(clone.y,58);assert.equal(clone.color,p.color);
  clone.segments[0][0]=999;assert.equal(p.segments[0][0],0);
});
test('rectangle resize persists dimensions, rounded corners and position',()=>{
  const p={x:30,y:12,width:120,height:80,strokeWidth:3,cornerRadius:12,shape:'roundRect'};
  const next=resizePayload(item('rect',p),{scaleX:1.5,scaleY:1.5,x:34,y:22});
  assert.deepEqual([next.x,next.y,next.width,next.height,next.cornerRadius],[34,22,180,120,18]);
  assert.equal(p.width,120);
});
test('ellipse resize updates radii and remains centered at node position',()=>{
  const p=resizePayload(item('ellipse',{x:100,y:80,radiusX:20,radiusY:10}),{scaleX:2,scaleY:2});
  assert.equal(p.radiusX,40);assert.equal(p.radiusY,20);assert.equal(p.x,100);
});
test('line and arrow points remain scalable',()=>{
  const p=resizePayload(item('line',{points:[0,0,50,20],shape:'arrow',width:3}),{scaleX:2,scaleY:2});
  assert.deepEqual(p.points,[0,0,100,40]);assert.equal(p.width,6);
});
test('precision-erased pen with multiple segments scales without data loss',()=>{
  const p=resizePayload(item('pen',{x:7,y:9,width:4,segments:[[0,0,10,10],[30,40,50,60]]}),{scaleX:2,scaleY:2});
  assert.deepEqual(p.segments,[[0,0,20,20],[60,80,100,120]]);assert.equal(p.width,8);
});
test('formatted text scales font and width but preserves underline and bold',()=>{
  const p=resizePayload(item('text',{x:0,y:0,text:'Chào',fontSize:28,bold:true,underline:true}),{scaleX:1.25,scaleY:1.25,textWidth:170});
  assert.equal(p.fontSize,35);assert.equal(p.width,212.5);assert.equal(p.bold,true);assert.equal(p.underline,true);
});
test('legacy text with absent width uses rendered width for transform',()=>{
  const p=resizePayload(item('text',{text:'hello',fontSize:24}),{scaleX:1.5,scaleY:1.5,textWidth:125});
  assert.equal(p.width,187.5);
});
test('prevents too-large JSON before inserting or updating',()=>{
  assert.equal(isPayloadTooLarge({text:'A'.repeat(63000)}),true);
  assert.equal(isPayloadTooLarge({text:'Hello!'}),false);
});
