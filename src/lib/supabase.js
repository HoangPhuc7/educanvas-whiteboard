import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_'));
export const supabase = configured ? createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
}) : null;

export const errText = (e) => {
  if (!e) return 'Có lỗi không xác định.';
  const message = e.message || String(e);
  if (/Invalid login credentials/i.test(message)) return 'Email hoặc mật khẩu không đúng.';
  if (/Email not confirmed/i.test(message)) return 'Hãy xác minh email trước khi đăng nhập.';
  if (/User already registered/i.test(message)) return 'Email này đã được đăng ký.';
  if (/duplicate key/i.test(message)) return 'Dữ liệu đã tồn tại. Vui lòng thử lại.';
  if (/permission denied|row-level security|violates row-level security/i.test(message)) return 'Bạn không có quyền thực hiện thao tác này.';
  return message;
};
