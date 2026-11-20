# Retro — Đảo Đèn Lồng (4 phase)

Tác giả: Nguyễn Tuấn Bách (MSSV 2A202603596), người điều phối AI. Dựa trên docs/notes/ai-log.md, verification.md và report của từng phase; chỗ nào chưa có số liệu ghi "chưa đo".

## Evaluation tổng hợp 4 phase
| Phase | Kết quả | Điều đáng nhớ |
|---|---|---|
| 1 Đêm đầu | Core Node + Three.js, CLI headless, 25 test, replay byte-identical, Linux Docker | Lỗi phím A/D bị ngược so với camera do người chơi báo; chỉ sửa ở adapter bàn phím và thêm hồi quy 4 góc yaw. |
| 2 Ba đảo | 43 test, 10 scenario CLI, ba bản đồ, lướt/rơi/gió | Reviewer (agent nghiên cứu) tìm ra lỗi rơi đom đóm, recoil, spawn, ID, resume; sửa kèm test hồi quy. Test Phase 1 bị luật mới làm sai được sửa theo bảng luật cũ → mới. |
| 3 Đèn cạn dầu | 53 test, 22 scenario byte-parity, 32 kiểm tra browser | Test viết trước thất bại đúng chỗ rồi mới code. Bỏ thắng sớm `all_lit`. FPS đo trong tab nền bị throttle nên phải đo lại ở tab hiển thị. |
| 4 Bình minh | 67 test, bench 238 FPS (máy dev), soak 0 crash, kiểm browser tự động, Docker Linux | Luật không đổi; công sức nằm ở đo đạc, khả năng tiếp cận và đóng gói. |

## Điều gì hiệu quả khi làm với AI
- Viết yêu cầu thành bảng "luật cũ → luật mới → test bị ảnh hưởng" trước khi sửa: agent không lén đổi expected để che lỗi.
- Core thuần, tick cố định, một file cấu hình: mọi bằng chứng (CLI, browser, Linux) so được từng byte.
- Bắt AI tự chạy thật và lưu log (runner `scripts/verify.py`, script CDP chụp ảnh): ảnh chụp cho thấy lỗi bố cục (menu đè chữ, bảng cài đặt tràn) mà test logic không bắt được.
- Chạy lặp phép đo nhiễu (soak RSS 8–20 lần) thay vì tin một lần PASS.

## Điều không hiệu quả
- Để agent viết nguyên khối lệnh shell nhiều dòng có nhiều loại dấu nháy: lỗi hai lần, mất thời gian. Nên ghi file bằng công cụ tạo file.
- Tin vào trạng thái "đã tag/pushed" trong STATUS cũ trong khi git local chưa có tag: phải kiểm tra `git tag` thực tế.
- Phép đo tự động trong tab ẩn/nền cho kết quả sai (FPS, pause); phải dùng cửa sổ hiển thị.

## Những lần AI sai và cách phát hiện
1. A/D ngược (Phase 1) — người chơi thử thật.
2. Các lỗi luật ở Phase 2 — reviewer độc lập chạy lại test và đọc spec.
3. Soak vượt ngưỡng RSS (Phase 4) — chạy lặp thấy phân bố 1,0–1,26; đổi cách đo có giải thích, không nới ngưỡng.
4. Cảnh bench hiện UI đè lên — nhìn ảnh chụp.
5. Kỳ vọng điểm 600 sai (đúng là 597) — tính lại bằng tay từ luật.
6. Verify Docker ghi đè log bằng chứng khi engine chưa chạy — đọc `git status`/mtime; log tạo lại sau lần chạy thành công.

## Harness giúp nhiều nhất
`AGENTS.md` (quy trình, "không đoán ticket chưa phát hành", "không sửa expected") và skill `dao-verify` + `scripts/verify.py` (một lệnh chạy build/test/scenario/Linux, ra report có log thô). Spec Kit giúp giữ cấu trúc spec → plan → tasks. Chưa dùng hook.

## Token / chi phí
Chưa đo: phiên không cung cấp số token hoặc chi phí từ nhà cung cấp, nên không ước lượng bừa. Cách tiết kiệm đã áp dụng: một dependency, không Playwright, đọc file trước khi sửa, script kiểm tra tự động thay cho thử tay lặp lại, không chạy agent nghiên cứu cho việc nhỏ.

## Nếu làm lại
- Ghi `git tag` và commit nhỏ ngay khi xong từng phase (hiện toàn bộ Phase 1–3 nằm trong một commit nên ba tag trỏ cùng chỗ).
- Dựng sớm khung đo (bench/soak/ảnh chụp tự động) ngay từ Phase 1 để biết hiệu năng và bố cục sớm hơn.
- Đặt kích thước chữ ≥18 px và bảng phím ngay từ Phase 2 thay vì sửa CSS ở Phase 4.
- Cài Docker/WSL từ đầu; không để Verify Linux chỉ chạy được ở cuối.
- Ghi token/chi phí theo từng phase ngay trong phiên.
