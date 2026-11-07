import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronDown, Clipboard, GraduationCap, Hash, LayoutGrid, Lock, Menu, Unlock, UsersRound, X } from 'lucide-react';
import { supabase, errText } from '../lib/supabase.js';
import { Initials, Logo, Spinner } from './UI.jsx';
import BoardEditor from './BoardEditor.jsx';

export default function Classroom({ room, profile, onBack, notify }) {
  const teacher = profile.role === 'teacher';
  const [boards, setBoards] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadBoards = useCallback(async () => {
    const { data, error } = await supabase.from('boards').select('*').eq('room_id', room.id).order('created_at');
    if (error) notify(errText(error), 'error');
    else {
      const sorted = (data || []).sort((a,b) => (a.kind === 'shared' ? -1 : b.kind === 'shared' ? 1 : 0));
      setBoards(sorted);
      setSelectedId(cur => sorted.some(b => b.id === cur) ? cur : (sorted.find(b => b.kind === 'shared')?.id || sorted[0]?.id || null));
    }
    setLoading(false);
  }, [room.id, notify]);

  const loadStudents = useCallback(async () => {
    if (!teacher) return;
    const { data, error } = await supabase.from('room_members').select('user_id').eq('room_id', room.id);
    if (error || !data?.length) { setStudents({}); return; }
    const ids = data.map(x => x.user_id);
    const { data: ps } = await supabase.from('profiles').select('id,full_name').in('id', ids);
    setStudents(Object.fromEntries((ps || []).map(p => [p.id, p.full_name])));
  }, [teacher, room.id]);

  useEffect(() => {
    loadBoards(); loadStudents();
    const channel = supabase.channel('classroom-' + room.id)
      .on('postgres_changes', { event:'*', schema:'public', table:'boards', filter:'room_id=eq.' + room.id }, () => loadBoards())
      .on('postgres_changes', { event:'*', schema:'public', table:'room_members', filter:'room_id=eq.' + room.id }, () => loadStudents())
      .subscribe(status => setConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [room.id, loadBoards, loadStudents]);

  const board = useMemo(() => boards.find(b => b.id === selectedId), [boards, selectedId]);

  async function toggleLock() {
    if (!board || !teacher) return;
    const { data: changed, error } = await supabase.from('boards').update({is_locked: !board.is_locked}).eq('id', board.id).select('id');
    if (error || !changed?.length) notify(errText(error || new Error('Bạn không còn quyền thay đổi bảng.')), 'error');
    else { notify(!board.is_locked ? 'Đã khóa chỉnh sửa của học sinh.' : 'Đã mở khóa bảng.', 'success'); loadBoards(); }
  }
  async function copyInvite() {
    try { await navigator.clipboard.writeText(room.join_code); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { notify('Mã lớp: ' + room.join_code, 'info'); }
  }
  function selectBoard(id) { setSelectedId(id); setSidebarOpen(false); }

  return <div className="classroom-shell">
    <aside className={'class-sidebar ' + (sidebarOpen ? 'mobile-open' : '')}>
      <div className="class-brand"><Logo/><button className="icon-btn mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Ẩn danh sách bảng"><X size={19}/></button></div>
      <button className="back-overview" onClick={onBack}><ArrowLeft size={17}/> Về danh sách lớp</button>
      <div className="class-room-info"><div className="mini-caption">LỚP HỌC HIỆN TẠI</div><h2>{room.name}</h2><button className="invite-code" onClick={copyInvite} title="Sao chép mã lớp"><Hash size={15}/>{room.join_code}{copied ? <Check size={15}/> : <Clipboard size={15}/>}</button></div>
      <div className="class-boards-caption"><span>DANH SÁCH BẢNG</span><span>{boards.length}</span></div>
      {loading ? <Spinner label="Đang tải bảng..."/> : <nav className="board-nav">
        {boards.filter(b => b.kind === 'shared').map(b => <button key={b.id} className={'board-nav-item ' + (b.id === selectedId ? 'selected' : '')} onClick={() => selectBoard(b.id)}><span className="nav-board-icon shared"><UsersRound size={19}/></span><span><strong>Bảng chung</strong><small>Mọi thành viên trong lớp</small></span>{b.is_locked && <Lock size={14} className="nav-lock"/>}</button>)}
        <div className="nav-separator"/><div className="board-list-label"><span>BẢNG CÁ NHÂN</span><span>{boards.filter(b => b.kind === 'private').length}</span></div>
        {boards.filter(b => b.kind === 'private').map(b => <button key={b.id} className={'board-nav-item ' + (b.id === selectedId ? 'selected' : '')} onClick={() => selectBoard(b.id)}><span className="nav-board-icon private"><Initials name={teacher ? students[b.owner_id] || b.title.replace('Bảng của ','') : profile.full_name} size="sm"/></span><span><strong>{b.owner_id === profile.id ? 'Bảng của tôi' : students[b.owner_id] || b.title.replace('Bảng của ','')}</strong><small>{b.owner_id === profile.id ? 'Chỉ bạn và giáo viên' : 'Bảng của học sinh'}</small></span>{b.is_locked && <Lock size={14} className="nav-lock"/>}</button>)}
        {!boards.some(b => b.kind === 'private') && <p className="nav-empty">{teacher ? 'Bảng cá nhân xuất hiện khi học sinh tham gia lớp.' : 'Đang tạo bảng cá nhân...'}</p>}
      </nav>}
      <div className="class-sidebar-footer"><div className="connection-note"><span className={connected ? 'online-dot' : 'offline-dot'}/>{connected ? 'Đã kết nối thời gian thực' : 'Đang kết nối...'}</div><div className="sidebar-person"><Initials name={profile.full_name}/><div><strong>{profile.full_name}</strong><small>{teacher ? 'Giáo viên' : 'Học sinh'}</small></div></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"/>}
    <main className="class-workspace">
      <header className="class-topbar"><div className="topbar-left"><button className="icon-btn mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Mở danh sách bảng"><Menu size={22}/></button><span className="topbar-name">{room.name}</span><span className="topbar-slash">/</span><strong>{board ? board.kind === 'shared' ? 'Bảng chung' : board.owner_id === profile.id ? 'Bảng của tôi' : students[board.owner_id] || board.title : 'Đang tải...'}</strong></div><div className="topbar-right"><span className={'topbar-status ' + (connected ? 'connected' : '')}><span/>{connected ? 'Đang đồng bộ' : 'Mất kết nối'}</span>{teacher && board && <button className={'lock-action ' + (board.is_locked ? 'locked' : '')} onClick={toggleLock}>{board.is_locked ? <Lock size={16}/> : <Unlock size={16}/>}<span>{board.is_locked ? 'Mở khóa' : 'Khóa bảng'}</span></button>}<Initials name={profile.full_name}/></div></header>
      {board ? <BoardEditor key={board.id} board={board} room={room} profile={profile} notify={notify} connected={connected}/> : <div className="editor-loading"><Spinner label="Đang chuẩn bị bảng trắng..."/></div>}
    </main>
  </div>;
}
