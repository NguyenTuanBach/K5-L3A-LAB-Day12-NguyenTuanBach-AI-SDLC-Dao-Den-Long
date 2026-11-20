# Báo cáo Phase 4 — Bình minh (v1.0.0)

2026-11-20. Ticket-04 / contract 1.3 (nguồn: docs/requirements/phase-4-source.txt). Runtime kiểm chứng: commit `9911063` (working tree sạch khi chạy).
Môi trường: Windows 11 10.0.26200 x64, Node 24.14.0, i5-12450H, 16 GB, Intel UHD (ANGLE/D3D11), Chrome/Edge 157; Linux bằng Docker (node:22-alpine, image dao-den-long:phase-4).
Runner: `python scripts/verify.py --config verification/checks.json` → [report](../../../verification/runs/20261120T111804Z-bf793b79/report.md), 9/9 check PASS (build, unit/CLI, scenario Phase 3, headless Phase 4, browser, bench, soak, Linux Phase 3, Linux Phase 4).

| Yêu cầu | Bằng chứng | Kết quả |
|---|---|---|
| §1 Bench: cảnh chuẩn, schema, định nghĩa số đo | tests/phase4.test.mjs (thống kê, camera, 200 shade/100 mote/L1–L3, không sinh/hao/sát thương/kết thúc, bất biến theo seed); [bench.json](bench.json) chạy bằng `scripts/bench.mjs`, exit 0 | PASS (đo trên máy dev) |
| §1 Ngưỡng (avg ≥ 60, p1 ≥ 30, load ≤ 10 s) | máy dev: avg 243,1; p1 low 36,3; p95 13,8 ms; 7292 khung; load 1,16 s; peak 1181 MB | PASS trên máy dev. Máy chấm của giảng viên: chưa đo |
| §2 Soak | [soak.json](soak.json): 10 Đêm, crashes 0, mem 58 → 63,3 MB (1,09×); chạy lặp 10 lần 1,09–1,10; Linux Docker cũng PASS | PASS |
| §3 Bảng xếp hạng | tests (luật top 10, tên, tie, ISO múi giờ, đĩa, export); [browser-results.json](browser-results.json): lưu qua UI, khởi động lại máy chủ vẫn còn, [leaderboard-export.json](leaderboard-export.json) | PASS |
| §4 Đổi phím | browser: báo trùng (không đổi), đổi sang J nhảy được, Space cũ không nhảy, lưu qua reload, khôi phục mặc định; tests/phase4 (keymap) | PASS |
| §4 Phụ đề/chỉ báo | browser: Bóng Mực + mũi tên ở mép ([ảnh](screenshots/caption-shade-arrow.png)), gió, 10 s cuối, đèn < 30 dầu | PASS |
| §4 Giảm chuyển động | browser: không chớp màn hình khi bật, có chớp khi tắt | PASS (game không có rung camera) |
| §4 Chữ ≥ 18 px, chữ lớn ×1,25 | browser quét computed font-size ở menu, cài đặt, bảng xếp hạng, giới thiệu đêm, HUD, kết quả: 0 phần tử < 18 px (< 22,5 px khi chữ lớn); [ảnh](screenshots/) | PASS |
| §5 Đóng gói | README ≤ 3 lệnh; Docker clean build + `npm test` 67/67 + soak + parity cảnh bench (sha256 giống Windows/Linux) | PASS trên Windows + Docker Linux; macOS chưa thử |
| §6 Contract 1.3 | tests/phase4 đầu tiên; mọi test và 22 scenario Phase 1–3 vẫn PASS (check-phase3, byte parity) | PASS |
| §7 Retro, CHANGELOG, CREDITS, LICENSE | docs/notes/retro.md, CHANGELOG.md, CREDITS.md, LICENSE | PASS (token/chi phí: chưa đo) |
| Tag `phase-4`, Release `v1.0.0`, video cuối | xem docs/STATUS.md | Tag local; Release/push chờ người dùng |

## Chưa đạt / giới hạn trung thực
- Chưa chạy hidden test của giảng viên; chưa đo trên máy chấm. Chưa kiểm trên macOS.
- Số đo bench là một máy/GPU tích hợp; p1_low dao động 36–43 giữa các lần chạy. `vsync_off` ghi theo cờ đã truyền.
- Chưa có người chơi thật đánh giá cảm giác chơi (human game-feel).
- Video demo chưa quay lại phần bench; token/chi phí AI chưa đo.
