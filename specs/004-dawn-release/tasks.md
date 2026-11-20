# Tasks: Dawn Release

## Setup
- [x] T001 Lưu Ticket-04 nguyên văn (docs/requirements/phase-4-source.txt), spec/plan/bảng luật; contract 1.3 (game.contract.json).
## Foundation (test trước)
- [x] T002 tests/phase4.test.mjs: thống kê bench theo định nghĩa, camera, cảnh bench, hồi quy cờ bench, luật leaderboard, kho đĩa + export, soak, đổi phím (US1–US4).
## US1 — benchmark
- [x] T003 src/core/bench.mjs, src/core/metrics.mjs, cờ bench trong simulation.mjs.
- [x] T004 scripts/bench.mjs + scripts/browser.mjs + trang `?bench=1` trong src/web/main.mjs; chạy thật, lưu docs/proof/phase-4/bench.json.
## US2 — soak
- [x] T005 src/headless/soak.mjs; lưu docs/proof/phase-4/soak.json; đo 10/100/400 Đêm để phân biệt rò rỉ với khởi động JIT.
## US3 — leaderboard
- [x] T006 src/core/leaderboard.mjs, scripts/leaderboard-store.mjs, API trong scripts/serve.mjs, `--export-leaderboard`, UI (menu, form tên), dự phòng localStorage.
## US4 — accessibility
- [x] T007 keymap.mjs + UI đổi phím; captions.mjs + mũi tên mép màn hình; giảm chuyển động; chữ ≥18 px và chữ lớn ×1,25; chỉnh bố cục 1280×720.
## US5 — đóng gói
- [x] T008 scripts/check-phase4.mjs, scripts/check-phase4-browser.mjs, scripts/linux-check-phase4.mjs; cập nhật verification/checks.json; chạy runner đầy đủ.
- [x] T009 README, CHANGELOG 4 phase, CREDITS, ARCHITECTURE, notes (assumptions, decisions, ai-log, retro), STATUS.
- [ ] T010 Tag `phase-4`, Release `v1.0.0` (cần push; chờ người dùng đồng ý), video demo cuối. Xem docs/STATUS.md.
