# EduCanvas v1.2 — Bộ định dạng văn bản

## Thay đổi mới

- Chọn kích thước chữ bất kỳ từ **8 đến 160 px**.
- 7 font chữ: Be Vietnam Pro, Arial, Verdana, Tahoma, Georgia, Times New Roman, Courier New.
- Chữ **đậm**, *nghiêng*, <u>gạch chân</u>, ~~gạch ngang~~; có thể kết hợp.
- Căn trái, căn giữa, căn phải; tùy chỉnh độ rộng hộp chữ, giãn dòng và giãn ký tự.
- Chọn màu chữ tự do.
- Thanh công cụ định dạng xuất hiện khi chọn **Chữ** hoặc dùng **Mũi tên** chọn đối tượng chữ đã tạo.
- Nhấp đúp vào chữ để mở hộp thoại chỉnh sửa nội dung và định dạng cùng lúc.
- Toàn bộ định dạng lưu vào `board_items.payload` nên có thể đồng bộ với Supabase, không cần thay đổi cấu trúc SQL.
- Chữ từ phiên bản cũ vẫn hiển thị với định dạng mặc định và chiều rộng tự nhiên.

> Định dạng áp dụng cho **toàn bộ một hộp chữ**; chưa hỗ trợ mỗi đoạn hoặc từng từ một kiểu riêng trong cùng hộp.

## Cập nhật project đang chạy trên GitHub và Vercel

1. Tải `EduCanvas_Whiteboard_v1.2_Patch.zip`, giải nén.
2. Trong thư mục repository `educanvas-whiteboard` đã clone từ GitHub, chép đè các file trong patch, giữ nguyên đường dẫn.
3. `git add . && git commit -m "Add rich text formatting v1.2" && git push` hoặc GitHub Desktop → Commit → Push.
4. Vercel tự triển khai khi repository được kết nối và push đúng nhánh Production.
5. Hard refresh website (Ctrl + F5), thử nhập chữ mới / chọn chữ cũ và thay đổi định dạng.

**Không xóa database, không chạy lại SQL, không chỉnh .env / khóa Supabase.**

## Kiểm tra trước khi dùng với học sinh

- Tạo một chữ mới, đổi font và cỡ 40 px, bật đậm/nghiêng/gạch chân.
- Chọn **Mũi tên**, chọn chữ vừa tạo, thay căn giữa / màu chữ / cỡ chữ.
- Nhấp đúp vào chữ, thay nội dung, lưu, tải lại trang.
- Mở cùng bảng bằng tài khoản khác đã có quyền truy cập và xác minh định dạng được đồng bộ.

## Hạn chế

- Không hỗ trợ định dạng từng ký tự hoặc một phần trong cùng hộp chữ (rich text spans).
- Font chữ trên thiết bị thiếu font tương ứng sẽ hiển thị bằng font thay thế của trình duyệt.
- Hãy kiểm tra log build Vercel và kiểm thử đồng bộ nhiều người dùng thật trước khi dùng chính thức.
