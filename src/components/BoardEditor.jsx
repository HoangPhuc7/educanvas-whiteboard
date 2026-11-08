import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Group, Line, Arrow, Rect, Ellipse, Circle as KonvaCircle, Text as CanvasText } from 'react-konva';
import { Circle, Download, Eraser, Hand, Highlighter, LockKeyhole, Maximize, MousePointer2, Pencil, RotateCcw, Shapes, Trash2, Type, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase, errText } from '../lib/supabase.js';
import { Modal } from './UI.jsx';
import { clamp, eraseStroke, polygonPoints, starPoints, strokeSegments, sweepHitsItem } from '../lib/boardGeometry.js';

const COLORS = [
  '#6555ED','#191F38','#FFFFFF','#000000','#EF4444','#F97316','#FACC15','#22C55E',
  '#14B8A6','#0EA5E9','#2563EB','#9333EA','#EC4899','#A16207','#64748B','#F8B4CB',
];
const TOOLS = [
  {key:'select',label:'Chọn & di chuyển',Icon:MousePointer2},
  {key:'hand',label:'Di chuyển bảng',Icon:Hand},
  {key:'pen',label:'Bút vẽ',Icon:Pencil},
  {key:'highlighter',label:'Bút đánh dấu',Icon:Highlighter},
  {key:'eraser',label:'Tẩy bằng cách quét',Icon:Eraser},
  {key:'text',label:'Viết chữ',Icon:Type},
];
const SHAPES = [
  {key:'line',label:'Đường thẳng'},
  {key:'arrow',label:'Mũi tên'},
  {key:'rect',label:'Hình chữ nhật'},
  {key:'roundRect',label:'Chữ nhật bo góc'},
  {key:'square',label:'Hình vuông'},
  {key:'roundSquare',label:'Vuông bo góc'},
  {key:'ellipse',label:'Hình elip'},
  {key:'circle',label:'Hình tròn'},
  {key:'triangle',label:'Tam giác'},
  {key:'diamond',label:'Hình thoi'},
  {key:'pentagon',label:'Ngũ giác'},
  {key:'hexagon',label:'Lục giác'},
  {key:'star',label:'Ngôi sao'},
];
const SHAPE_KEYS = new Set(SHAPES.map(s=>s.key));
const isFilledShape = kind => kind==='rect' || kind==='ellipse';
const rgbAlpha = (hex,opacity=1) => {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return '#6555ED';
  if(opacity >= 1) return hex;
  const n=parseInt(hex.slice(1),16);
  return `rgba(${n>>16},${(n>>8)&255},${n&255},${clamp(opacity,0,1)})`;
};

/** Old boards with no fillMode remain outlined, new shapes default to completely filled. */
function shapeStyle(p) {
  const mode=p.fillMode||'outline';
  return {
    stroke:p.color||'#6555ED',
    strokeWidth:p.strokeWidth||3,
    strokeEnabled:mode!=='only',
    fill:mode==='outline'?'rgba(255,255,255,0.001)':rgbAlpha(p.fillColor||p.color||'#6555ED',p.fillOpacity??1),
    fillEnabled:mode!=='outline',
    lineJoin:'round',
  };
}

function ItemShape({item,selected,canMove,tool,onChoose,onMove,onTextEdit}) {
  const p=item.payload||{};
  const base={
    x:p.x||0,y:p.y||0,
    draggable:canMove && tool==='select',
    onPointerDown:e=>{
      if(tool==='select') {e.cancelBubble=true;onChoose(item);}
      // Eraser pointer events intentionally bubble up to the Stage so a drag
      // can delete *multiple* objects or split pen strokes across objects.
    },
    onDragEnd:e=>{e.cancelBubble=true;onMove(item,{x:e.target.x(),y:e.target.y()});},
    onDblClick:e=>{e.cancelBubble=true;if(item.kind==='text'&&canMove&&tool==='select')onTextEdit(item);},
    onDblTap:e=>{e.cancelBubble=true;if(item.kind==='text'&&canMove&&tool==='select')onTextEdit(item);},
    shadowColor:selected?'#7667e9':'transparent',shadowBlur:selected?9:0,
  };
  if(item.kind==='pen' || item.kind==='highlighter') {
    return <Group {...base}>
      {strokeSegments(p).map((points,index)=><Line key={index} points={points} stroke={p.color||'#6555ED'} strokeWidth={p.width||3}
        opacity={p.opacity??1} lineCap="round" lineJoin="round" tension={.15}
        hitStrokeWidth={Math.max(p.width||3,18)}/>)}
    </Group>;
  }
  if(item.kind==='line') {
    const shapeProps={...base,points:p.points||[0,0,1,1],stroke:p.color||'#6555ED',strokeWidth:p.width||3,
      lineCap:'round',lineJoin:'round',hitStrokeWidth:Math.max(p.width||3,18)};
    if(p.shape==='arrow') return <Arrow {...shapeProps} pointerLength={Math.max(12,(p.width||3)*3.5)} pointerWidth={Math.max(10,(p.width||3)*3)} fill={p.color||'#6555ED'}/>;
    return <Line {...shapeProps}/>;
  }
  if(item.kind==='rect') {
    const w=p.width||1,h=p.height||1,style=shapeStyle(p);
    if(p.shape==='triangle'||p.shape==='diamond'||p.shape==='pentagon'||p.shape==='hexagon'||p.shape==='star')
      return <Line {...base} {...style} points={p.shape==='star'?starPoints(w,h):polygonPoints(p.shape,w,h)} closed={true}/>;
    return <Rect {...base} {...style} width={w} height={h} cornerRadius={['roundRect','roundSquare'].includes(p.shape)?Math.min(p.cornerRadius||16,w/2,h/2):0}/>;
  }
  if(item.kind==='ellipse') return <Ellipse {...base} {...shapeStyle(p)} radiusX={p.radiusX||1} radiusY={p.radiusY||1}/>;
  if(item.kind==='text') return <CanvasText {...base} text={p.text||''} fill={p.color||'#191F38'} fontSize={p.fontSize||24} fontFamily="Be Vietnam Pro, Arial" lineHeight={1.4}/>;
  return null;
}

function makeDraft(tool,pos,style) {
  const {color,size,fillColor,fillStyle,fillOpacity,cornerRadius}=style;
  if(['pen','highlighter'].includes(tool))return {kind:tool,payload:{x:pos.x,y:pos.y,points:[0,0,.1,.1],color,width:tool==='highlighter'?size*5:size,opacity:tool==='highlighter'?.33:1}};
  if(tool==='line'||tool==='arrow')return {kind:'line',payload:{x:pos.x,y:pos.y,points:[0,0,0,0],color,width:size,shape:tool}};
  const fill={color,strokeWidth:size,fillColor,fillMode:fillStyle,fillOpacity};
  if(tool==='ellipse'||tool==='circle')return {kind:'ellipse',payload:{x:pos.x,y:pos.y,radiusX:1,radiusY:1,...fill,shape:tool}};
  if(SHAPE_KEYS.has(tool))return {kind:'rect',payload:{x:pos.x,y:pos.y,width:1,height:1,...fill,shape:tool,cornerRadius}};
  return null;
}
function extendDraft(draft,start,pos) {
  const p=draft.payload, dx=pos.x-start.x,dy=pos.y-start.y;
  if(['pen','highlighter'].includes(draft.kind))return {...draft,payload:{...p,points:p.points.length<3000?[...p.points,dx,dy]:p.points}};
  if(draft.kind==='line')return {...draft,payload:{...p,points:[0,0,dx,dy]}};
  const square=['square','roundSquare','circle'].includes(p.shape);
  const xsize=square?Math.max(Math.abs(dx),Math.abs(dy)):Math.abs(dx);
  const ysize=square?xsize:Math.abs(dy);
  const xx=start.x+(dx<0?-xsize:0), yy=start.y+(dy<0?-ysize:0);
  if(draft.kind==='rect')return {...draft,payload:{...p,x:xx,y:yy,width:Math.max(1,xsize),height:Math.max(1,ysize)}};
  if(draft.kind==='ellipse')return {...draft,payload:{...p,x:xx+xsize/2,y:yy+ysize/2,radiusX:Math.max(1,xsize/2),radiusY:Math.max(1,ysize/2)}};
  return draft;
}

export default function BoardEditor({board,profile,notify,connected}) {
  const teacher=profile.role==='teacher';
  const canWrite=teacher||!board.is_locked;
  const [items,setItems]=useState([]);
  const [tool,setTool]=useState('pen');
  const [color,setColor]=useState(COLORS[0]);
  const [fillColor,setFillColor]=useState(COLORS[0]);
  const [fillLinked,setFillLinked]=useState(true);
  const [fillStyle,setFillStyle]=useState('both');
  const [fillOpacity,setFillOpacity]=useState(1);
  const [cornerRadius,setCornerRadius]=useState(18);
  const [size,setSize]=useState(3);
  const [eraserMode,setEraserMode]=useState('objects');
  const [eraserRadius,setEraserRadius]=useState(14);
  const [eraserCursor,setEraserCursor]=useState(null);
  const [selected,setSelected]=useState(null);
  const [draft,setDraft]=useState(null);
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:72,y:55});
  const [dims,setDims]=useState({width:800,height:570});
  const [textDraft,setTextDraft]=useState(null);
  const [textValue,setTextValue]=useState('');
  const [saving,setSaving]=useState(false);
  const [syncStatus,setSyncStatus]=useState('loading');
  const [itemsConnected,setItemsConnected]=useState(false);
  const stageRef=useRef(null),hostRef=useRef(null),gestureRef=useRef(null),draftRef=useRef(null),itemsRef=useRef([]);
  useEffect(()=>{itemsRef.current=items;},[items]);

  useEffect(()=>{
    const el=hostRef.current;if(!el)return;
    const observer=new ResizeObserver(entries=>{
      const e=entries[0];if(e)setDims({width:Math.max(200,Math.floor(e.contentRect.width)),height:Math.max(240,Math.floor(e.contentRect.height))});
    });
    observer.observe(el);return ()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    let alive=true;
    setItems([]);itemsRef.current=[];setSelected(null);setSyncStatus('loading');setItemsConnected(false);
    async function load(){
      const {data,error}=await supabase.from('board_items').select('*').eq('board_id',board.id).is('deleted_at',null).order('created_at',{ascending:true}).limit(2000);
      if(!alive)return;
      if(error){setSyncStatus('error');notify(errText(error),'error');}
      else{setItems(data||[]);setSyncStatus('saved');}
    }
    const channel=supabase.channel('items-'+board.id).on('postgres_changes',{event:'*',schema:'public',table:'board_items',filter:'board_id=eq.'+board.id},event=>{
      if(event.eventType==='INSERT'){
        if(event.new?.deleted_at)return;
        setItems(cur=>cur.some(x=>x.id===event.new.id)?cur.map(x=>x.id===event.new.id?event.new:x):[...cur,event.new]);
      }else if(event.eventType==='UPDATE'){
        setItems(cur=>event.new?.deleted_at?cur.filter(x=>x.id!==event.new.id):cur.some(x=>x.id===event.new.id)?cur.map(x=>x.id===event.new.id?event.new:x):[...cur,event.new]);
      }else if(event.eventType==='DELETE')setItems(cur=>cur.filter(x=>x.id!==event.old?.id));
    }).subscribe(status=>{setItemsConnected(status==='SUBSCRIBED');if(status==='SUBSCRIBED')load();});
    load();return()=>{alive=false;supabase.removeChannel(channel);};
  },[board.id,notify]);

  const editableByMe=useCallback(item=>canWrite&&(teacher||item.created_by===profile.id),[canWrite,teacher,profile.id]);
  const addItem=useCallback(async (kind,payload)=>{
    if(!canWrite)return;
    const id=crypto.randomUUID(),optimistic={id,board_id:board.id,created_by:profile.id,kind,payload,deleted_at:null,created_at:new Date().toISOString()};
    setItems(cur=>[...cur,optimistic]);setSyncStatus('saving');
    const {error}=await supabase.from('board_items').insert({id,board_id:board.id,created_by:profile.id,kind,payload});
    if(error){setItems(cur=>cur.filter(x=>x.id!==id));setSyncStatus('error');notify('Không lưu được: '+errText(error),'error');}
    else setSyncStatus('saved');
  },[board.id,profile.id,canWrite,notify]);
  const reloadItems=useCallback(async()=>{
    const {data}=await supabase.from('board_items').select('*').eq('board_id',board.id).is('deleted_at',null).order('created_at',{ascending:true}).limit(2000);
    if(data)setItems(data);
  },[board.id]);
  const patchItem=useCallback(async(item,patch)=>{
    if(!editableByMe(item))return;
    const updated={...item,...patch};
    setItems(cur=>patch.deleted_at?cur.filter(x=>x.id!==item.id):cur.map(x=>x.id===item.id?updated:x));
    setSyncStatus('saving');
    const {data:changed,error}=await supabase.from('board_items').update(patch).eq('id',item.id).select('id');
    if(error||!changed?.length){notify('Không lưu được: '+(error?errText(error):'Bạn không còn quyền sửa đối tượng này.'),'error');await reloadItems();setSyncStatus('error');}
    else setSyncStatus('saved');
  },[editableByMe,notify,reloadItems]);
  const erase=useCallback(item=>patchItem(item,{deleted_at:new Date().toISOString()}),[patchItem]);
  const undo=useCallback(()=>{
    const mine=[...items].reverse().find(x=>x.created_by===profile.id&&!x.deleted_at);
    if(mine)erase(mine);else notify('Bạn chưa có nét vẽ nào để hoàn tác.');
  },[items,profile.id,erase,notify]);
  useEffect(()=>{
    const handler=e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
        e.preventDefault();if(canWrite)undo();
      }
      if(e.key==='Escape'){setSelected(null);setTextDraft(null);}
      if((e.key==='Delete'||e.key==='Backspace')&&selected&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
        const item=items.find(x=>x.id===selected);if(item&&editableByMe(item))erase(item);
      }
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[undo,canWrite,selected,items,editableByMe,erase]);

  function pointerPosition(){
    const pos=stageRef.current?.getRelativePointerPosition();
    return pos?{x:Math.round(pos.x*10)/10,y:Math.round(pos.y*10)/10}:null;
  }
  /** Apply a continuous eraser sweep locally, postponing all remote writes until release. */
  function sweepEraser(from,to){
    const gesture=gestureRef.current;
    if(!gesture||gesture.kind!=='erase')return;
    const radius=gesture.radius;
    let changed=false;
    const next=[];
    for(const item of itemsRef.current){
      if(!editableByMe(item)){next.push(item);continue;}
      if(!sweepHitsItem(item,from,to,radius)){next.push(item);continue;}
      if(eraserMode==='fine'&&['pen','highlighter'].includes(item.kind)){
        const outcome=eraseStroke(item.payload,from,to,radius);
        if(!outcome){next.push(item);continue;}
        const previous=gesture.changes.get(item.id);
        if(outcome.deleted){gesture.changes.set(item.id,{original:previous?.original||item,deleted:true});changed=true;continue;}
        const nextItem={...item,payload:outcome.payload};
        gesture.changes.set(item.id,{original:previous?.original||item,payload:outcome.payload});
        next.push(nextItem);changed=true;
      }else{
        const previous=gesture.changes.get(item.id);
        gesture.changes.set(item.id,{original:previous?.original||item,deleted:true});
        changed=true;
      }
    }
    if(changed){itemsRef.current=next;setItems(next);setSelected(null);}
  }
  async function finishErasing(changes){
    if(!changes.size)return;
    setSyncStatus('saving');
    const deleted=[],updated=[];
    for(const [id,change] of changes)if(change.deleted)deleted.push(id);else if(change.payload)updated.push({id,payload:change.payload});
    try{
      for(let i=0;i<deleted.length;i+=75){
        const ids=deleted.slice(i,i+75);
        const {data,error}=await supabase.from('board_items').update({deleted_at:new Date().toISOString()}).eq('board_id',board.id).in('id',ids).select('id');
        if(error||data?.length!==ids.length)throw error||new Error('Một số đối tượng không thể xóa do quyền truy cập.');
      }
      for(const row of updated){
        // Avoid exceeding the database's 64 KB per item limit after a split.
        if(new TextEncoder().encode(JSON.stringify(row.payload)).length>62000)throw new Error('Nét vẽ quá lớn để tẩy chi tiết. Hãy tẩy cả nét hoặc chia thành nhiều nét ngắn.');
        const {data,error}=await supabase.from('board_items').update({payload:row.payload}).eq('id',row.id).select('id');
        if(error||!data?.length)throw error||new Error('Không còn quyền cập nhật nét vẽ này.');
      }
      setSyncStatus('saved');
    }catch(error){notify('Không lưu được thao tác tẩy: '+errText(error),'error');await reloadItems();setSyncStatus('error');}
  }
  function pointerDown(e){
    if(tool==='select'){if(e.target===e.target.getStage())setSelected(null);return;}
    if(tool==='hand'||!canWrite||gestureRef.current)return;
    if(e.evt?.button!==undefined&&e.evt.button!==0)return;
    const pos=pointerPosition();if(!pos)return;
    if(tool==='eraser'){
      gestureRef.current={kind:'erase',radius:eraserRadius,changes:new Map(),from:pos};
      setEraserCursor(pos);sweepEraser(pos,pos);return;
    }
    if(tool==='text'){setTextDraft({x:pos.x,y:pos.y,item:null});setTextValue('');return;}
    const d=makeDraft(tool,pos,{color,size,fillColor:fillLinked?color:fillColor,fillStyle,fillOpacity,cornerRadius});
    if(!d)return;
    gestureRef.current={kind:'draw',start:pos};draftRef.current=d;setDraft(d);
  }
  function pointerMove(){
    const pos=pointerPosition();if(!pos)return;
    if(tool==='eraser')setEraserCursor(pos);
    if(gestureRef.current?.kind==='erase'){
      const prev=gestureRef.current.from;
      sweepEraser(prev,pos);gestureRef.current.from=pos;
      return;
    }
    if(gestureRef.current?.kind!=='draw'||!draftRef.current)return;
    const next=extendDraft(draftRef.current,gestureRef.current.start,pos);
    draftRef.current=next;setDraft(next);
  }
  function pointerUp(){
    const gesture=gestureRef.current;if(!gesture)return;
    gestureRef.current=null;
    if(gesture.kind==='erase'){void finishErasing(gesture.changes);return;}
    const d=draftRef.current;draftRef.current=null;setDraft(null);
    if(!d)return;
    const p=d.payload;
    if((d.kind==='rect'&&(p.width<3||p.height<3))||(d.kind==='ellipse'&&(p.radiusX<1.5||p.radiusY<1.5))||(d.kind==='line'&&Math.hypot(p.points[2],p.points[3])<3))return;
    void addItem(d.kind,d.payload);
  }
  function chooseItem(item){setSelected(item.id);}
  function editText(item){setTextDraft({item,x:item.payload.x,y:item.payload.y});setTextValue(item.payload.text);}
  function saveText(e){
    e.preventDefault();const text=textValue.trim().slice(0,2000);
    if(text){
      if(textDraft.item)void patchItem(textDraft.item,{payload:{...textDraft.item.payload,text}});
      else void addItem('text',{x:textDraft.x,y:textDraft.y,text,fontSize:22+size,color});
    }
    setTextDraft(null);setTextValue('');
  }
  function chooseColor(newColor){setColor(newColor);if(fillLinked)setFillColor(newColor);}
  function styleSelected(){
    const item=items.find(x=>x.id===selected);if(!item||!editableByMe(item))return;
    const payload={...item.payload,color};
    if(isFilledShape(item.kind))Object.assign(payload,{fillColor:fillLinked?color:fillColor,fillMode:fillStyle,fillOpacity,strokeWidth:size,cornerRadius});
    else if(item.kind==='line')payload.width=size;
    else if(item.kind==='pen'||item.kind==='highlighter')payload.width=item.kind==='highlighter'?size*5:size;
    void patchItem(item,{payload});
  }
  function wheel(e){
    e.evt.preventDefault();const pt=stageRef.current?.getPointerPosition();if(!pt)return;
    const next=clamp(zoom*(e.evt.deltaY>0?.9:1.1),.35,3);
    setPan({x:pt.x-(pt.x-pan.x)*next/zoom,y:pt.y-(pt.y-pan.y)*next/zoom});setZoom(next);
  }
  function applyZoom(factor){
    const next=clamp(zoom*factor,.35,3),mid={x:dims.width/2,y:dims.height/2};
    setPan({x:mid.x-(mid.x-pan.x)*next/zoom,y:mid.y-(mid.y-pan.y)*next/zoom});setZoom(next);
  }
  function resetView(){setZoom(1);setPan({x:72,y:55});}
  function exportPNG(){
    const stage=stageRef.current;if(!stage)return;
    const url=stage.toDataURL({pixelRatio:2});const image=new Image();
    image.onload=()=>{
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);
      const anchor=document.createElement('a');anchor.download='EduCanvas-'+board.kind+'-'+new Date().toISOString().slice(0,10)+'.png';anchor.href=canvas.toDataURL('image/png');anchor.click();
      notify('Đã xuất ảnh PNG của vùng bảng đang hiển thị.','success');
    };image.src=url;
  }
  async function clearBoard(){
    if(!teacher||!window.confirm('Xóa tất cả nét vẽ trên bảng này? Không thể hoàn tác thao tác này.'))return;
    setSaving(true);const {error}=await supabase.from('board_items').update({deleted_at:new Date().toISOString()}).eq('board_id',board.id).is('deleted_at',null);
    setSaving(false);if(error)notify(errText(error),'error');else{setItems([]);notify('Đã xóa toàn bộ nội dung bảng.','success');}
  }
  const pickedItem=items.find(i=>i.id===selected);
  const isShape=SHAPE_KEYS.has(tool);
  const rounded=['roundRect','roundSquare'].includes(tool);

  return <div className="editor-shell">
    <div className="editor-toolbar">
      <div className="toolbar-main">
        <div className="tools-group"><span className="toolbar-heading">CÔNG CỤ</span><div className="tool-buttons">
          {TOOLS.map(({key,label,Icon})=><button key={key} title={label} aria-label={label} aria-pressed={tool===key}
            disabled={!canWrite&&!['select','hand'].includes(key)} className={'tool-button '+(tool===key?'chosen':'')}
            onClick={()=>{setTool(key);setSelected(null);}}><Icon size={19} strokeWidth={tool===key?2.4:1.85}/></button>)}
        </div></div>
        <div className="toolbar-divider"/>
        <div className="tools-group shape-group"><span className="toolbar-heading">HÌNH HỌC</span>
          <label className={'shape-picker '+(isShape?'active':'')}><Shapes size={17}/>
            <select aria-label="Chọn hình để vẽ" value={isShape?tool:''} disabled={!canWrite}
              onChange={e=>{setTool(e.target.value);setSelected(null);}}>
              <option value="" disabled>Chọn hình…</option>
              {SHAPES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <div className="toolbar-spacer"/>
        <div className="toolbar-actions">
          <button className="subtle-action" title="Hoàn tác nét gần nhất của bạn (Ctrl+Z)" disabled={!canWrite} onClick={undo}><RotateCcw size={18}/><span>Hoàn tác</span></button>
          <button className="subtle-action" title="Xuất ảnh PNG" onClick={exportPNG}><Download size={18}/><span>Xuất PNG</span></button>
          {teacher&&<button className="subtle-action danger-action" title="Xóa toàn bộ bảng" disabled={saving} onClick={clearBoard}><Trash2 size={18}/></button>}
        </div>
      </div>
      <div className="toolbar-style">
        <div className="style-section"><span className="toolbar-heading">MÀU NÉT / CHỮ</span>
          <div className="palette">{COLORS.map(c=><button key={c} title={c} aria-label={'Chọn màu '+c} aria-pressed={color===c}
            className={'color-swatch '+(color===c?'active':'')} style={{'--swatch':c}} onClick={()=>chooseColor(c)}><span/></button>)}</div>
        </div>
        <div className="color-custom" title="Chọn màu bất kỳ"><input type="color" aria-label="Màu nét tùy chỉnh" value={color} onChange={e=>chooseColor(e.target.value)}/><span>{color.toUpperCase()}</span></div>
        <div className="toolbar-divider"/>
        <div className="style-section"><span className="toolbar-heading">ĐỘ DÀY</span><div className="brush-control"><input type="range" aria-label="Độ dày nét" value={size} min="1" max="25" onChange={e=>setSize(Number(e.target.value))}/><span>{size}px</span></div></div>
        {isShape&&tool!=='line'&&tool!=='arrow'&&<>
          <div className="toolbar-divider"/>
          <div className="style-section"><span className="toolbar-heading">TÔ MÀU HÌNH</span>
            <select aria-label="Kiểu tô màu hình" className="fill-mode" value={fillStyle} onChange={e=>setFillStyle(e.target.value)}>
              <option value="both">Tô kín + viền</option><option value="only">Chỉ tô kín</option><option value="outline">Chỉ viền</option>
            </select>
          </div>
          {fillStyle!=='outline'&&<>
            <div className="fill-options"><label className="fill-link"><input type="checkbox" checked={fillLinked} onChange={e=>{setFillLinked(e.target.checked);if(e.target.checked)setFillColor(color);}}/>Cùng màu nét</label>
            {!fillLinked&&<label className="color-custom" title="Màu tô bên trong"><input type="color" aria-label="Màu tô bên trong" value={fillColor} onChange={e=>setFillColor(e.target.value)}/><span>Màu nền</span></label>}</div>
            <div className="style-section opacity-control"><span className="toolbar-heading">ĐỘ ĐẬM MÀU TÔ</span><div className="brush-control"><input type="range" aria-label="Độ đậm màu tô" value={Math.round(fillOpacity*100)} min="10" max="100" step="5" onChange={e=>setFillOpacity(Number(e.target.value)/100)}/><span>{Math.round(fillOpacity*100)}%</span></div></div>
          </>}
          {rounded&&<div className="style-section"><span className="toolbar-heading">BO GÓC</span><div className="brush-control"><input type="range" aria-label="Bán kính bo góc" value={cornerRadius} min="4" max="80" onChange={e=>setCornerRadius(Number(e.target.value))}/><span>{cornerRadius}px</span></div></div>}
        </>}
        {tool==='eraser'&&<>
          <div className="toolbar-divider"/>
          <div className="style-section"><span className="toolbar-heading">CHẾ ĐỘ TẨY</span>
            <select className="fill-mode" aria-label="Chế độ tẩy" value={eraserMode} onChange={e=>setEraserMode(e.target.value)}>
              <option value="objects">Quét xóa cả đối tượng</option>
              <option value="fine">Tẩy chi tiết nét bút</option>
            </select>
          </div>
          <div className="style-section"><span className="toolbar-heading">BÁN KÍNH TẨY</span><div className="brush-control"><input type="range" aria-label="Bán kính đầu tẩy" value={eraserRadius} min="3" max="45" onChange={e=>setEraserRadius(Number(e.target.value))}/><span>{eraserRadius}px</span></div></div>
        </>}
        {pickedItem&&editableByMe(pickedItem)&&<button className="apply-style" title="Áp dụng màu, kiểu tô và độ dày hiện tại cho đối tượng đã chọn" onClick={styleSelected}>Đổi màu hình đang chọn</button>}
      </div>
    </div>
    {board.is_locked&&!teacher&&<div className="read-only-banner"><LockKeyhole size={16}/> Giáo viên đã khóa bảng này. Bạn vẫn có thể xem và xuất ảnh.</div>}
    {tool==='eraser'&&<div className="eraser-hint">{eraserMode==='objects'?'Kéo đầu tẩy qua các hình/nét cần xóa; có thể quét nhiều đối tượng cùng lúc.':'Tẩy một phần nét bút hoặc nét đánh dấu; với hình học/chữ sẽ xóa cả đối tượng.'} Chỉ sửa được nét của bạn hoặc nét học sinh nếu bạn là giáo viên.</div>}
    <div className={'canvas-host '+(tool==='hand'?'is-panning':'')} ref={hostRef}>
      <Stage ref={stageRef} width={dims.width} height={dims.height} x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}
        draggable={tool==='hand'} onDragEnd={e=>{if(e.target===e.target.getStage())setPan({x:e.target.x(),y:e.target.y()});}}
        onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={()=>{pointerUp();setEraserCursor(null);}}>
        <Layer>{items.map(item=><ItemShape key={item.id} item={item} selected={selected===item.id} tool={tool} canMove={editableByMe(item)}
          onChoose={chooseItem} onMove={(i,pos)=>void patchItem(i,{payload:{...i.payload,...pos}})} onTextEdit={editText}/>)}
          {draft&&<ItemShape item={{id:'draft',kind:draft.kind,payload:draft.payload}} selected={false} canMove={false} tool="draw" onChoose={()=>{}} onMove={()=>{}} onTextEdit={()=>{}}/>}
          {tool==='eraser'&&eraserCursor&&<KonvaCircle x={eraserCursor.x} y={eraserCursor.y} radius={eraserRadius} stroke="#e05474" fill="rgba(224,84,116,.12)" dash={[4,4]} strokeWidth={1.2} listening={false}/>}
        </Layer>
      </Stage>
      {items.length===0&&syncStatus!=='loading'&&<div className="canvas-empty-hint"><div className="empty-hint-icon"><Pencil size={23}/></div><strong>Đây là bảng trắng của bạn</strong><span>Chọn công cụ và bắt đầu viết, vẽ ý tưởng!</span></div>}
      <div className="canvas-bottom-left"><span className={connected&&itemsConnected?'saved-indicator':'offline-indicator'}/><span>{syncStatus==='loading'?'Đang tải nét vẽ':syncStatus==='saving'?'Đang lưu...':syncStatus==='error'?'Lỗi lưu dữ liệu':connected&&itemsConnected?'Đã lưu & đồng bộ':'Chưa kết nối realtime'}</span><i>·</i><span>{items.length} đối tượng</span></div>
      <div className="zoom-controls"><button onClick={()=>applyZoom(1/1.2)} title="Thu nhỏ" aria-label="Thu nhỏ"><ZoomOut size={18}/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>applyZoom(1.2)} title="Phóng to" aria-label="Phóng to"><ZoomIn size={18}/></button><button onClick={resetView} title="Đặt lại khung nhìn" aria-label="Đặt lại khung nhìn"><Maximize size={17}/></button></div>
    </div>
    {textDraft&&<Modal title={textDraft.item?'Chỉnh sửa văn bản':'Thêm văn bản vào bảng'} onClose={()=>setTextDraft(null)} narrow><form className="modal-form" onSubmit={saveText}><label>Nội dung<textarea autoFocus rows={4} maxLength={2000} value={textValue} onChange={e=>setTextValue(e.target.value)} placeholder="Nhập nội dung để chèn..." required/></label><div className="modal-actions"><button type="button" className="ghost-btn" onClick={()=>setTextDraft(null)}>Hủy</button><button className="primary-btn" type="submit">{textDraft.item?'Lưu thay đổi':'Chèn văn bản'}</button></div></form></Modal>}
  </div>;
}
