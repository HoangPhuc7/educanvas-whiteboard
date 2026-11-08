/**
 * EduCanvas rich text v1.2 — formatting applies to a complete text object.
 * Each style is JSON-serializable and stored in board_items.payload.
 */
export const FONT_FAMILIES = [
  'Be Vietnam Pro', 'Arial', 'Verdana', 'Tahoma', 'Georgia',
  'Times New Roman', 'Courier New',
];
export const DEFAULT_TEXT_STYLE = Object.freeze({
  fontSize: 28,
  fontFamily: 'Be Vietnam Pro',
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  align: 'left',
  width: 360,
  lineHeight: 1.4,
  letterSpacing: 0,
  color: '#191F38',
});

export const TEXT_SIZES = [12,14,16,18,20,24,28,32,36,40,48,56,64,72,96,120,160];
const safeNumber=(value,fallback,min,max)=>Number.isFinite(Number(value))&&value!==null&&value!==''
  ? Math.min(max,Math.max(min,Number(value))) : fallback;
const hexColor=(value,fallback)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;

export function readTextStyle(payload={}) {
  const p=payload??{};
  const fontStyle=typeof p.fontStyle==='string'?p.fontStyle:'';
  const decoration=typeof p.textDecoration==='string'?p.textDecoration:'';
  return {
    fontSize:safeNumber(p.fontSize,24,8,160),
    fontFamily:FONT_FAMILIES.includes(p.fontFamily)?p.fontFamily:DEFAULT_TEXT_STYLE.fontFamily,
    bold:typeof p.bold==='boolean'?p.bold:/\bbold\b/i.test(fontStyle),
    italic:typeof p.italic==='boolean'?p.italic:/\bitalic\b/i.test(fontStyle),
    underline:typeof p.underline==='boolean'?p.underline:/\bunderline\b/i.test(decoration),
    strike:typeof p.strike==='boolean'?p.strike:/\bline-through\b/i.test(decoration),
    align:['left','center','right'].includes(p.align)?p.align:'left',
    width:safeNumber(p.width,360,120,1000),
    lineHeight:safeNumber(p.lineHeight,1.4,1,2.5),
    letterSpacing:safeNumber(p.letterSpacing,0,0,12),
    color:hexColor(p.color,DEFAULT_TEXT_STYLE.color),
  };
}

export function sanitizeTextStyle(style={}){
  return readTextStyle({...DEFAULT_TEXT_STYLE,...style});
}

export function konvaTextProps(payload={}){
  const style=readTextStyle(payload);
  return {
    fill:style.color,
    fontSize:style.fontSize,
    fontFamily:style.fontFamily==='Be Vietnam Pro'?'Be Vietnam Pro, Arial':style.fontFamily,
    fontStyle:[style.bold?'bold':'',style.italic?'italic':''].filter(Boolean).join(' ')||'normal',
    textDecoration:[style.underline?'underline':'',style.strike?'line-through':''].filter(Boolean).join(' '),
    align:style.align,
    lineHeight:style.lineHeight,
    letterSpacing:style.letterSpacing,
    // Legacy text did not specify width and should preserve its natural width.
    ...(payload.width!=null?{width:style.width}:{})
  };
}
