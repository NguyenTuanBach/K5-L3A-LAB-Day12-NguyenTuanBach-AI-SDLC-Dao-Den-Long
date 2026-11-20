# Phase 4: bảng luật cũ → luật mới → test bị ảnh hưởng

Gameplay (luật, số liệu, bản đồ, điểm, CLI, schema headless) không đổi. Chỉ phần “ngoài luật”:

| Hạng mục | Cũ (contract 1.2) | Mới (1.3) | Test bị ảnh hưởng / hành động |
|---|---|---|---|
| contract_version | "1.2" | "1.3"; thêm bench_cmd, soak_cmd, export_leaderboard_cmd | `tests/phase4.test.mjs` đầu tiên; test cũ không đọc version |
| `step()` | không có chế độ bench | cờ `g.bench` (chỉ bench): bỏ hao dầu/drain, nhặt, sát thương, kết thúc | Test hồi quy “bench flag does not alter ordinary gameplay”; check-phase3 (22 scenario byte) chạy lại PASS |
| `keyboardInput` | phím cố định | tham số `bindings` (mặc định = phím cũ) | `tests/input.test.mjs` giữ nguyên, PASS |
| Tạm dừng | Esc/P cố định | phím theo `bindings.pause` (mặc định Esc/P) | browser check đổi phím |
| Cỡ chữ UI | 8–15 px nhiều chỗ | ≥18 px (rem) | không có test cũ đo chữ; thêm browser check |
| Menu/Result | không có bảng xếp hạng | nút Bảng xếp hạng; form nhập tên khi thua hoặc thắng Đêm 3 | browser check leaderboard |
| Phiên bản package | 0.3.0 | 1.0.0 | — |

Test cũ bị sửa/bỏ: không có. Mọi test Phase 1–3 còn hiệu lực chạy lại (npm test 67/67 gồm 53 cũ + 14 mới; scripts/check-phase3.mjs; Docker).
