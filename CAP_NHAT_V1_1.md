# Cập nhật EduCanvas 1.1 — tô màu, hình học và tẩy nâng cao

**Dành cho project EduCanvas đã upload lên GitHub và kết nối Supabase.**

## Những điểm mới

- **Tô màu đầy đủ:** Hình mới mặc định **Tô kín + viền**; có chế độ **Chỉ tô kín** hoặc **Chỉ viền**.
- **Màu tự chọn:** 16 màu mẫu, chọn bất kỳ màu nào bằng color picker; có thể dùng riêng màu viền và màu tô, điều chỉnh độ đậm của màu tô.
- **13 công cụ hình học:** Đoạn thẳng, mũi tên, chữ nhật, chữ nhật bo góc, vuông, vuông bo góc, elip, tròn, tam giác, thoi, ngũ giác, lục giác, ngôi sao.
- **Bo góc linh hoạt:** Chỉnh bán kính bo góc 4–80 px trước khi vẽ.
- **Hai chế độ tẩy:** **Quét xóa cả đối tượng** (kéo qua nhiều đối tượng để xóa) và **Tẩy chi tiết nét bút** (xóa một phần đường bút/tô sáng, phần còn lại được giữ lại). Đối với hình học và chữ, chế độ chi tiết vẫn xóa toàn bộ đối tượng khi chạm.
- **Chỉnh màu sau khi vẽ:** Chọn một đối tượng, chọn màu/kiểu tô và nhấn **Đổi màu hình đang chọn**.
- Bảng trắng giữ nguyên cơ chế lưu JSON, quyền giáo viên/học sinh và đồng bộ Supabase.

## Cập nhật website đã có trên GitHub — không mất dữ liệu

1. **Không chạy lại** file `supabase/schema.sql`, không xóa database và không tạo project Supabase khác.
2. Tải `EduCanvas_Whiteboard_v1.1_Complete.zip`, giải nén. Bạn có thể dùng GitHub Desktop để cập nhật:
   - GitHub Desktop → **File → Clone repository** → chọn repo EduCanvas hiện tại.
   - Sao chép **toàn bộ nội dung bên trong** thư mục `educanvas-whiteboard` của ZIP vào thư mục repository vừa clone, chọn **Replace/Overwrite**.
   - **Không sao chép** file `.env` (ZIP không chứa file này), không commit `.env`, `node_modules` hoặc `dist`.
   - GitHub Desktop → kiểm tra danh sách file thay đổi → viết commit `Nang cap bo cong cu ve v1.1` → **Commit to main** → **Push origin**.
   - Nếu dùng Vercel kết nối GitHub, Vercel thường tự triển khai lại khi có commit mới trên nhánh production.
3. Nếu deploy thủ công, chạy `npm install`, `npm run test` và `npm run build` trên máy có Node.js 20.19+ rồi deploy `dist` theo quy trình cũ.
4. **Giữ nguyên** biến Vercel `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. Giữ nguyên domain website để học sinh dùng link cũ.
5. Trong website, nhấn Ctrl+F5 sau khi deploy. Vẽ thử **chữ nhật bo góc**, **chọn màu tùy ý**, và hai chế độ tẩy. Mở tab/trình duyệt thứ hai để kiểm tra đồng bộ.

## Bản vá nhỏ nếu chỉ muốn thay file thay vì cả project

`EduCanvas_Whiteboard_v1.1_Patch.zip` chỉ chứa những file đã đổi/thêm:

- `src/components/BoardEditor.jsx` — UI và cơ chế vẽ.
- `src/lib/boardGeometry.js` — xử lý tẩy chính xác và hình học.
- `src/styles.css` — giao diện thanh công cụ responsive.
- `package.json` — cập nhật số phiên bản, lệnh test.
- `tests/boardGeometry.test.mjs` — 8 phép thử tự động.

Chép các file đúng đường dẫn tương ứng trong repo; **không xóa các file còn lại**.

## Ghi chú kỹ thuật

- Không yêu cầu thay đổi lược đồ SQL. Các hình mới được lưu dưới loại hiện có (`rect`, `ellipse`, `line`), kèm tên hình trong `payload.shape`; vì vậy vẫn thỏa điều kiện `board_items.kind` cũ.
- Các hình vẽ từ phiên bản cũ giữ nguyên kiểu viền trước đó. Hình mới mặc định tô kín; nếu muốn tô một hình cũ, chọn nó rồi nhấn **Đổi màu hình đang chọn**.
- Tẩy chi tiết chỉ tác động trên các nét `pen` / `highlighter` được phép chỉnh. Các mảnh nét được lưu ở `payload.segments`. Nét quá dài có thể gặp giới hạn 64 KB JSON mỗi đối tượng; hệ thống sẽ báo lỗi và tải lại dữ liệu đã lưu nếu ghi thất bại.
- Chế độ tẩy tuân thủ quyền hạn cũ: giáo viên có thể tẩy nội dung trong bảng của lớp; học sinh chỉ tẩy các đối tượng do mình tạo trên bảng được phép chỉnh. Không cần mở quyền RLS.
- Đối với thao tác tẩy trên cùng một nét ở nhiều thiết bị **cùng thời điểm**, bản này dùng cơ chế ghi sau ghi đè; chưa có thuật toán CRDT để hợp nhất các phép biến đổi đồng thời.

## Tình trạng kiểm tra

- Bộ test `node --test tests/boardGeometry.test.mjs` chạy **8/8**.
- Cú pháp mã JavaScript/JSX đã được kiểm tra bằng TypeScript parser.
- Chưa kiểm thử build Vite trên container này do npm install không hoàn tất trong môi trường chạy; hãy chạy `npm install && npm run build` sau khi giải nén trên máy Windows hoặc theo dõi build log trên Vercel.
- Chưa thực hiện kiểm thử đa tài khoản trên Supabase thực tế.
