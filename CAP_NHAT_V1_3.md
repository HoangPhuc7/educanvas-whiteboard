# EduCanvas v1.3 — Nhân bản, thay đổi kích thước và chỉnh màu đối tượng

## Tính năng

- Chọn công cụ **Chọn** (mũi tên), nhấn vào một đối tượng chữ, hình học, đường, mũi tên, bút hoặc bút đánh dấu.
- **Nhân bản** trên thanh **ĐÃ CHỌN** hoặc dùng **Ctrl+D** trên Windows / **Cmd+D** trên macOS (khi không nhập văn bản). Bản sao xuất hiện lệch 28px sang phải/xuống dưới và được chọn ngay.
- **Kéo các góc** của khung tím để thay đổi kích thước; giữ tỷ lệ khi kéo.
- Dùng các nút **– / +** để thu nhỏ khoảng 20% hoặc phóng to 25% đối tượng đang chọn.
- Chỉnh màu viền/nét, màu nền, kiểu tô, độ dày; bo góc của hình chữ nhật/vuông bo góc ngay sau khi chọn. Chữ vẫn chỉnh được font, cỡ, đậm/nghiêng/gạch chân, màu bằng thanh công cụ v1.2.
- Di chuyển bản sao bằng cách kéo. Nhấn Delete/Backspace hoặc nút Xóa để bỏ đối tượng đang chọn.
- Các thay đổi được lưu vào `board_items.payload` qua Supabase và nhận thay đổi qua Realtime.

## Phân quyền và an toàn dữ liệu

- **Giáo viên** được sửa/nhân bản đối tượng trên bảng có quyền chỉnh sửa.
- **Học sinh** chỉ được sửa/nhân bản đối tượng do chính mình tạo trên bảng đang mở và không bị khóa.
- Đối tượng nhân bản luôn được tạo dưới **UID người đang đăng nhập**, không lấy UID từ đối tượng gốc; tạo UUID mới và lưu bản ghi mới.
- RLS của Supabase tiếp tục kiểm tra quyền; không cần chạy lại SQL. Không xóa dữ liệu hiện có.

## Cách cập nhật website Vercel/GitHub

**Bản Patch:** Giải nén, copy tất cả các file bên trong `educanvas-whiteboard/` vào repository đang dùng, ghi đè đúng vị trí:

- `src/components/BoardEditor.jsx`
- `src/lib/itemTransforms.js` (file mới)
- `src/styles.css`
- `tests/itemTransforms.test.mjs` (file mới)
- `package.json`
- `CAP_NHAT_V1_3.md`
- `README.md`

Sau đó commit và push. Nếu Vercel đã liên kết GitHub, chờ trạng thái Deployment thành công rồi tải lại trang bằng Ctrl+F5.

**Không sửa `.env`, Supabase URL, SQL, dữ liệu hoặc tài khoản**. Bản vá không chứa `.env`.

## Kiểm tra

- `npm install`
- `npm test`
- `npm run build`
- Mở website, chọn/nhân bản một hình bo góc và một chữ. Đổi màu, kéo góc, di chuyển, tải lại trang và kiểm tra đã lưu.
- Mở 2 trình duyệt/tài khoản khác nhau để thử Realtime và quyền học sinh; phần này chỉ có thể kiểm tra sau khi triển khai và kết nối Supabase thực tế.
