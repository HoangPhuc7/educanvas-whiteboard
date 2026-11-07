# Chuyển website NétChung sang EduCanvas (giữ nguyên dữ liệu Supabase)

Đây là phiên bản **đổi tên thương hiệu** của mã nguồn NétChung trước đó. Chỉ đổi chuỗi hiển thị, logo, favicon, tên gói npm, tên thư mục dự án và tài liệu triển khai. **Không thay đổi schema, tên bảng, ID, chính sách RLS, biến môi trường, câu lệnh Supabase hay logic đọc/ghi dữ liệu**.

## 1. Sao lưu mã nguồn và bảo toàn Supabase

- Nếu dùng bản cũ, sao lưu nguyên thư mục `netchung-whiteboard` (đặc biệt là file `.env`, nếu đã tạo) trước khi chuyển đổi.
- **Không chạy lại** `supabase/schema.sql`, **không xóa** bảng và **không tạo** Supabase project mới nếu SQL đã chạy thành công. Dùng chính project cũ.
- Chỉ dùng Project URL và Supabase publishable/anon key ở frontend; **không** đưa Supabase secret/service-role key vào Vite hoặc GitHub.

## 2. Chuyển file `.env` cũ

Sau khi giải nén, mở hai thư mục cũ và mới. Sao chép file `.env` từ `netchung-whiteboard` sang thư mục `educanvas-whiteboard`. Trên Windows cần bật Explorer → View → Show → File name extensions/Hidden items nếu không thấy file `.env`.

Nếu chưa có `.env`, sao chép `.env.example` thành `.env`, rồi nhập hai biến:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_KEY
```

**Tên biến không đổi** so với bản cũ. Giữ nguyên hai giá trị kết nối nếu database đang hoạt động.

## 3. Chạy website EduCanvas

Trong thư mục mới chạy:

```powershell
npm install
npm run dev
```

Mở `http://localhost:5173`, đăng nhập với **tài khoản cũ**; lớp học và các bảng cũ phải được hiển thị. Đăng ký mới không cần thiết.

Nếu bạn đang chạy terminal của bản cũ, tắt bằng `Ctrl+C` trước để tránh Vite tự chọn cổng 5174.

## 4. Những file được thay đổi

- `src/components/UI.jsx`: logo chữ E và tên EduCanvas.
- `public/favicon.svg`: biểu tượng chữ E cho tab trình duyệt.
- `index.html`: thẻ `<title>`, description.
- `src/components/Auth.jsx`, `Dashboard.jsx`, `App.jsx`: nội dung hiển thị.
- `src/components/BoardEditor.jsx`: tên file PNG khi tải về.
- `package.json`: tên package `educanvas-whiteboard`.
- `START_WINDOWS.bat`, `README.md`, `LICENSE`: tên thương hiệu và tài liệu.

**Không đổi** `supabase/schema.sql`, `src/lib/supabase.js`, `.env.example`, cũng như lược đồ và dữ liệu thực tế đã tạo trên Supabase.

## 5. GitHub: giữ repository cũ hoặc đổi repository mới

Nếu bạn **chưa đưa lên GitHub**, tạo repo mới `educanvas-whiteboard` rồi push project mới, theo README.

Nếu bạn **đã đưa mã nguồn cũ lên GitHub**, có thể giữ repo đang dùng (chỉ update mã nguồn), hoặc đổi tên repo trong GitHub → repository → **Settings → General → Repository name** thành `educanvas-whiteboard`. Sau đó, nếu thư mục local đang có `.git`, chỉnh remote:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/educanvas-whiteboard.git
git add .
git commit -m "Rebrand NétChung to EduCanvas"
git push origin main
```

Nếu bạn giải nén project mới không có thư mục `.git`, `git init` và thêm remote như README. **Không xóa repository cũ khi chưa sao lưu mã nguồn**.

## 6. Đã deploy? Cập nhật đường dẫn nhưng giữ nguyên Supabase

- **Vercel:** Build và deploy lại từ source mới; để giữ URL cũ, tiếp tục dùng Vercel project hiện tại. Nếu muốn đổi tên project/domain trên Vercel, thêm URL mới vào Supabase Authentication → URL Configuration.
- **GitHub Pages:** Nếu repo đổi `netchung-whiteboard` thành `educanvas-whiteboard`, URL sẽ thành `https://YOUR_USERNAME.github.io/educanvas-whiteboard/`. GitHub Actions tự xác định `VITE_BASE_PATH` theo tên repo. Cập nhật **Site URL** (nếu dùng làm web chính) và **Redirect URLs** trong Supabase Authentication → URL Configuration. Thêm URL mới trước khi gỡ URL cũ; giữ URL localhost cho phát triển.
- **Biến môi trường Vercel/GitHub Actions:** vẫn là `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, không cần tạo key mới.

## 7. Kiểm tra sau khi đổi tên

1. Tiêu đề tab là `EduCanvas — Bảng trắng lớp học` và favicon chữ E.
2. Trang đăng nhập, menu lớp học hiển thị tên mới.
3. Đăng nhập bằng **tài khoản Supabase cũ**; vai trò giáo viên vẫn đúng.
4. Danh sách lớp và các bảng vẽ đã tạo trước đây vẫn hiện.
5. Mở 2 trình duyệt hoặc 2 tài khoản để kiểm tra đồng bộ.
6. Xuất bảng PNG để xác nhận tên file mới.

Nếu dữ liệu không hiện sau khi đổi, trước hết kiểm tra `.env` của bản mới có **đúng URL/key của Supabase project cũ** hay không. Không chạy SQL lại để chữa lỗi hiển thị.
