# Feature Specification: Dawn Release — Ticket-04 (Bình minh: phát hành v1.0.0)

**Directory**: specs/004-dawn-release · **Created**: 2026-11-20 · **Status**: Implemented (xem verification.md)
**Input**: Ticket-04 / Test Contract 1.3 do người dùng dán từ lab board; bản lưu nguyên văn ở docs/requirements/phase-4-source.txt.
**Phạm vi**: Non-functional + Release. Luật chơi, số liệu và đầu ra headless của contract 1.0–1.2 KHÔNG đổi.

## User Story 1 — Đo hiệu năng bằng cảnh chuẩn (P1)
Giảng viên chạy `bench_cmd --seed 42 --duration 30 --out bench.json` và so số đo giữa các bài.
Acceptance:
- Cửa sổ 1280×720, không toàn màn hình, tắt vsync/giới hạn khung hình khi trình duyệt cho phép (cờ `--disable-gpu-vsync --disable-frame-rate-limit`).
- Đêm 1 đủ hiệu ứng/ánh sáng; đúng 200 Bóng Mực `wander` rải đều (seed 42), đúng 100 đom đóm, L1–L3 sáng fuel 100.
- Tắt: sinh thêm, sát thương, nhặt đom đóm, hao dầu, kết thúc Đêm. Bóng Mực vẫn di chuyển theo luật wander. Mây đứng yên (0,0,0).
- Camera quay quanh (0,0,0) bán kính 30, Y=15, nhìn (0,0,0), xuất phát (30,15,0), ngược chiều kim đồng hồ nhìn từ trên xuống, 15 s/vòng.
- 3 s khởi động không đo; đo đúng `--duration` giây rồi thoát mã 0. Output đúng schema contract 1.3 (avg_fps, p1_low_fps, frame_ms_p95, frames, load_ms, peak_mem_mb, vsync_off, renderer, os).
- Ngưỡng (máy chấm): avg_fps ≥ 60, p1_low_fps ≥ 30, load_ms ≤ 10000.

## User Story 2 — Soak test ổn định (P1)
`soak_cmd --seed 7 --nights 10 --out soak.json`: 10 Đêm liên tiếp (1→2→3 xoay vòng) trong một tiến trình, Đêm thứ i dùng seed 7+i, input ngẫu nhiên theo seed (đổi hướng mỗi 30 tick; nhảy 5%, lướt 3%, tỏa sáng 2%, tương tác 10% mỗi tick). Ngưỡng: crashes = 0 và mem_end_mb ≤ 1,2 × mem_start_mb.

## User Story 3 — Bảng xếp hạng cục bộ (P1)
Sau Bình Minh (thắng Đêm 3) hoặc sau khi thua ở bất kỳ Đêm nào có thể nhập tên 3–12 ký tự `[A-Za-z0-9_]`. Mục lưu: name, score (tổng điểm các Đêm đã thắng), nights_won 0–3, achieved_at (ISO 8601 có múi giờ), seed. Top 10, score giảm dần, bằng điểm ai đạt trước đứng trên. Lưu trên đĩa, còn sau khi tắt/mở lại. Có màn hình Bảng xếp hạng từ menu. `npm start -- --export-leaderboard out.json` xuất `{"entries": [...]}` đúng thứ tự rồi thoát mã 0.

## User Story 4 — Dễ tiếp cận (P2)
- Đổi phím cho 4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng; báo trùng phím (không đổi khi trùng); nút “Khôi phục mặc định”; lưu qua reload.
- Phụ đề/chỉ báo: Bóng Mực xuất hiện (kèm mũi tên chỉ hướng ở mép màn hình), gió sắp thổi, 10 giây cuối, đèn có fuel < 30.
- Giảm chuyển động: tắt chớp màn hình, nhấp nháy, hoạt ảnh; (game không có rung camera nên không có gì để tắt thêm).
- Chữ UI ≥ 18 px ở 1280×720; tùy chọn chữ lớn ×1,25.

## User Story 5 — Đóng gói & tài liệu (P1)
Clone sạch → README ≤ 3 lệnh (`npm ci`, `npm run build`, `npm start`). README có mô tả, ảnh, yêu cầu hệ thống, cài đặt, điều khiển, test, headless, bench, soak. CHANGELOG đủ 4 phase, CREDITS, LICENSE. Release v1.0.0 có bản chạy được. Retro (docs/notes/retro.md). Video < 5 phút. `bench.json`, `soak.json` do chính tôi chạy được commit (docs/proof/phase-4/).

## Contract 1.3
`contract_version: "1.3"`; `bench_cmd`, `soak_cmd` thêm vào game.contract.json (kèm `export_leaderboard_cmd` để người chấm biết cách xuất). Mọi yêu cầu v1.0–v1.2 giữ nguyên.

## Out of scope / giả định
Xem docs/notes/assumptions.md mục Phase 4 (cách tính phân vị, i bắt đầu từ 1, RSS tiến trình trình duyệt, tên tiếng Việt có dấu).
