# EduCanvas — Bảng trắng cộng tác dành cho lớp học

> **Đang nâng cấp từ NétChung?** Nếu bạn đã chạy `supabase/schema.sql` thành công, KHÔNG chạy lại SQL và KHÔNG tạo project Supabase mới. Sao chép file `.env` cũ sang bản EduCanvas, giữ nguyên Supabase URL/publishable key. Xem [`DOI_TEN_TU_NETCHUNG.md`](DOI_TEN_TU_NETCHUNG.md) để chuyển đổi an toàn.

Website bảng trắng **tiếng Việt, responsive**, dành cho **giáo viên** và **học sinh**, sử dụng **React + Vite + Konva + Supabase**. Toàn bộ source có thể tải lên GitHub và chạy trên Vercel hoặc GitHub Pages.

> Dự án tự phát triển phục vụ học tập, **không phải mã nguồn của Nuxoboard** và không có liên kết chính thức với Nuxoboard.

## 1. Chức năng đã triển khai

| Vai trò | Quyền hạn |
| --- | --- |
| Giáo viên | Tạo lớp, nhận mã lớp 8 ký tự, xem bảng chung và **toàn bộ bảng cá nhân**, viết/vẽ/sửa/xóa vật thể, khóa/mở bảng, xóa toàn bộ bảng |
| Học sinh | Đăng ký/đăng nhập, nhập mã lớp, xem/vẽ trên bảng chung, có **một bảng cá nhân trong mỗi lớp**, di chuyển hoặc xóa vật thể do chính mình tạo, xem bảng khi bị khóa |
| Cả hai | Vẽ bút/tô sáng, đoạn thẳng, hình chữ nhật, hình elip, chèn/sửa chữ, chọn/di chuyển vật thể, tẩy, hoàn tác nét của mình, phóng/thu và kéo canvas, xuất PNG vùng đang xem |

**Đồng bộ:** Supabase Auth (đăng nhập), Postgres (lưu trữ), Realtime Postgres Changes (tự hiện thay đổi trên trình duyệt khác), Row Level Security (RLS) để bảo vệ dữ liệu ở database. Các nét vẽ được lưu thành JSON trong `board_items`. Giao diện bố cục phù hợp desktop, tablet, smartphone.

## 2. Yêu cầu

- Node.js **20.19+** hoặc 22 trở lên, npm.
- Tài khoản [Supabase](https://supabase.com/) và dự án Supabase mới.
- GitHub và tùy chọn Vercel nếu triển khai công khai.

## 3. Chạy trên máy tính

**Windows:** Có thể nhấp đúp `START_WINDOWS.bat` để tạo file `.env` lần đầu và chạy web ở lần tiếp theo. Vẫn cần cấu hình Supabase theo mục bên dưới.

```bash
# 1. Giải nén thư mục project
cd educanvas-whiteboard

# 2. Cài thư viện
npm install

# 3. Tạo file cấu hình
cp .env.example .env
# Trên Windows CMD: copy .env.example .env

# 4. Chỉnh .env bằng URL / publishable key của dự án Supabase
# 5. Sau khi thực hiện bước thiết lập database dưới đây:
npm run dev
```

Mở **http://localhost:5173**. Lệnh `npm run build` tạo thư mục `dist` sẵn sàng triển khai.

### 3a. Thiết lập Supabase (BẮT BUỘC)

1. Tạo project Supabase tại [dashboard](https://supabase.com/dashboard).
2. Trong **SQL Editor**, copy toàn bộ nội dung `supabase/schema.sql` và chọn **Run**. Nên chạy **một lần trên dự án mới**, không chạy trùng toàn bộ file; file có `CREATE TABLE`/`CREATE POLICY`.
3. Trong **Project Settings → API Keys** (tên mục có thể thay đổi), tìm **Project URL** và **Publishable key** (`sb_publishable_...`) hoặc **anon key** của dự án.
4. Điền vào `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_key
```

5. Trong **Authentication → URL Configuration**, đặt **Site URL** thành `http://localhost:5173` trong quá trình phát triển, thêm URL triển khai chính thức vào **Redirect URLs** sau khi xuất bản (ví dụ `https://your-project.vercel.app/**` hoặc `https://<username>.github.io/<repo>/**`).
6. Trong **Authentication → Providers → Email**, bật Email/password; bạn có thể giữ **Confirm email** để người dùng xác minh email. Hãy bảo đảm cấu hình email/redirect hoạt động.
7. Kiểm tra trong **Database → Publications → supabase_realtime** có `board_items`, `boards`, `room_members`. Schema đã thêm vào publication nếu tồn tại.

**BẢO MẬT:** Chỉ đặt **publishable/anon key** trong `VITE_SUPABASE_ANON_KEY`. Tuyệt đối **không** đưa `service_role`, `secret key`, mật khẩu DB hoặc access token quản trị vào frontend, file `.env` đẩy GitHub, hoặc GitHub Pages. Các key frontend không bí mật theo thiết kế; RLS mới là lớp bảo vệ quyền dữ liệu.

### 3b. Cấp quyền giáo viên (BẮT BUỘC)

Tài khoản đăng ký từ website luôn là **học sinh** mặc định để tránh tự ý nhận vai trò giáo viên.

1. Đăng ký tài khoản bằng email để làm giáo viên; xác minh email nếu được yêu cầu.
2. Đăng nhập Supabase Dashboard → **SQL Editor** với quyền **chủ dự án** và chạy lệnh **thay email**:

```sql
update public.profiles
set role = 'teacher'
where id = (select id from auth.users where email = 'giaovien@example.com');
```

3. Giáo viên **đăng xuất và đăng nhập lại** để tải lại vai trò.
4. Học sinh đăng ký tài khoản thông thường, sau đó được giáo viên cung cấp mã lớp 8 ký tự.

Không có nút công khai để tự nâng quyền. Nếu có nhiều giáo viên, chủ dự án lặp lại thao tác này hoặc phát triển thêm dashboard quản trị máy chủ.

## 4. Sử dụng nhanh

1. Giáo viên tạo lớp tên **Tin học 10A1**. Bảng chung tự tạo, màn hình hiển thị mã lớp.
2. Học sinh đăng nhập trên thiết bị hoặc cửa sổ riêng, nhập mã lớp vào ô **Tham gia**. Hệ thống tự tạo bảng cá nhân cho học sinh lần đầu tham gia.
3. Giáo viên thấy **Bảng chung** và danh sách **Bảng cá nhân** của học sinh. Học sinh chỉ thấy bảng chung và bảng của chính mình.
4. Hai bên mở cùng bảng chung để cùng viết/vẽ, thay đổi của người này xuất hiện trên thiết bị người kia sau khi lưu và phát sự kiện Realtime.
5. Giáo viên dùng **Khóa bảng** để không cho học sinh chỉnh sửa, rồi mở lại khi cần.
6. Chọn **Xuất PNG** để tải ảnh phần bảng hiện có trên màn hình.

**Công cụ:** Bút, bút đánh dấu, tẩy, nét thẳng, hình chữ nhật, hình elip, văn bản, chọn/kéo đối tượng và bàn tay di chuyển khung nhìn. Cuộn chuột trên canvas để phóng to/thu nhỏ; chạm các nút zoom trên điện thoại; `Ctrl+Z`/`Cmd+Z` để hoàn tác đối tượng gần nhất do bạn tạo. Double-click/double-tap vào đối tượng văn bản khi đang dùng công cụ chọn để sửa chữ.

## 5. Đưa source lên GitHub

Tạo **repository trống** trên GitHub, ví dụ `educanvas-whiteboard`, rồi chạy trong thư mục project:

```bash
git init
git add .
git commit -m "Initial EduCanvas collaborative whiteboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/educanvas-whiteboard.git
git push -u origin main
```

Nhớ thay `YOUR_USERNAME`. **Không commit file `.env`** (đã có trong `.gitignore`). Có thể mở terminal trong VS Code để chạy các lệnh trên.

### Cách A — Triển khai qua Vercel (khuyến nghị)

1. Truy cập [vercel.com/new](https://vercel.com/new), chọn **Import Git Repository**, chọn repository vừa tạo.
2. Framework Vite được nhận diện tự động. Build command `npm run build`, Output directory `dist`.
3. Vào **Environment Variables** thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` đúng giá trị Supabase.
4. Deploy. Thêm URL Vercel vào **Supabase → Authentication → URL Configuration → Redirect URLs**, cập nhật **Site URL** nếu đây là web chính.
5. Thử đăng nhập, tạo lớp và mở hai trình duyệt để kiểm tra đồng bộ.

### Cách B — Triển khai GitHub Pages (không cần Vercel)

Dự án có sẵn GitHub Actions `.github/workflows/deploy-pages.yml`:

1. Trên GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**. Tạo hai secret `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (giá trị lấy từ Supabase).
2. Vào **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions**.
3. Push vào nhánh `main` hoặc mở tab **Actions → Publish GitHub Pages → Run workflow**.
4. Website tại `https://YOUR_USERNAME.github.io/educanvas-whiteboard/`. Tên repository thực tế được dùng để tạo đường dẫn `VITE_BASE_PATH`.
5. Thêm URL GitHub Pages vào cấu hình Redirect URLs trong Supabase (ví dụ `https://YOUR_USERNAME.github.io/educanvas-whiteboard/**`).

> GitHub Pages chỉ host **giao diện tĩnh**. Postgres, xác thực, dữ liệu và realtime vẫn nằm trên Supabase. Không chạy backend bằng GitHub Pages riêng lẻ.

## 6. Kiểm tra phân quyền & đồng bộ

| Trường hợp | Kỳ vọng |
| --- | --- |
| Học sinh A và B vào cùng lớp | Cả hai nhìn thấy **bảng chung** |
| Học sinh A tạo nét trên bảng chung | B và giáo viên thấy nét mới mà không cần tải lại trang |
| Học sinh A vào bảng cá nhân | Chỉ A và giáo viên được đọc/chỉnh sửa; B không thấy bảng này |
| Học sinh B tìm truy cập `board_items` của bảng A từ client | Bị RLS từ chối hoặc không trả dữ liệu |
| A xóa nét của B ở bảng chung | RLS không cho UPDATE, nét B vẫn còn |
| Giáo viên khóa bảng | Học sinh không được thêm/sửa/xóa nét, kể cả gọi API trực tiếp |
| Người dùng đổi profile metadata để tự lên giáo viên | Không thể tự sửa `profiles.role` qua client |
| Hai trình duyệt tải lại trang | Dữ liệu đã ghi vẫn còn trong Postgres |

## 7. Cấu trúc thư mục

```text
educanvas-whiteboard/
├── .env.example
├── .github/workflows/deploy-pages.yml
├── .gitignore
├── START_WINDOWS.bat
├── index.html
├── package.json
├── public/favicon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   ├── lib/supabase.js
│   └── components/
│       ├── Auth.jsx
│       ├── Dashboard.jsx
│       ├── Classroom.jsx
│       ├── BoardEditor.jsx
│       └── UI.jsx
├── supabase/schema.sql
├── vercel.json
└── vite.config.js
```

### Lược đồ database

- `profiles`: hồ sơ, role `student`/`teacher`.
- `rooms`: thông tin lớp học, giáo viên chủ lớp, mã mời.
- `room_members`: học sinh tham gia lớp.
- `boards`: bảng `shared` hoặc `private` thuộc về một học sinh.
- `board_items`: đối tượng vẽ, tác giả, JSON thuộc tính, trạng thái xóa mềm.
- `join_room_by_code`: RPC kiểm tra mã, ghi membership và tạo bảng cá nhân một cách an toàn.

Database tự tạo hồ sơ khi đăng ký, tự tạo bảng chung khi tạo lớp. **RLS** kiểm soát SELECT/INSERT/UPDATE; khóa bảng được thực thi ở DB. Bảng cá nhân không bị lộ khi nhập trực tiếp UUID.

## 8. Giới hạn của phiên bản 1.0

- Đây là **MVP hoạt động có backend**, không phải bản sao đầy đủ Nuxoboard: **chưa có tải PDF/PowerPoint, chat, gọi video, AI, bảng điều khiển quản trị giáo viên, hình ảnh upload, hệ thống bài tập hay lịch sử phiên bản nâng cao**.
- Mỗi nét được gửi khi **kết thúc thao tác vẽ**. Không phát từng chuyển động con trỏ trực tiếp trong thời gian vẽ. Hai người cùng cập nhật **một** vật thể gần như đồng thời sẽ theo cơ chế **lần ghi cuối cùng thắng**; các nét vẽ độc lập vẫn được cộng tác.
- Bảng hiện tải tối đa **2.000 đối tượng còn hoạt động** cho mỗi lần mở bảng; nên phân trang/tách buổi học nếu quy mô lớn. Hãy nâng cấp sang Supabase Broadcast hoặc cơ chế cộng tác CRDT (Yjs) nếu có lớp rất đông hoặc muốn hiển thị nét bút đang vẽ trong từng frame.
- Xuất PNG **chỉ vùng đang hiển thị**, không xuất toàn bộ canvas vô hạn.
- Chế độ chỉ đọc/khóa vẫn cho phép xem và xuất nội dung. Giáo viên được sửa đối tượng của mọi người; học sinh chỉ sửa nét của mình.
- Hosting/database có thể phát sinh giới hạn và chi phí theo gói của các nhà cung cấp.

## 9. Lưu ý kiểm thử

Chạy `npm run build` trên máy có internet sau `npm install`. Bản mã nguồn kèm SQL và cấu hình, không bao gồm tài khoản Supabase, keys hoặc dữ liệu thật. Để xác nhận đồng bộ và quyền truy cập **end-to-end**, bạn cần tạo project Supabase và thử với ít nhất 3 tài khoản (giáo viên, học sinh A, học sinh B).

## Tham khảo tài liệu chính thức

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [React Konva](https://github.com/konvajs/react-konva)

**Giấy phép:** MIT (xem `LICENSE`).
"# educanvas-whiteboard" 
