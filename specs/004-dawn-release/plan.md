# Implementation Plan: Dawn Release

2026-11-20; main; specs/004-dawn-release/spec.md.

## Technical context
Giữ Node ≥22 ES modules + Three.js 0.181.2, không thêm dependency. Core vẫn là nguồn luật duy nhất, thuần, tick cố định 60 Hz. Không thêm RNG/đồng hồ vào core.

## Quyết định kỹ thuật
| Chủ đề | Quyết định | Lý do |
|---|---|---|
| Cảnh bench | `src/core/bench.mjs` tạo scenario (200 shades Vogel spiral xoay theo seed, 100 motes, L1–L3 fuel 100) rồi gọi `createGame` + cờ `g.bench=true`. `step()` bỏ qua hao dầu/drain, nhặt, sát thương, kết thúc khi cờ bật. | Dùng lại luật wander có sẵn; cờ chỉ bật trong bench nên output headless cũ không đổi (test hồi quy). |
| Camera bench | `benchCamera(t)` thuần: (30cosθ, 15, 0−30sinθ), θ=2πt/15. | Ngược chiều kim đồng hồ nhìn từ trên xuống; test độc lập. |
| Thống kê | `src/core/metrics.mjs` (`benchStats`) tính đúng định nghĩa ticket; trang web chỉ gửi mảng dt, `scripts/bench.mjs` tính. | Một nguồn công thức, test được không cần GPU. |
| Chạy bench | `scripts/bench.mjs`: server tĩnh `dist/` trên cổng ngẫu nhiên, mở Chrome/Edge/Chromium cửa sổ `--app` 1280×720 với cờ tắt vsync/giới hạn FPS, trang `?bench=1` gửi dt qua POST, script ghi `bench.json`, thoát mã 0. `scripts/browser.mjs` là client CDP tối thiểu (WebSocket có sẵn trong Node 22). | Không cần thêm thư viện (không Playwright/Puppeteer). |
| RSS bench | Lấy tổng WorkingSet (Windows, PowerShell) hoặc RSS (`ps`) của mọi tiến trình có `--user-data-dir` riêng, mỗi 1,5 s; `null` + `peak_mem_note` nếu không đo được. | Bản web: bộ nhớ là của cả cây tiến trình trình duyệt. |
| Soak | `src/headless/soak.mjs`; RNG xorshift riêng theo `(seed+i)*7919+night`; khởi động JIT bằng 30 Đêm bỏ đi trước khi đo `mem_start`; gc cưỡng bức chỉ ở cuối (`v8.setFlagsFromString('--expose-gc')`). | RSS đầu quá thấp vì chưa JIT làm sai tỉ lệ 1,2; đã đo 400 Đêm thấy đường cong phẳng (không rò rỉ). |
| Bảng xếp hạng | `src/core/leaderboard.mjs` (luật thuần) + `scripts/leaderboard-store.mjs` (đĩa, ghi nguyên tử, hàng đợi tuần tự) + API `GET/POST /api/leaderboard` trong `scripts/serve.mjs`. Máy chủ gắn `achieved_at`. Dự phòng localStorage khi host tĩnh. | “Lưu trên đĩa” và `--export-leaderboard` cần tiến trình Node; web tĩnh vẫn dùng được. |
| Xuất | `npm start -- --export-leaderboard out.json` (serve.mjs nhận cờ, ghi file, exit 0). | `run_cmd` của contract là `npm start`. |
| Đổi phím | `src/web/keymap.mjs` thuần (mặc định, `rebind`, `findConflict`, `sanitize`); `keyboardInput(keys, yaw, bindings)` mặc định = phím cũ. | Test không cần DOM; test input Phase 1–3 giữ nguyên. |
| Phụ đề | `src/web/captions.mjs`: đọc snapshot/sự kiện (`shade_spawned`) và chiếu vị trí Bóng Mực ra mép màn hình. Không thêm sự kiện vào core. | Không đổi protocol. |
| Chữ | `html{font-size:calc(18px*var(--text-scale))}`; mọi chữ dùng ≥1rem; kiểm tự động bằng `getComputedStyle` ở mọi màn hình. | 18 px / 22,5 px khi chữ lớn. |
| Hiệu năng render | Hình học/vật liệu Bóng Mực và đom đóm dùng chung (không tạo mới mỗi con). | 200 Bóng Mực × 5 mesh. |

## Cấu trúc thay đổi
src/core: bench.mjs, metrics.mjs, leaderboard.mjs, simulation.mjs (cờ bench). src/headless/soak.mjs. src/web: keymap.mjs, captions.mjs, leaderboard-client.mjs, main.mjs, input.mjs, style.css, index.html. scripts: bench.mjs, browser.mjs, static-handler.mjs, serve.mjs, leaderboard-store.mjs, check-phase4.mjs, check-phase4-browser.mjs, linux-check-phase4.mjs. tests/phase4.test.mjs. verification/checks.json (thêm 5 check). game.contract.json 1.3.

## Constitution check
Core thuần/chung (II/IX), tick cố định không wall clock (III): wall clock chỉ nằm ở bench runner/trang web. Test viết trước (IV), bằng chứng chạy thật (X), giữ proof/tag phase 1–3 (VI).
