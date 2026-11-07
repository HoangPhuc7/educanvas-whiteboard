import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Text as CanvasText } from 'react-konva';
import { Circle, Download, Eraser, Hand, Highlighter, LockKeyhole, Maximize, Minus, MousePointer2, Pencil, RotateCcw, Square, Trash2, Type, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase, errText } from '../lib/supabase.js';
import { Modal } from './UI.jsx';

const COLORS = ['#6657F1','#191F38','#F06386','#EF8D45','#21A99B','#3286E7','#9C57D9','#F0C64E'];
const TOOLS = [
  { key:'select', label:'Chọn & di chuyển', Icon:MousePointer2 },
  { key:'hand', label:'Kéo khung nhìn', Icon:Hand },
  { key:'pen', label:'Bút vẽ', Icon:Pencil },
  { key:'highlighter', label:'Bút đánh dấu', Icon:Highlighter },
  { key:'eraser', label:'Tẩy vật thể', Icon:Eraser },
  { key:'line', label:'Đoạn thẳng', Icon:Minus },
  { key:'rect', label:'Hình chữ nhật', Icon:Square },
  { key:'ellipse', label:'Hình elip', Icon:Circle },
  { key:'text', label:'Chèn chữ', Icon:Type },
];
const clamp = (n,min,max) => Math.max(min, Math.min(max,n));

function ItemShape({ item, selected, canMove, canErase, tool, onChoose, onMove, onTextEdit }) {
  const p = item.payload || {};
  const base = {
    key: item.id,
    x: p.x || 0, y: p.y || 0,
    draggable: canMove && tool === 'select',
    onPointerDown: e => {
      if (tool === 'select' || tool === 'eraser') {
        e.cancelBubble = true;
        if (tool === 'eraser' && canErase) onChoose(item, 'erase');
        else if (tool === 'select') onChoose(item, 'select');
      }
    },
    onDragEnd: e => { e.cancelBubble = true; onMove(item, { x:e.target.x(), y:e.target.y() }); },
    onDblClick: e => { e.cancelBubble = true; if (item.kind === 'text' && canErase && tool === 'select') onTextEdit(item); },
    onDblTap: e => { e.cancelBubble = true; if (item.kind === 'text' && canErase && tool === 'select') onTextEdit(item); },
    shadowColor: selected ? '#7667e9' : 'transparent', shadowBlur: selected ? 10 : 0,
  };
  if (item.kind === 'pen' || item.kind === 'highlighter' || item.kind === 'line') return <Line {...base} points={p.points || []} stroke={p.color || '#6657F1'} strokeWidth={p.width || 3} opacity={p.opacity ?? 1} lineCap="round" lineJoin="round" tension={item.kind === 'line' ? 0 : .25} hitStrokeWidth={Math.max(p.width || 3, 16)} />;
  if (item.kind === 'rect') return <Rect {...base} width={p.width || 1} height={p.height || 1} stroke={p.color || '#6657F1'} strokeWidth={p.strokeWidth || 3} fill="rgba(255,255,255,0.01)" />;
  if (item.kind === 'ellipse') return <Ellipse {...base} radiusX={p.radiusX || 1} radiusY={p.radiusY || 1} stroke={p.color || '#6657F1'} strokeWidth={p.strokeWidth || 3} fill="rgba(255,255,255,0.01)" />;
  if (item.kind === 'text') return <CanvasText {...base} text={p.text || ''} fill={p.color || '#191F38'} fontSize={p.fontSize || 24} fontFamily="Be Vietnam Pro, Arial" fontStyle="normal" lineHeight={1.4} />;
  return null;
}

function makeDraft(tool, pos, color, size) {
  if (['pen','highlighter'].includes(tool)) return { kind:tool, payload:{x:pos.x,y:pos.y,points:[0,0,0.1,0.1],color,width:tool==='highlighter'?size*5:size,opacity:tool==='highlighter'?.33:1}};
  if (tool === 'line') return {kind:tool,payload:{x:pos.x,y:pos.y,points:[0,0,0,0],color,width:size,opacity:1}};
  if (tool === 'rect') return {kind:tool,payload:{x:pos.x,y:pos.y,width:1,height:1,color,strokeWidth:size}};
  if (tool === 'ellipse') return {kind:tool,payload:{x:pos.x,y:pos.y,radiusX:1,radiusY:1,color,strokeWidth:size}};
  return null;
}

function extendDraft(draft, start, pos) {
  const p = draft.payload;
  if (['pen','highlighter'].includes(draft.kind)) return {...draft, payload:{...p,points:p.points.length < 3000 ? [...p.points,pos.x-start.x,pos.y-start.y] : p.points}};
  if (draft.kind === 'line') return {...draft,payload:{...p,points:[0,0,pos.x-start.x,pos.y-start.y]}};
  if (draft.kind === 'rect') return {...draft,payload:{...p,x:Math.min(start.x,pos.x),y:Math.min(start.y,pos.y),width:Math.max(1,Math.abs(pos.x-start.x)),height:Math.max(1,Math.abs(pos.y-start.y))}};
  if (draft.kind === 'ellipse') return {...draft,payload:{...p,x:(start.x+pos.x)/2,y:(start.y+pos.y)/2,radiusX:Math.max(1,Math.abs(pos.x-start.x)/2),radiusY:Math.max(1,Math.abs(pos.y-start.y)/2)}};
  return draft;
}

export default function BoardEditor({ board, profile, notify, connected }) {
  const teacher = profile.role === 'teacher';
  const canWrite = teacher || !board.is_locked;
  const [items,setItems] = useState([]);
  const [tool,setTool] = useState('pen');
  const [color,setColor] = useState(COLORS[0]);
  const [size,setSize] = useState(3);
  const [selected,setSelected] = useState(null);
  const [draft,setDraft] = useState(null);
  const [zoom,setZoom] = useState(1);
  const [pan,setPan] = useState({x:72,y:55});
  const [dims,setDims] = useState({width:800,height:570});
  const [textDraft,setTextDraft] = useState(null);
  const [textValue,setTextValue] = useState('');
  const [saving,setSaving] = useState(false);
  const [syncStatus,setSyncStatus] = useState('loading');
  const [itemsConnected,setItemsConnected] = useState(false);
  const stageRef = useRef(null);
  const hostRef = useRef(null);
  const gestureRef = useRef(null);
  const draftRef = useRef(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setDims({width:Math.max(200,Math.floor(entry.contentRect.width)),height:Math.max(240,Math.floor(entry.contentRect.height))});
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    setItems([]); setSyncStatus('loading'); setItemsConnected(false);
    async function load() {
      const {data,error} = await supabase.from('board_items').select('*').eq('board_id',board.id).is('deleted_at',null).order('created_at',{ascending:true}).limit(2000);
      if (!alive) return;
      if (error) { setSyncStatus('error'); notify(errText(error),'error'); }
      else { setItems(data || []); setSyncStatus('saved'); }
    }
    const channel = supabase.channel('items-' + board.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'board_items',filter:'board_id=eq.'+board.id},event => {
        if (event.eventType === 'INSERT') {
          if (event.new?.deleted_at) return;
          setItems(cur => cur.some(x => x.id === event.new.id) ? cur.map(x => x.id === event.new.id ? event.new : x) : [...cur,event.new]);
        } else if (event.eventType === 'UPDATE') {
          setItems(cur => event.new?.deleted_at ? cur.filter(x => x.id !== event.new.id) : cur.map(x => x.id === event.new.id ? event.new : x));
        } else if (event.eventType === 'DELETE') {
          setItems(cur => cur.filter(x => x.id !== event.old?.id));
        }
      }).subscribe(status => { setItemsConnected(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') load(); });
    load();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [board.id,notify]);

  const editableByMe = useCallback(item => canWrite && (teacher || item.created_by === profile.id),[canWrite,teacher,profile.id]);

  const addItem = useCallback(async (kind,payload) => {
    if (!canWrite) return;
    const id = crypto.randomUUID();
    const optimistic = {id,board_id:board.id,created_by:profile.id,kind,payload,deleted_at:null,created_at:new Date().toISOString()};
    setItems(cur => [...cur,optimistic]); setSyncStatus('saving');
    const {error} = await supabase.from('board_items').insert({id,board_id:board.id,created_by:profile.id,kind,payload});
    if (error) { setItems(cur => cur.filter(item => item.id !== id)); setSyncStatus('error'); notify('Không lưu được: '+errText(error),'error'); }
    else setSyncStatus('saved');
  },[board.id,profile.id,canWrite,notify]);

  const patchItem = useCallback(async(item, patch) => {
    if (!editableByMe(item)) return;
    const updated = {...item,...patch};
    setItems(cur => patch.deleted_at ? cur.filter(x=>x.id!==item.id) : cur.map(x=>x.id===item.id?updated:x));
    setSyncStatus('saving');
    const {data:changed,error} = await supabase.from('board_items').update(patch).eq('id',item.id).select('id');
    if (error || !changed?.length) { notify('Không lưu được: '+(error ? errText(error) : 'Bạn không còn quyền sửa đối tượng này.'),'error');
      const {data} = await supabase.from('board_items').select('*').eq('board_id',board.id).is('deleted_at',null).order('created_at').limit(2000);
      if (data) setItems(data);
      setSyncStatus('error');
    } else setSyncStatus('saved');
  }, [board.id,editableByMe,notify]);

  const erase = useCallback(item => patchItem(item,{deleted_at:new Date().toISOString()}),[patchItem]);
  const undo = useCallback(() => {
    const mine = [...items].reverse().find(x => x.created_by === profile.id && !x.deleted_at);
    if (mine) erase(mine);
    else notify('Bạn chưa có nét vẽ nào để hoàn tác.');
  },[items,profile.id,erase,notify]);

  useEffect(() => {
    const keyHandler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) { e.preventDefault(); if (canWrite) undo(); }
      if (e.key === 'Escape') { setSelected(null); setTextDraft(null); }
    };
    window.addEventListener('keydown',keyHandler);
    return () => window.removeEventListener('keydown',keyHandler);
  },[undo,canWrite]);

  function pointerPosition() {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getRelativePointerPosition();
    return p ? {x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10} : null;
  }
  function pointerDown(e) {
    if (tool === 'select') { if (e.target === e.target.getStage()) setSelected(null); return; }
    if (tool === 'hand' || tool === 'eraser' || !canWrite || gestureRef.current) return;
    const pos = pointerPosition(); if (!pos) return;
    if (tool === 'text') { setTextDraft({x:pos.x,y:pos.y,item:null}); setTextValue(''); return; }
    const d = makeDraft(tool,pos,color,size);
    if (!d) return;
    gestureRef.current = {start:pos}; draftRef.current = d; setDraft(d);
  }
  function pointerMove() {
    if (!gestureRef.current || !draftRef.current) return;
    const pos = pointerPosition(); if (!pos) return;
    const next = extendDraft(draftRef.current,gestureRef.current.start,pos);
    draftRef.current = next; setDraft(next);
  }
  function pointerUp() {
    if (!gestureRef.current || !draftRef.current) return;
    const d = draftRef.current;
    gestureRef.current = null; draftRef.current = null; setDraft(null);
    if (['rect','ellipse','line'].includes(d.kind)) {
      const p=d.payload;
      if ((d.kind==='rect' && p.width<=2 && p.height<=2) || (d.kind==='ellipse' && p.radiusX<=1 && p.radiusY<=1) || (d.kind==='line' && Math.hypot(p.points[2],p.points[3])<2)) return;
    }
    addItem(d.kind,d.payload);
  }
  function chooseItem(item,mode) {
    if (mode==='erase') erase(item);
    else setSelected(item.id);
  }
  function editText(item) { setTextDraft({item,x:item.payload.x,y:item.payload.y}); setTextValue(item.payload.text); }
  function saveText(e) {
    e.preventDefault();
    const text = textValue.trim().slice(0,2000);
    if (text) {
      if (textDraft.item) patchItem(textDraft.item,{payload:{...textDraft.item.payload,text}});
      else addItem('text',{x:textDraft.x,y:textDraft.y,text,fontSize:22+size,color});
    }
    setTextDraft(null); setTextValue('');
  }
  function wheel(e) {
    e.evt.preventDefault();
    const stage=stageRef.current;
    const pointer=stage?.getPointerPosition(); if (!pointer) return;
    const factor=e.evt.deltaY>0?0.9:1.1;
    const next=clamp(zoom*factor,.35,3);
    setPan({x:pointer.x-(pointer.x-pan.x)*next/zoom,y:pointer.y-(pointer.y-pan.y)*next/zoom});
    setZoom(next);
  }
  function applyZoom(factor) {
    const next=clamp(zoom*factor,.35,3);
    const mid={x:dims.width/2,y:dims.height/2};
    setPan({x:mid.x-(mid.x-pan.x)*next/zoom,y:mid.y-(mid.y-pan.y)*next/zoom});
    setZoom(next);
  }
  function resetView() { setZoom(1); setPan({x:72,y:55}); }
  function exportPNG() {
    const stage=stageRef.current; if (!stage) return;
    const url=stage.toDataURL({pixelRatio:2});
    const image=new Image();
    image.onload=()=>{
      const canvas=document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
      const ctx=canvas.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0);
      const anchor=document.createElement('a'); anchor.download='EduCanvas-'+board.kind+'-'+new Date().toISOString().slice(0,10)+'.png'; anchor.href=canvas.toDataURL('image/png'); anchor.click();
      notify('Đã xuất ảnh PNG của vùng bảng đang hiển thị.','success');
    };
    image.src=url;
  }
  async function clearBoard() {
    if (!teacher) return;
    if (!window.confirm('Xóa tất cả nét vẽ trên bảng này? Không thể hoàn tác thao tác này.')) return;
    setSaving(true);
    const {error}=await supabase.from('board_items').update({deleted_at:new Date().toISOString()}).eq('board_id',board.id).is('deleted_at',null);
    setSaving(false);
    if (error) notify(errText(error),'error');
    else {setItems([]);notify('Đã xóa toàn bộ nội dung bảng.','success');}
  }

  return <div className="editor-shell">
    <div className="editor-toolbar">
      <div className="tools-group"><span className="toolbar-heading">CÔNG CỤ</span><div className="tool-buttons">{TOOLS.map(({key,label,Icon})=><button key={key} title={label} aria-label={label} aria-pressed={tool===key} disabled={!canWrite && !['select','hand'].includes(key)} className={'tool-button '+(tool===key?'chosen':'')} onClick={()=>{setTool(key);setSelected(null);}}><Icon size={19} strokeWidth={tool===key?2.4:1.85}/></button>)}</div></div>
      <div className="toolbar-divider"/>
      <div className="tools-group palette-group"><span className="toolbar-heading">MÀU SẮC</span><div className="palette">{COLORS.map(c=><button key={c} className={'color-swatch '+(color===c?'active':'')} style={{'--swatch':c}} title={'Màu '+c} aria-label={'Chọn màu '+c} aria-pressed={color===c} onClick={()=>setColor(c)}><span/></button>)}</div></div>
      <div className="toolbar-divider"/>
      <div className="tools-group brush-group"><span className="toolbar-heading">ĐỘ DÀY</span><div className="brush-control"><input type="range" aria-label="Độ dày nét vẽ" value={size} min="1" max="14" onChange={e=>setSize(Number(e.target.value))}/><span>{size}px</span></div></div>
      <div className="toolbar-spacer"/>
      <div className="toolbar-actions"><button className="subtle-action" title="Hoàn tác nét gần nhất của bạn (Ctrl+Z)" disabled={!canWrite} onClick={undo}><RotateCcw size={18}/><span>Hoàn tác</span></button><button className="subtle-action" title="Tải ảnh PNG" onClick={exportPNG}><Download size={18}/><span>Xuất PNG</span></button>{teacher&&<button className="subtle-action danger-action" title="Xóa toàn bộ nội dung bảng" disabled={saving} onClick={clearBoard}><Trash2 size={18}/></button>}</div>
    </div>
    {board.is_locked && !teacher && <div className="read-only-banner"><LockKeyhole size={16}/> Giáo viên đã khóa bảng này. Bạn vẫn có thể xem và xuất ảnh.</div>}
    <div className={'canvas-host '+(tool==='hand'?'is-panning':'')} ref={hostRef}>
      <Stage ref={stageRef} width={dims.width} height={dims.height} x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom} draggable={tool==='hand'} onDragEnd={e=>{if(e.target===e.target.getStage())setPan({x:e.target.x(),y:e.target.y()});}} onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={pointerUp}>
        <Layer>{items.map(item=><ItemShape key={item.id} item={item} selected={selected===item.id} tool={tool} canMove={editableByMe(item)} canErase={editableByMe(item)} onChoose={chooseItem} onMove={(i,pos)=>patchItem(i,{payload:{...i.payload,...pos}})} onTextEdit={editText}/>)}{draft&&<ItemShape item={{id:'draft',kind:draft.kind,payload:draft.payload}} selected={false} canMove={false} canErase={false} tool="draw" onChoose={()=>{}} onMove={()=>{}} onTextEdit={()=>{}}/>}</Layer>
      </Stage>
      {items.length===0&&syncStatus!=='loading'&&<div className="canvas-empty-hint"><div className="empty-hint-icon"><Pencil size={23}/></div><strong>Đây là bảng trắng của bạn</strong><span>Chọn công cụ và bắt đầu viết, vẽ ý tưởng!</span></div>}
      <div className="canvas-bottom-left"><span className={connected&&itemsConnected?'saved-indicator':'offline-indicator'}/><span>{syncStatus==='loading'?'Đang tải nét vẽ':syncStatus==='saving'?'Đang lưu...':syncStatus==='error'?'Lỗi lưu dữ liệu':connected&&itemsConnected?'Đã lưu & đồng bộ':'Chưa kết nối realtime'}</span><i>·</i><span>{items.length} đối tượng</span></div>
      <div className="zoom-controls"><button onClick={()=>applyZoom(1/1.2)} title="Thu nhỏ" aria-label="Thu nhỏ"><ZoomOut size={18}/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>applyZoom(1.2)} title="Phóng to" aria-label="Phóng to"><ZoomIn size={18}/></button><button onClick={resetView} title="Đặt lại khung nhìn" aria-label="Đặt lại khung nhìn"><Maximize size={17}/></button></div>
    </div>
    {textDraft&&<Modal title={textDraft.item?'Chỉnh sửa văn bản':'Thêm văn bản vào bảng'} onClose={()=>setTextDraft(null)} narrow><form className="modal-form" onSubmit={saveText}><label>Nội dung<textarea autoFocus rows={4} maxLength={2000} value={textValue} onChange={e=>setTextValue(e.target.value)} placeholder="Nhập nội dung để chèn..." required/></label><div className="modal-actions"><button type="button" className="ghost-btn" onClick={()=>setTextDraft(null)}>Hủy</button><button className="primary-btn" type="submit">{textDraft.item?'Lưu thay đổi':'Chèn văn bản'}</button></div></form></Modal>}
  </div>;
}
