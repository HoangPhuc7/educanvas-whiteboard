import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TEXT_STYLE, readTextStyle, sanitizeTextStyle, konvaTextProps } from '../src/lib/textFormatting.js';

test('legacy text remains unwrapped and uses its old default font size',()=>{
  const props=konvaTextProps({text:'Bài giảng',color:'#3A3A3A'});
  assert.equal(props.fontSize,24);
  assert.equal(props.fontStyle,'normal');
  assert.equal(props.textDecoration,'');
  assert.equal(Object.hasOwn(props,'width'),false);
});
test('bold + italic + underline + strike can coexist',()=>{
  const props=konvaTextProps({...DEFAULT_TEXT_STYLE,bold:true,italic:true,underline:true,strike:true});
  assert.equal(props.fontStyle,'bold italic');
  assert.equal(props.textDecoration,'underline line-through');
});
test('new text style persists its alignment and width',()=>{
  const style=sanitizeTextStyle({...DEFAULT_TEXT_STYLE,align:'center',width:480,fontSize:54,letterSpacing:2});
  assert.deepEqual(JSON.parse(JSON.stringify(style)),style);
  assert.equal(konvaTextProps(style).width,480);
  assert.equal(konvaTextProps(style).align,'center');
});
test('invalid font, color, size and alignment cannot leak to rendering',()=>{
  const style=readTextStyle({fontFamily:'untrusted',fontSize:999,align:'invalid',color:'red',letterSpacing:-5});
  assert.equal(style.fontFamily,'Be Vietnam Pro');
  assert.equal(style.fontSize,160);
  assert.equal(style.align,'left');
  assert.equal(style.color,'#191F38');
  assert.equal(style.letterSpacing,0);
});
test('older fontStyle/textDecoration render properly',()=>{
  const style=readTextStyle({fontStyle:'bold italic',textDecoration:'underline line-through'});
  assert.equal(style.bold,true);
  assert.equal(style.italic,true);
  assert.equal(style.underline,true);
  assert.equal(style.strike,true);
});
