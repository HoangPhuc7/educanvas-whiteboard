# EduCanvas v1.4.1 — Thay đổi thứ tự báo cáo

Thứ tự cố định mới: **Tổ 1 → Tổ 2 → Tổ 3 → Lớp phó → Bí thư → Lớp trưởng**.

Áp dụng nhất quán cho:
- Thứ tự 6 thẻ tại trang Sinh hoạt lớp (kể cả số thứ tự 01–06).
- Trình chiếu (nút Tiếp/Trước, phím mũi tên, dấu trang).
- Biên bản xuất bằng nút Sao chép tổng hợp.

Chỉ thay đổi thứ tự **hiển thị**. Các `role_key` của báo cáo không thay đổi; dữ liệu, người được phân công, trạng thái nộp và RLS Supabase giữ nguyên.

## Cập nhật từ v1.4

Giải nén **EduCanvas_v1.4.1_ThuTuBaoCao_Patch.zip** và chép những file trong thư mục `educanvas-whiteboard/` vào đúng vị trí trong repository GitHub đang sử dụng. Commit rồi Push; Vercel sẽ tự triển khai nếu đã kết nối.

**Không chạy SQL nào.** Không cần tạo lại buổi sinh hoạt hay database.

Kiểm tra sau khi cập nhật: vào Sinh hoạt lớp, xem 6 thẻ theo đúng thứ tự mới; bật Trình chiếu; sao chép biên bản để kiểm tra thứ tự phần báo cáo.
