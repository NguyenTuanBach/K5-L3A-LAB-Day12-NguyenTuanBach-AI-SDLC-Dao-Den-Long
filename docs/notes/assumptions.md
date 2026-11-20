# Giả định và quyết định cần chốt

Ngày 2026-11-20. Nguồn lab gốc nằm ở sáu file Markdown tại root; nguồn Phase 1 hiện là bản người dùng gửi trong chat.

| Mã | Nội dung | Trạng thái / tác động |
|---|---|---|
| A01 | Dùng một bộ spec/plan/tasks riêng cho mỗi phase | Áp dụng cho tổ chức tài liệu; không làm trước ticket chưa phát hành |
| A02 | Thông số trong spec Phase 1 là đề xuất người dùng, không lấy từ file contract có sẵn | Chưa duyệt; đặc biệt 180 giây và pulse tốn 2 |
| A03 | Core độc lập phần hiển thị, dùng chung với headless | Định hướng thiết kế theo GUIDE; engine chưa chọn |
| A04 | Schema/tên cờ CLI chính xác chưa biết | Cần contract gốc trước khi tạo adapter và game.contract.json |
| A05 | Thông số đảo, spawn, nhảy, điều khiển và xử lý đồng thời còn thiếu | Nếu PRD không quy định thì tự chọn, ghi lý do và test |
| A06 | Artifact cần đăng nhập để đọc dữ liệu | Orca đã mở nhưng hiển thị yêu cầu Sign in; chưa xác minh PRD/contract |

Khi đổi quyết định: ghi ngày, nguồn yêu cầu mới, luật cũ → luật mới và danh sách test/tài liệu cần cập nhật. Chưa có quyết định kỹ thuật hoặc tuning nào được ghi là đã nghiệm thu.

## Chốt baseline khi triển khai Phase 1

2026-11-20: người dùng yêu cầu tự hoàn thành Phase 1 và cho full access. Đã đọc
PRD-0/contract nguyên văn sau đăng nhập; nguồn docs/requirements/phase-1-source.ax.txt.
A02/A04/A06 ở bảng trên là trạng thái lịch sử trước khi lấy được nguồn.

Giữ bảng tuning đề xuất của người dùng làm baseline theo quyền chọn thông số của PRD;
180 giây/pulse2 không phải con số bắt buộc của giảng viên. Giá trị runtime chỉ trong
game.contract.json. Đảo28m, đèn16m, jump7/gravity18, spawn48/3 theo seed, max60/7.
Nạp/pulse trước contact, all_lit→no_flames→dawn. Vùng an toàn chặn địch; overlap dùng
union projection đã có regression. Chặn rìa, hit_drop_ratio0; không event fall.
Validation từ chối unknown fields và enum/range/type sai; dash boolean nhận nhưng
Phase 1 không có dash. Terminal scenario đánh giá ở bước đầu, tick0 không phát event.
Không có giờ bắt đầu lab chính thức trong phiên, nên không tuyên bố tag đúng deadline.

## Phase 4 (Ticket-04 / contract 1.3) — giả định tự chọn, chưa được giảng viên xác nhận
- A4-01 Phân vị 95 dùng nearest-rank: phần tử thứ ceil(0.95·N) của dt sắp tăng. Ticket không nêu phương pháp nội suy.
- A4-02 "Đêm thứ i dùng seed 7 + i": i chạy từ 1 đến --nights (Đêm đầu dùng seed 8).
- A4-03 Hướng input ngẫu nhiên của soak: góc đều trong [0, 2π), mỗi 30 tick; xác suất nhảy/lướt/tỏa sáng/tương tác là mức "giữ phím" mỗi tick (edge được core tự suy ra).
- A4-04 "Chạy tới khi kết thúc hoặc hết thời lượng chuẩn": chạy đến khi core báo won/lost (core luôn kết thúc ở 240/270/300 s).
- A4-05 mem_start_mb đo sau 30 Đêm khởi động JIT bỏ đi (chưa gc) để tránh đo trạng thái "chưa biên dịch"; mem_end_mb đo sau gc cuối. 400 Đêm cho đường cong phẳng (không rò rỉ), xem docs/notes/decisions.md.
- A4-06 Bench trên web: RSS = tổng bộ nhớ mọi tiến trình của cây trình duyệt (có chia sẻ trang nên số lớn hơn RSS thực). load_ms tính từ lúc spawn trình duyệt đến khung hình bench đầu tiên.
- A4-07 Cảnh bench: Vogel spiral xoay theo seed; Bóng Mực không đặt trong vùng an toàn của L1–L3 (+0,5 m) để không bị đẩy ra ngay tick đầu; camera t=0 tại lúc khung hình bench đầu tiên.
- A4-08 vsync_off = true khi cờ tắt vsync/giới hạn khung hình được truyền; trình duyệt không cho đọc lại trạng thái này. avg_fps vượt tần số quét màn hình là bằng chứng gián tiếp (máy này 240 FPS).
- A4-09 Tên bảng xếp hạng chỉ ASCII [A-Za-z0-9_] đúng ticket; chưa hỗ trợ tiếng Việt có dấu (điểm cộng, không bắt buộc).
- A4-10 score trên bảng = tổng điểm các Đêm đã thắng trong lượt chiến dịch hiện tại (không cộng điểm Đêm vừa thua); mỗi kết quả (thua hoặc thắng Đêm 3) lưu tối đa một lần.
- A4-11 achieved_at do máy chủ gắn (giờ địa phương có độ lệch múi giờ) để người chơi không tự khai.
- A4-12 Game không có rung camera nên "tắt rung camera" không có tác dụng riêng; "giảm chuyển động" tắt chớp màn hình, nhấp nháy đèn/đếm ngược và hoạt ảnh CSS, và mặc định theo `prefers-reduced-motion`.
- A4-13 Bản chạy trong Release là thư mục web tĩnh (`dist`) + hướng dẫn Docker; bảng xếp hạng trên host tĩnh dùng localStorage, trên `npm start` dùng đĩa (data/leaderboard.json, đặt thư mục bằng DAO_DATA_DIR).
