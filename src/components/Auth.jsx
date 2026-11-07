import React, { useState } from 'react';
import { ArrowRight, Check, GraduationCap, Layers3, LockKeyhole, Mail, PenLine, UsersRound, Zap } from 'lucide-react';
import { Logo } from './UI.jsx';
import { supabase, errText } from '../lib/supabase.js';

export default function Auth({ notify }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (tab === 'register') {
        if (name.trim().length < 2) throw new Error('Họ tên cần ít nhất 2 ký tự.');
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim().slice(0, 100) }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        });
        if (authError) throw authError;
        if (!data.session) notify('Đã gửi email xác minh (nếu tài khoản hợp lệ). Kiểm tra hộp thư trước khi đăng nhập.', 'success');
        else notify('Tài khoản đã được tạo.', 'success');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  return <div className="auth-page">
    <div className="auth-showcase">
      <div className="auth-showcase-inner">
        <Logo />
        <div className="hero-copy">
          <span className="eyebrow"><span className="pulse-dot"/> NỀN TẢNG BẢNG TRẮNG CỘNG TÁC</span>
          <h1>Biến mỗi ý tưởng thành <em>kết nối.</em></h1>
          <p>Không gian sáng tạo chung cho giáo viên và học sinh. Viết, vẽ, trao đổi và cùng nhau tiến bộ — trên bất kỳ thiết bị nào.</p>
          <div className="hero-features"><span><Check size={15}/> Đồng bộ trực tiếp</span><span><Check size={15}/> Bảng riêng tư</span><span><Check size={15}/> Lưu tự động</span></div>
        </div>
        <div className="hero-preview">
          <div className="preview-top"><div className="preview-dots"><i/><i/><i/></div><span>Toán học · Lớp 10A1</span><span className="preview-live"><span/> Đang cộng tác</span></div>
          <div className="preview-sheet">
            <div className="preview-math">a² + b² = c² <span>✦</span></div>
            <svg viewBox="0 0 560 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Minh họa bảng trắng có hình học và nét vẽ">
              <defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d8d6e9"/></pattern></defs>
              <rect width="560" height="230" fill="url(#dots)"/>
              <path d="M65 179 L205 179 L205 43Z" stroke="#6253ee" strokeWidth="4" fill="#eeeaff" strokeLinejoin="round"/>
              <path d="M182 179V156H205" stroke="#6253ee" strokeWidth="2.5" fill="none"/>
              <text x="123" y="197" fontSize="14" fill="#5144b1">a</text><text x="215" y="117" fontSize="14" fill="#5144b1">b</text><text x="120" y="101" fontSize="14" fill="#5144b1">c</text>
              <path d="M282 75 C330 12 385 150 434 70 S503 86 516 44" fill="none" stroke="#ffab76" strokeWidth="5" strokeLinecap="round"/>
              <path d="M293 154 C320 113 369 186 419 149" fill="none" stroke="#55c6a6" strokeWidth="4" strokeLinecap="round"/>
              <rect x="338" y="183" rx="9" width="155" height="30" fill="#e6fbf4"/><text x="350" y="202" fill="#268b72" fontSize="12">✓ Đã lưu tự động</text>
            </svg>
            <div className="preview-cursors"><span className="cursor-pill violet">↖ Minh Anh</span><span className="cursor-pill orange">↖ Thầy Nam</span></div>
          </div>
        </div>
        <div className="auth-foot">Cùng học. Cùng vẽ. Cùng phát triển. <span>© 2026 EduCanvas</span></div>
      </div>
    </div>
    <div className="auth-right"><div className="auth-form-wrap">
      <div className="mobile-brand"><Logo /></div>
      <div className="auth-icon"><GraduationCap size={26}/></div>
      <h2>{tab === 'login' ? 'Chào mừng trở lại!' : 'Bắt đầu cùng EduCanvas'}</h2>
      <p className="auth-subtitle">{tab === 'login' ? 'Đăng nhập để tiếp tục lớp học của bạn.' : 'Tạo tài khoản học sinh chỉ trong vài bước.'}</p>
      <div className="auth-tabs"><button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError(''); }}>Đăng nhập</button><button className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError(''); }}>Đăng ký</button></div>
      <form onSubmit={submit} className="auth-form">
        {tab === 'register' && <label>Họ và tên<input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Ví dụ: Nguyễn Minh Anh" autoComplete="name"/></label>}
        <label>Địa chỉ email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ban@example.com" autoComplete="email"/></label>
        <label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Ít nhất 6 ký tự" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}/></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-btn full" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}<ArrowRight size={18}/></button>
      </form>
      <div className="auth-info"><LockKeyhole size={16}/><span>Giáo viên được quản trị viên xác minh và cấp quyền sau khi đăng ký.</span></div>
      <div className="auth-mini-features"><span><PenLine size={17}/> Vẽ tự do</span><span><UsersRound size={17}/> Cộng tác</span><span><Layers3 size={17}/> Đa bảng</span><span><Zap size={17}/> Thời gian thực</span></div>
    </div></div>
  </div>;
}
