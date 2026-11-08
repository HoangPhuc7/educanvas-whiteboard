# EduCanvas v1.4 — Sinh hoạt lớp số (Class Pulse)

## Tổng quan

Trong mỗi lớp học, thanh bên trái có nút **Sinh hoạt lớp** (cạnh Bảng trắng). Module mới hỗ trợ 6 vai trò:

1. Lớp trưởng
2. Lớp phó
3. Bí thư
4. Tổ 1
5. Tổ 2
6. Tổ 3

Mỗi báo cáo có đúng 3 phần: **Tình hình chung**, **Ưu điểm**, **Hạn chế & vi phạm**. Nội dung chữ lưu trong Supabase; mỗi phiếu có trạng thái chưa có nội dung / đang soạn / đã nộp. Giáo viên có thể tạo nhiều buổi sinh hoạt (theo tuần), phân công học sinh, xem toàn bộ, khóa/mở và chiếu từng báo cáo trên máy chiếu.

Học sinh có thể xem buổi sinh hoạt khi đã tham gia lớp, nhưng **chỉ học sinh được giáo viên phân công đúng phiếu mới có quyền chỉnh sửa**. Sau khi nộp, học sinh không thể tự sửa trừ khi giáo viên mở lại. Giáo viên quản lý lớp có quyền sửa mọi phiếu.

## Nâng cấp website đã tồn tại (không xóa dữ liệu)

### A. Cập nhật SQL — BẮT BUỘC, chỉ cho v1.4

Trong dự án **Supabase đang sử dụng**, vào **SQL Editor -> New query**. Sao chép toàn bộ nội dung:

`supabase/upgrade_class_meeting_v1_4.sql`

Nhấn **Run**. Script chỉ tạo thêm 2 bảng `class_meetings`, `class_meeting_reports`, các RLS, trigger và realtime; không DROP bảng cũ hoặc xóa lớp/bảng trắng/tài khoản. Có thể chạy lại nếu cần. **Không chạy lại `supabase/schema.sql`** vì đây là schema cài mới.

Nên tạo bản sao lưu database trước khi thay đổi cấu trúc trên hệ thống đang có người sử dụng.

**Lưu ý:** SQL mới dùng các hàm `public.is_room_member()` và `public.is_room_teacher()` vốn có từ phiên bản trước. Nếu báo lỗi `permission denied` khi giáo viên tạo lớp, hãy xử lý lỗi phân quyền lớp cũ riêng; SQL này không tự tắt RLS hoặc thay chính sách phòng lớp cũ.

### B. Cập nhật GitHub / Vercel

Dùng bản **Patch v1.4** và chép các file theo nguyên vị trí trong repository (ghi đè file cùng tên):

- `src/components/Classroom.jsx` — nút chuyển trang
- `src/components/ClassMeeting.jsx` — trang sinh hoạt lớp
- `src/lib/meetingUtils.js` — xử lý dữ liệu
- `src/styles.css` — giao diện responsive
- `supabase/upgrade_class_meeting_v1_4.sql` — SQL nâng cấp
- `tests/meetingUtils.test.mjs` — unit tests
- `scripts/check-project.mjs` — kiểm tra cú pháp
- `package.json` — phiên bản 1.4.0
- `CAP_NHAT_V1_4_SINH_HOAT_LOP.md` — hướng dẫn

Sau đó **Commit → Push** trên GitHub. Vercel tự deploy nếu repository đã được kết nối. Không chỉnh file `.env` hay biến môi trường Vercel, vẫn dùng dự án Supabase đang có.

### C. Chạy local trên Windows

```bash
npm install
npm run dev
```

Truy cập `http://localhost:5173`; đăng nhập giáo viên và mở lớp để thấy mục **Sinh hoạt lớp**.

## Quy trình sinh hoạt lớp gợi ý (20–25 phút)

1. **Trước giờ sinh hoạt:** Giáo viên tạo buổi mới, đặt chủ đề tuần, phân công 6 học sinh. Học sinh nhập 3 phần và chọn **Nộp báo cáo**.
2. **2 phút mở đầu:** Giáo viên mở tổng quan, cho cả lớp thấy tiến độ 6/6 báo cáo.
3. **12–15 phút báo cáo:** Bật **Trình chiếu**, báo cáo lần lượt từ lớp trưởng → lớp phó → bí thư → tổ 1, 2, 3. Có đồng hồ 2 phút cho mỗi lượt, điều hướng bằng phím ← →, Esc để thoát.
4. **5 phút thảo luận:** Chọn những vấn đề cần cải thiện và đề xuất giải pháp. Nên tập trung giải pháp thay vì nêu tên học sinh vi phạm trước tập thể.
5. **3 phút kết thúc:** Sao chép tổng hợp báo cáo làm biên bản, thống nhất mục tiêu tuần tiếp theo, giáo viên chọn **Khóa nhận báo cáo**.

## Kiểm thử sau triển khai

- Giáo viên tạo buổi sinh hoạt và nhìn thấy đúng 6 phiếu.
- Giáo viên phân công 6 người trong lớp (có thể dùng 6 tài khoản khác nhau).
- Học sinh A chỉ sửa được phiếu được phân công; học sinh B không thể sửa phiếu của A.
- Học sinh được phân công nhập 3 phần, lưu nháp và nộp; sau khi nộp không còn quyền sửa.
- Giáo viên mở lại phiếu để học sinh chỉnh sửa; các máy khác nhận thay đổi qua Supabase Realtime.
- Trình chiếu trình bày đủ 6 vị trí, đồng hồ hoạt động, ← → và Esc hoạt động trên máy tính.
- Thử trên điện thoại và kiểm tra dữ liệu sau khi tải lại trang.

## Bảo mật và quyền riêng tư

- Chỉ người đăng nhập đã thuộc lớp mới đọc được nội dung báo cáo theo RLS.
- Học sinh không được tự gán mình vào vị trí báo cáo (trigger + RLS chặn).
- Giáo viên phải cấp người phụ trách trước khi học sinh có thể nhập.
- Không lưu service role key trong website. Không tắt RLS.
- Nội dung phần “Hạn chế & vi phạm” nên ghi theo sự việc/giải pháp, không đăng công khai thông tin nhạy cảm hoặc danh tính người bị nêu trên máy chiếu.

## Tình trạng kiểm thử bản gửi

Đã chạy unit tests xử lý dữ liệu và kiểm tra cú pháp JS/JSX. Chưa chạy build Vite thực tế (môi trường không có bộ thư viện npm offline) và chưa kiểm thử trên Supabase của bạn; cần thử với 2 tài khoản thực tế sau khi deploy.
