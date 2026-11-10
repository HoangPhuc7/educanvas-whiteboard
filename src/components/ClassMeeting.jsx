import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardCopy, Clock3, Edit3, Eye, Flag, GraduationCap,
  Lock, MessageSquareText, Mic2, Plus, Presentation, RefreshCw, Save, Send,
  ShieldCheck, Sparkles, Target, TrendingUp, UserRound, Users, X
} from 'lucide-react';
import { supabase, errText } from '../lib/supabase.js';
import { Spinner } from './UI.jsx';
import { MEETING_ROLES, formatMeetingPlainText, countMeetingProgress, safeMeetingText } from '../lib/meetingUtils.js';

const FIELDS = [
  { key: 'general', title: '01 · Tình hình chung', icon: MessageSquareText, placeholder: 'Tình hình học tập, nền nếp, hoạt động chung trong tuần...' },
  { key: 'strengths', title: '02 · Ưu điểm', icon: Award, placeholder: 'Những tiến bộ, việc làm tốt, hoạt động đáng ghi nhận...' },
  { key: 'limitations', title: '03 · Hạn chế & vi phạm', icon: Flag, placeholder: 'Những vấn đề cần cải thiện và hướng khắc phục; tránh nêu thông tin nhạy cảm...' }
];
const emptyForm = { general: '', strengths: '', limitations: '' };
const niceDate = (date) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);

function SectionDisplay({ title, icon: Icon, value, empty, tone }) {
  return <section className={'meeting-report-section ' + (tone || '')}>
    <h4><Icon size={17}/>{title}</h4>
    {value?.trim() ? <p>{value}</p> : <p className="meeting-placeholder">{empty || 'Chưa có nội dung.'}</p>}
  </section>;
}

export default function ClassMeeting({ room, profile, notify }) {
  const isTeacher = profile.role === 'teacher' && room.teacher_id === profile.id;
  const [meetings, setMeetings] = useState([]);
  const [meetingId, setMeetingId] = useState('');
  const [reports, setReports] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('Sinh hoạt tuần ' + niceDate(new Date()));
  const [theme, setTheme] = useState('Lắng nghe · Ghi nhận · Cùng tiến bộ');
  const [busy, setBusy] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [editRevision, setEditRevision] = useState(null);
  const [stage, setStage] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [seconds, setSeconds] = useState(120);
  const [running, setRunning] = useState(false);
  const [realtime, setRealtime] = useState(false);

  const fetchMeetings = useCallback(async () => {
    const { data, error } = await supabase.from('class_meetings')
      .select('*').eq('room_id', room.id).order('created_at', { ascending: false });
    if (error) notify('Không đọc được sinh hoạt lớp. Bạn đã chạy SQL nâng cấp v1.4 chưa? ' + errText(error), 'error');
    else {
      const list = data || [];
      setMeetings(list);
      setMeetingId(cur => list.some(x => x.id === cur) ? cur : (list[0]?.id || ''));
    }
    setLoading(false);
  }, [room.id, notify]);

  const fetchReports = useCallback(async () => {
    if (!meetingId) { setReports([]); return; }
    const { data, error } = await supabase.from('class_meeting_reports')
      .select('*').eq('meeting_id', meetingId);
    if (error) notify(errText(error), 'error');
    else setReports(data || []);
  }, [meetingId, notify]);

  useEffect(() => {
    fetchMeetings();
    const sub = supabase.channel('meeting-index-' + room.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_meetings', filter: 'room_id=eq.' + room.id }, fetchMeetings)
      .subscribe(status => setRealtime(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(sub); };
  }, [room.id, fetchMeetings]);

  useEffect(() => {
    if (!meetingId) return;
    fetchReports();
    const sub = supabase.channel('meeting-reports-' + meetingId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_meeting_reports', filter: 'meeting_id=eq.' + meetingId }, fetchReports)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [meetingId, fetchReports]);

  useEffect(() => {
    if (!isTeacher) return;
    const loadMembers = async () => {
      const { data, error } = await supabase.from('room_members').select('user_id').eq('room_id', room.id);
      if (error || !data?.length) { setMembers([]); return; }
      const { data: ps, error: profileError } = await supabase.from('profiles').select('id,full_name').in('id', data.map(m => m.user_id));
      if (profileError) notify(errText(profileError), 'error');
      setMembers((ps || []).sort((a,b) => a.full_name.localeCompare(b.full_name, 'vi')));
    };
    loadMembers();
    const sub = supabase.channel('meeting-members-' + room.id)
      .on('postgres_changes', { event:'*', schema:'public', table:'room_members', filter:'room_id=eq.' + room.id }, loadMembers)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [isTeacher, room.id, notify]);

  const meeting = meetings.find(m => m.id === meetingId);
  const byKey = useMemo(() => Object.fromEntries(reports.map(r => [r.role_key, r])), [reports]);
  const progress = countMeetingProgress(reports);
  const report = selectedRole ? byKey[selectedRole] : null;
  const role = MEETING_ROLES.find(r => r.key === selectedRole);
  const canEdit = Boolean(report && (isTeacher || (meeting?.status === 'open' && report.assigned_to === profile.id && !report.submitted_at)));
  const editedName = report ? (members.find(m => m.id === report.assigned_to)?.full_name || (report.assigned_to === profile.id ? profile.full_name : 'Chưa phân công')) : '';

  useEffect(() => {
    if (!report || dirty) return;
    setForm({ general: report.general || '', strengths: report.strengths || '', limitations: report.limitations || '' });
    setEditRevision(report.updated_at);
  }, [report?.id, report?.updated_at, dirty]);

  useEffect(() => {
    if (!stage || !running) return;
    const timer = setInterval(() => setSeconds(s => {
      if (s <= 1) { setRunning(false); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [stage, running]);

  useEffect(() => {
    if (!stage) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setStage(false);
      else if (e.key === 'ArrowRight') setStageIndex(i => Math.min(MEETING_ROLES.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setStageIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage]);

  const setStagePage = (index) => { setStageIndex(index); setSeconds(120); setRunning(false); };
  const openEditor = (key) => {
    if (dirty && !window.confirm('Bạn có nội dung chưa lưu. Rời báo cáo hiện tại?')) return;
    setDirty(false); setSelectedRole(key);
    const found = byKey[key];
    setEditRevision(found?.updated_at || null);
    setForm({ general: found?.general || '', strengths: found?.strengths || '', limitations: found?.limitations || '' });
  };
  const closeEditor = () => {
    if (dirty && !window.confirm('Nội dung chưa lưu sẽ bị mất. Bạn muốn đóng?')) return;
    setDirty(false); setSelectedRole(null);
  };

  const createMeeting = async (e) => {
    e.preventDefault();
    if (!isTeacher || title.trim().length < 2) return;
    setBusy(true);
    const { data, error } = await supabase.from('class_meetings')
      .insert({ room_id: room.id, created_by: profile.id, title: title.trim().slice(0, 100), theme: theme.trim().slice(0, 180) })
      .select('id').single();
    setBusy(false);
    if (error) return notify('Tạo buổi sinh hoạt thất bại: ' + errText(error), 'error');
    setCreating(false); setMeetingId(data.id);
    await fetchMeetings();
    notify('Đã tạo buổi sinh hoạt cùng 6 phiếu báo cáo.', 'success');
  };

  const assign = async (key, userId) => {
    const item = byKey[key];
    if (!isTeacher || !item) return;
    const { data, error } = await supabase.from('class_meeting_reports')
      .update({ assigned_to: userId || null }).eq('id', item.id).select().single();
    if (error) notify('Không phân công được: ' + errText(error), 'error');
    else { setReports(prev => prev.map(r => r.id === data.id ? data : r)); notify('Đã cập nhật người phụ trách.', 'success'); }
  };

  const save = async (submit = false) => {
    if (!canEdit || busy) return;
    if (submit && FIELDS.some(f => !form[f.key].trim())) return notify('Bạn cần điền đủ 3 mục trước khi nộp. Nếu không có vi phạm, hãy ghi “Không có”.', 'error');
    if (submit && !window.confirm('Nộp báo cáo? Sau khi nộp, học sinh không thể tự chỉnh sửa nữa.')) return;
    setBusy(true);
    const payload = {
      general: safeMeetingText(form.general), strengths: safeMeetingText(form.strengths),
      limitations: safeMeetingText(form.limitations), ...(submit ? { submitted_at: new Date().toISOString() } : {})
    };
    const { data, error } = await supabase.from('class_meeting_reports').update(payload)
      .eq('id', report.id).eq('updated_at', editRevision || report.updated_at).select().maybeSingle();
    setBusy(false);
    if (error) return notify('Không thể lưu: ' + errText(error), 'error');
    if (!data) return notify('Báo cáo đã được thay đổi ở thiết bị khác hoặc bạn không còn quyền sửa. Hãy sao chép phần vừa nhập, đóng phiếu rồi mở lại trước khi lưu.', 'error');
    setEditRevision(data.updated_at);
    setReports(prev => prev.map(r => r.id === data.id ? data : r));
    setDirty(false);
    notify(submit ? 'Đã nộp báo cáo cho giáo viên!' : 'Đã lưu báo cáo.', 'success');
    if (submit) setSelectedRole(null);
  };

  const reopen = async (item) => {
    if (!isTeacher) return;
    const { data, error } = await supabase.from('class_meeting_reports').update({ submitted_at: null })
      .eq('id', item.id).select().single();
    if (error) return notify(errText(error), 'error');
    setReports(prev => prev.map(r => r.id === data.id ? data : r));
    notify('Đã mở lại báo cáo.', 'success');
  };
  const toggleStatus = async () => {
    if (!isTeacher || !meeting) return;
    const status = meeting.status === 'closed' ? 'open' : 'closed';
    const { error } = await supabase.from('class_meetings').update({ status }).eq('id', meeting.id);
    if (error) notify(errText(error), 'error');
    else { await fetchMeetings(); notify(status === 'closed' ? 'Đã khóa buổi sinh hoạt.' : 'Đã mở lại buổi sinh hoạt.', 'success'); }
  };
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatMeetingPlainText(meeting, byKey));
      notify('Đã sao chép biên bản tổng hợp 6 báo cáo.', 'success');
    } catch { notify('Không thể sao chép từ trình duyệt này.', 'error'); }
  };

  if (loading) return <div className="meeting-wait"><Spinner label="Đang tải buổi sinh hoạt lớp..."/></div>;

  return <div className="meeting-page">
    <div className="meeting-container">
      <header className="meeting-hero">
        <div className="meeting-hero-glow one"/><div className="meeting-hero-glow two"/>
        <div className="meeting-hero-inner">
          <div className="meeting-kicker"><Sparkles size={15}/> EDUCANVAS · CLASS PULSE</div>
          <div className="meeting-hero-heading"><div><h1>Sinh hoạt lớp <em>thế hệ mới.</em></h1><p>6 góc nhìn, 1 tiếng nói chung. Cùng nhìn lại một tuần học và xây dựng tuần tiếp theo.</p></div><div className="meeting-hero-icon"><GraduationCap size={55}/></div></div>
          <div className="meeting-hero-bottom"><span><CalendarDays size={15}/>{room.name}</span><span><span className={'meeting-live-dot ' + (realtime ? 'on' : '')}/>{realtime ? 'Đang đồng bộ' : 'Đang kết nối'}</span><span><ShieldCheck size={15}/> Chỉ thành viên lớp</span></div>
        </div>
      </header>

      <div className="meeting-toolbar">
        <div className="meeting-picker"><span>BUỔI SINH HOẠT</span><select value={meetingId} onChange={e => { setMeetingId(e.target.value); setSelectedRole(null); setDirty(false); }} aria-label="Chọn buổi sinh hoạt">
          {!meetings.length && <option value="">Chưa có buổi sinh hoạt</option>}
          {meetings.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select></div>
        <div className="meeting-toolbar-actions">
          {isTeacher && <button className="meeting-button subtle" onClick={() => setCreating(s => !s)}><Plus size={17}/> Buổi mới</button>}
          {meeting && <><button className="meeting-button subtle" onClick={copySummary}><ClipboardCopy size={17}/> <span>Sao chép tổng hợp</span></button><button className="meeting-button prominent" onClick={() => { setStage(true); setStagePage(0); }}><Presentation size={17}/> Trình chiếu</button></>}
        </div>
      </div>

      {creating && isTeacher && <form className="meeting-create" onSubmit={createMeeting}>
        <div><label htmlFor="meeting-title">Tên buổi sinh hoạt</label><input id="meeting-title" maxLength={100} value={title} onChange={e => setTitle(e.target.value)} required minLength={2}/></div>
        <div><label htmlFor="meeting-theme">Thông điệp tuần</label><input id="meeting-theme" maxLength={180} value={theme} onChange={e => setTheme(e.target.value)}/></div>
        <button type="submit" className="meeting-button prominent" disabled={busy}>Tạo 6 phiếu <ChevronRight size={16}/></button>
      </form>}

      {!meeting && !creating && <div className="meeting-empty"><div className="meeting-empty-icon"><Presentation size={38}/></div><h2>Khởi động buổi sinh hoạt đầu tiên</h2><p>{isTeacher ? 'Tạo một buổi sinh hoạt, phân công 6 vị trí báo cáo và mời các bạn chuẩn bị nội dung.' : 'Giáo viên chưa tạo buổi sinh hoạt. Bạn có thể quay lại bảng trắng trong lúc chờ.'}</p>{isTeacher && <button className="meeting-button prominent" onClick={() => setCreating(true)}><Plus size={17}/> Tạo buổi sinh hoạt</button>}</div>}

      {meeting && <>
        <section className="meeting-overview">
          <div className="meeting-overview-title"><div><div className="meeting-mini-label">TỔNG QUAN BUỔI SINH HOẠT</div><h2>{meeting.title}</h2><p><Sparkles size={16}/>{meeting.theme || 'Lắng nghe · Ghi nhận · Cùng tiến bộ'}</p></div><div className="meeting-progress-box"><div className="meeting-progress-ring" style={{'--meeting-value': `${progress.submitted / 6 * 100}%`}}><span>{progress.submitted}<small>/ 6</small></span></div><div><strong>Đã nộp</strong><small>{progress.assigned} / 6 người được phân công</small></div></div></div>
          <div className="meeting-metrics">
            <div><span className="meeting-metric-icon violet"><Users size={19}/></span><strong>06</strong><small>Vị trí báo cáo</small></div>
            <div><span className="meeting-metric-icon blue"><Edit3 size={19}/></span><strong>{progress.filled}</strong><small>Đã có nội dung</small></div>
            <div><span className="meeting-metric-icon mint"><CheckCircle2 size={19}/></span><strong>{progress.submitted}</strong><small>Đã hoàn thành</small></div>
            <div><span className="meeting-metric-icon orange"><Target size={19}/></span><strong>{6 - progress.submitted}</strong><small>Cần hoàn tất</small></div>
          </div>
        </section>

        <div className="meeting-section-header"><div><div className="meeting-mini-label">BẢNG TỔNG KẾT</div><h2>Sáu góc nhìn về lớp chúng ta</h2><p>Chọn một bảng để xem chi tiết hoặc điền nội dung được phân công.</p></div>{isTeacher && <button className="meeting-button subtle" onClick={toggleStatus}>{meeting.status === 'closed' ? <RefreshCw size={16}/> : <Lock size={16}/>} {meeting.status === 'closed' ? 'Mở lại nhập báo cáo' : 'Khóa nhận báo cáo'}</button>}</div>
        {meeting.status === 'closed' && <div className="meeting-status-note"><Lock size={16}/> Buổi sinh hoạt đã chốt nội dung. Giáo viên có thể mở lại khi cần chỉnh sửa.</div>}
        <div className="meeting-role-grid">
          {MEETING_ROLES.map((r,index) => {
            const item = byKey[r.key];
            const hasText = Boolean(item && (item.general.trim() || item.strengths.trim() || item.limitations.trim()));
            const own = item?.assigned_to === profile.id;
            const assigned = item?.assigned_to ? (members.find(m=>m.id===item.assigned_to)?.full_name || (own ? profile.full_name : 'Đã phân công')) : 'Chưa phân công';
            const roleIcons = { team_1: Users, team_2: Users, team_3: Users, vice_leader: TrendingUp, secretary: Mic2, class_leader: ShieldCheck };
            const Icon = roleIcons[r.key];
            return <article key={r.key} className={'meeting-role-card ' + r.theme}>
              <div className="meeting-card-top"><div className="meeting-card-role-icon"><Icon size={23}/></div><span className={'meeting-card-status ' + (item?.submitted_at ? 'done' : hasText ? 'draft' : 'idle')}>{item?.submitted_at ? 'Đã nộp' : hasText ? 'Đang soạn' : 'Chưa có nội dung'}</span></div>
              <div className="meeting-card-index">{String(index + 1).padStart(2,'0')} / 06</div>
              <h3>{r.label}</h3>
              <p className="meeting-role-subtitle">{r.caption}</p>
              <div className="meeting-card-snippet">{item?.general?.trim() ? item.general : '3 phần nội dung đang chờ được cập nhật...'}</div>
              {isTeacher && <label className="meeting-assign">Người phụ trách<select value={item?.assigned_to || ''} onChange={e => assign(r.key, e.target.value)} disabled={!item} aria-label={'Phân công ' + r.label}><option value="">— Chọn học sinh —</option>{members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>}
              {!isTeacher && <div className="meeting-assignee"><UserRound size={14}/> {own ? 'Bạn được phân công' : assigned}</div>}
              <button className="meeting-card-open" onClick={() => openEditor(r.key)}><span>{isTeacher || own ? 'Xem / chỉnh sửa' : 'Xem báo cáo'}</span><ChevronRight size={18}/></button>
            </article>;
          })}
        </div>
        <div className="meeting-bottom-bar"><div><Sparkles size={18}/><span><b>Mỗi ý kiến đều có giá trị.</b> Cùng ghi nhận điều tốt, nói về điều cần cải thiện và đề xuất giải pháp tích cực.</span></div><button onClick={()=>{setStage(true);setStagePage(0);}}>Bắt đầu tổng kết <ChevronRight size={17}/></button></div>
      </>}
    </div>

    {report && role && <div className="meeting-drawer-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) closeEditor(); }}>
      <aside className="meeting-drawer" role="dialog" aria-modal="true" aria-label={'Báo cáo ' + role.label}>
        <div className="meeting-drawer-head"><div><span className="meeting-mini-label">PHIẾU BÁO CÁO</span><h2>{role.label}</h2><small>{editedName}</small></div><button className="meeting-square-button" aria-label="Đóng phiếu báo cáo" onClick={closeEditor}><X size={20}/></button></div>
        <div className="meeting-drawer-scroll">
          {FIELDS.map((field,index) => { const Icon = field.icon; return <div key={field.key} className="meeting-field"><label htmlFor={'meeting-' + field.key}><span className={'meeting-field-icon field-' + index}><Icon size={17}/></span>{field.title}</label>{canEdit ? <><textarea id={'meeting-' + field.key} value={form[field.key]} onChange={e => { setForm(f=>({...f,[field.key]:e.target.value}));setDirty(true); }} rows={5} maxLength={4000} placeholder={field.placeholder}/><span className="meeting-count">{form[field.key].length} / 4000</span></> : <div className="meeting-read-value">{report[field.key]?.trim() || 'Chưa có nội dung.'}</div>}</div>; })}
          {!canEdit && <div className="meeting-readonly"><Eye size={17}/>{report.submitted_at ? 'Báo cáo đã nộp.' : 'Bạn có thể xem báo cáo; chỉ người được phân công hoặc giáo viên được chỉnh sửa.'}</div>}
          {isTeacher && report.submitted_at && <button className="meeting-button subtle" onClick={() => reopen(report)}><RefreshCw size={16}/> Mở lại báo cáo này</button>}
        </div>
        <div className="meeting-drawer-footer">{canEdit ? <><span>{dirty ? '● Nội dung chưa lưu' : '✓ Đã đồng bộ'}</span><div><button className="meeting-button subtle" onClick={()=>save(false)} disabled={busy}><Save size={16}/> Lưu nháp</button>{!report.submitted_at && <button className="meeting-button prominent" onClick={()=>save(true)} disabled={busy}><Send size={16}/> Nộp báo cáo</button>}</div></> : <button className="meeting-button subtle" onClick={closeEditor}>Đóng</button>}</div>
      </aside>
    </div>}

    {stage && meeting && <div className="meeting-stage" role="dialog" aria-modal="true" aria-label="Chế độ trình chiếu sinh hoạt lớp">
      <div className="meeting-stage-nav"><span><Presentation size={20}/> ED<span>U</span>CANVAS · LIVE REPORT</span><div><span>{meeting.title}</span><button onClick={()=>setStage(false)} title="Thoát trình chiếu"><X size={22}/></button></div></div>
      {(() => {
        const r = MEETING_ROLES[stageIndex];
        const item = byKey[r.key];
        return <div className="meeting-slide">
          <div className="meeting-slide-kicker">BÁO CÁO {String(stageIndex+1).padStart(2,'0')} / 06 <span/> {room.name}</div>
          <h1>{r.label}</h1><p className="meeting-slide-caption">{r.caption}</p>
          <div className="meeting-slide-columns">{FIELDS.map((f,i) => { const Icon=f.icon;return <section key={f.key} className={'meeting-slide-section slide-'+i}><div><Icon size={23}/><h2>{f.title.slice(5)}</h2></div><p>{item?.[f.key]?.trim() || 'Chưa có nội dung báo cáo.'}</p></section>;})}</div>
          <div className="meeting-slide-footer"><span><Sparkles size={16}/> Lắng nghe để cùng tiến bộ</span><div className="meeting-stage-clock"><Clock3 size={17}/><span>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</span><button onClick={()=>setRunning(s=>!s)}>{running?'Tạm dừng':'Bắt đầu'}</button><button onClick={()=>{setSeconds(120);setRunning(false);}}>Đặt lại</button></div></div>
        </div>;
      })()}
      <footer className="meeting-stage-controls"><button onClick={()=>setStagePage(Math.max(0,stageIndex-1))} disabled={stageIndex===0}><ChevronLeft size={19}/> Trước</button><div>{MEETING_ROLES.map((r,i)=><button key={r.key} onClick={()=>setStagePage(i)} aria-label={'Báo cáo ' + r.label} className={i===stageIndex?'selected':''}/>)}</div><button onClick={()=>stageIndex===MEETING_ROLES.length-1?setStage(false):setStagePage(stageIndex+1)}>{stageIndex===MEETING_ROLES.length-1?'Kết thúc':'Tiếp'} <ChevronRight size={19}/></button></footer>
    </div>}


  </div>;
}
