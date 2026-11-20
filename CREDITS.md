# Nguồn và giấy phép

- Mây, Bóng Mực, Đảo Đèn Lồng, PRD-0 và Test Contract: nội dung gốc của lab
  Day 12 AI SDLC trên artifact do giảng viên cung cấp. Dùng trong bài tập này;
  LICENSE của mã nguồn không cấp lại quyền sở hữu các nội dung lab.
- Mã game, đảo, nhân vật, cây, đèn, hạt sáng và toàn bộ mesh: tạo procedural bằng
  JavaScript/Three.js trong dự án với hỗ trợ Codex. Không tải model/texture/nhạc bên ngoài.
- Three.js 0.181.2: MIT, https://github.com/mrdoob/three.js ; bản LICENSE được copy vào dist/vendor.
- Spec Kit 1.4.3: toolkit chính thức https://github.com/github/spec-kit , MIT;
  các skill/template/script được giữ trong repo theo yêu cầu harness của lab.
- Font: Georgia/Arial/Times New Roman có sẵn trong hệ thống, không đóng gói font.
- Không có âm thanh trong Phase 1. Không sử dụng thương hiệu hoặc nhân vật game khác.
- Phase 2: nhạc và hiệu ứng âm thanh được tổng hợp procedural bằng Web Audio trong src/web/audio.mjs, không dùng audio/nhạc bên ngoài. Gió Lạc, Bùa Gió và bản đồ ba Đêm theo Ticket-02 của lab.

AI sử dụng: Claude Code (Claude Sonnet 5.5) cho Phase 4 (benchmark, soak, bảng xếp hạng, khả năng tiếp cận, kiểm chứng tự động, tài liệu) và Codex để đặc tả, lập kế hoạch, viết code, test và tài liệu;
agent runtime_research hỗ trợ nghiên cứu và rà thiết kế kỹ thuật. Nhật ký ở docs/notes/ai-log.md.

- Phase 4: không thêm asset, font, âm thanh hay thư viện mới. Chuẩn bị bản demo dùng ffmpeg (GPL/LGPL, công cụ ngoài, không đóng gói trong repo) để nén video; video do chính tôi quay màn hình.
- Phase 4: cảnh benchmark, bảng xếp hạng, phụ đề và mũi tên mép màn hình đều là mã tự viết trong dự án.
