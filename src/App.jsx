import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Code2, ExternalLink, LoaderCircle } from 'lucide-react';
import { configured, supabase, errText } from './lib/supabase.js';
import { Logo, Spinner, Toast } from './components/UI.jsx';
import Auth from './components/Auth.jsx';
import Dashboard from './components/Dashboard.jsx';
import Classroom from './components/Classroom.jsx';

function Setup() {
  return <div className="setup-page"><div className="setup-card"><Logo/><div className="setup-illustration"><Code2 size={44}/></div><h1>Chào mừng đến với EduCanvas</h1><p>Website đã sẵn sàng. Để kích hoạt đăng nhập, lớp học và đồng bộ trực tiếp, hãy kết nối một dự án Supabase.</p><div className="setup-steps"><div><b>01</b><span>Chạy file <code>supabase/schema.sql</code> trong SQL Editor của Supabase</span></div><div><b>02</b><span>Đổi <code>.env.example</code> thành <code>.env</code> rồi điền URL và publishable key</span></div><div><b>03</b><span>Khởi động lại <code>npm run dev</code> và xem <code>README.md</code> để cấp quyền giáo viên</span></div></div><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="primary-btn">Mở Supabase <ExternalLink size={17}/></a></div></div>;
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, kind='info') => setToast({ message, kind, id: Date.now() }), []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    const load = async (user) => {
      if (!mounted) return;
      setAuthUser(user || null);
      if (!user) { setProfile(null); setRoom(null); setProfileError(''); setLoading(false); return; }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!mounted) return;
      if (error) { setProfile(null); setProfileError('Không đọc được hồ sơ: ' + errText(error)); }
      else { setProfile(data); setProfileError(''); }
      setLoading(false);
    };
    supabase.auth.getSession().then(({data,error}) => {
      if (error && mounted) { setProfileError(errText(error)); setLoading(false); }
      else load(data.session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') load(session?.user || null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (!configured) return <Setup/>;
  if (loading) return <div className="app-loading"><Logo/><Spinner label="Đang khởi tạo không gian học tập..."/></div>;
  return <><div className="app-root">
    {!authUser ? <Auth notify={notify}/> : profileError ? <div className="setup-page"><div className="setup-card"><AlertCircle size={38} color="#ef5c71"/><h2>Không thể tải tài khoản</h2><p>{profileError}</p><button className="primary-btn" onClick={() => { supabase.auth.signOut(); window.location.reload(); }}>Đăng xuất & thử lại</button></div></div>
    : !profile ? <Spinner label="Đang tải hồ sơ..."/> : room ? <Classroom room={room} profile={profile} onBack={() => setRoom(null)} notify={notify}/> : <Dashboard profile={profile} onOpen={setRoom} notify={notify}/>}
  </div><Toast message={toast?.message} kind={toast?.kind} onClose={() => setToast(null)}/></>;
}
