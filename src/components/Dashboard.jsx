import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, Clipboard, GraduationCap, Hash, LogOut, Plus, RefreshCw, School, Sparkles, UsersRound } from 'lucide-react';
import { supabase, errText } from '../lib/supabase.js';
import { Initials, Logo, Modal, Spinner } from './UI.jsx';

const COLORS = ['class-purple', 'class-sky', 'class-orange', 'class-green', 'class-pink'];

export default function Dashboard({ profile, notify, onOpen }) {
  const teacher = profile.role === 'teacher';
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(window.location.search).get('join') || '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = teacher
      ? await supabase.from('rooms').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false })
      : await supabase.from('room_members').select('room_id, rooms(id,name,join_code,teacher_id,created_at)').eq('user_id', profile.id);
    if (error) notify(errText(error), 'error');
    else setRooms(teacher ? (data || []) : (data || []).map(x => x.rooms).filter(Boolean));
    setLoading(false);
  }, [teacher, profile.id, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  async function createRoom(e) {
    e.preventDefault();
    if (roomName.trim().length < 2) return notify('Tên lớp cần ít nhất 2 ký tự.', 'error');
    setBusy(true);
    const { data, error } = await supabase.from('rooms').insert({ name: roomName.trim().slice(0,100), teacher_id: profile.id }).select().single();
    setBusy(false);
    if (error) return notify(errText(error), 'error');
    setModal(false); setRoomName(''); notify('Đã tạo lớp học và bảng chung!', 'success'); onOpen(data);
  }
  async function joinRoom(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('join_room_by_code', { p_code: joinCode.trim().toUpperCase() });
    setBusy(false);
    if (error) return notify(errText(error), 'error');
    const { data: room, error: roomErr } = await supabase.from('rooms').select('*').eq('id', data).single();
    if (roomErr) return notify(errText(roomErr), 'error');
    notify('Đã tham gia lớp học!', 'success'); setJoinCode(''); window.history.replaceState({}, '', window.location.pathname); onOpen(room);
  }
  async function copyCode(code) {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1800); }
    catch { notify('Không thể sao chép tự động. Mã lớp: ' + code, 'info'); }
  }

  return <div className="dashboard-shell">
    <aside className="dash-sidebar">
      <Logo />
      <div className="dash-menu-label">KHÔNG GIAN CỦA BẠN</div>
      <button className="dash-side-link active"><BookOpen size={19}/> Lớp học của tôi</button>
      <div className="dash-sidebar-bottom"><div className="sidebar-person"><Initials name={profile.full_name}/><div><strong>{profile.full_name}</strong><small>{teacher ? 'Giáo viên' : 'Học sinh'}</small></div></div><button className="dash-side-link" onClick={() => supabase.auth.signOut()}><LogOut size={18}/> Đăng xuất</button></div>
    </aside>
    <main className="dash-main">
      <header className="dash-header"><div className="dash-breadcrumb"><span>Không gian học tập</span><ChevronRight size={16}/><strong>Tổng quan</strong></div><div className="dash-header-user"><span className={'role-tag ' + (teacher ? 'teacher' : '')}>{teacher ? 'GIÁO VIÊN' : 'HỌC SINH'}</span><Initials name={profile.full_name}/></div></header>
      <div className="dash-content">
        <div className="dash-welcome"><div><span className="section-kicker"><Sparkles size={15}/> BẮT ĐẦU MỘT NGÀY HỌC MỚI</span><h1>Xin chào, {profile.full_name.split(' ').slice(-1)[0]} <span className="wave">✦</span></h1><p>{teacher ? 'Tạo lớp học, chia sẻ bảng trắng và theo dõi quá trình học tập.' : 'Tham gia lớp của thầy cô và cùng nhau biến ý tưởng thành hình ảnh.'}</p></div><div className="welcome-decor"><GraduationCap size={64}/></div></div>
        <div className="stats-row"><div className="stat-card"><span className="stat-icon purple"><School size={21}/></span><div><strong>{rooms.length}</strong><small>{teacher ? 'Lớp đang quản lý' : 'Lớp đã tham gia'}</small></div></div><div className="stat-card"><span className="stat-icon mint"><UsersRound size={21}/></span><div><strong>2 chế độ</strong><small>Bảng chung & cá nhân</small></div></div><div className="stat-card"><span className="stat-icon orange"><RefreshCw size={21}/></span><div><strong>Trực tiếp</strong><small>Đồng bộ mọi thay đổi</small></div></div></div>
        <div className="content-title"><div><h2>Lớp học của tôi</h2><p>{teacher ? 'Các lớp mà bạn đang phụ trách' : 'Các lớp bạn có quyền truy cập'}</p></div>{teacher && <button className="primary-btn" onClick={() => setModal(true)}><Plus size={18}/> Tạo lớp mới</button>}</div>
        {!teacher && <form className="join-panel" onSubmit={joinRoom}><div className="join-emblem"><Hash size={25}/></div><div><strong>Tham gia một lớp học</strong><p>Nhập mã 8 ký tự được giáo viên cung cấp</p></div><div className="join-actions"><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="VD: A8F23C90" maxLength={8} aria-label="Mã lớp" required/><button className="primary-btn" disabled={busy}>{busy ? 'Đang vào...' : 'Tham gia'}<ArrowRight size={17}/></button></div></form>}
        {loading ? <Spinner label="Đang tải lớp học"/> : rooms.length ? <div className="class-grid">{rooms.map((room, index) => <div className="class-card" key={room.id}><div className={'class-art ' + COLORS[index % COLORS.length]}><div className="art-circle one"/><div className="art-circle two"/><BookOpen size={50} strokeWidth={1.35}/><span className="class-number">LỚP {String(index + 1).padStart(2,'0')}</span></div><div className="class-info"><h3>{room.name}</h3><div className="class-meta"><CalendarDays size={15}/> {new Date(room.created_at).toLocaleDateString('vi-VN')} <span>·</span><span>{teacher ? 'Bạn là giáo viên' : 'Thành viên'}</span></div><div className="class-footer"><button className="class-code" title="Sao chép mã lớp" onClick={() => copyCode(room.join_code)}>{copied === room.join_code ? <Check size={14}/> : <Clipboard size={14}/>} {room.join_code}</button><button className="open-class" onClick={() => onOpen(room)}>Mở lớp <ArrowRight size={17}/></button></div></div></div>)}</div> : <div className="empty-classes"><div className="empty-illustration"><School size={47}/></div><h3>Chưa có lớp học nào</h3><p>{teacher ? 'Tạo lớp đầu tiên để mời học sinh cùng học.' : 'Nhập mã lớp phía trên để bắt đầu học cùng thầy cô.'}</p>{teacher && <button className="primary-btn" onClick={() => setModal(true)}><Plus size={18}/> Tạo lớp đầu tiên</button>}</div>}
        <div className="dash-footer">EduCanvas © 2026 <span>•</span> Không gian học tập sáng tạo</div>
      </div>
    </main>
    {modal && <Modal title="Tạo lớp học mới" onClose={() => setModal(false)} narrow><form onSubmit={createRoom} className="modal-form"><p>Một bảng chung sẽ được tạo tự động. Học sinh tham gia sẽ có thêm bảng cá nhân.</p><label>Tên lớp học<input autoFocus required minLength={2} maxLength={100} value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Ví dụ: Tin học 10A1"/></label><div className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setModal(false)}>Hủy</button><button className="primary-btn" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo lớp'}<ArrowRight size={17}/></button></div></form></Modal>}
  </div>;
}
