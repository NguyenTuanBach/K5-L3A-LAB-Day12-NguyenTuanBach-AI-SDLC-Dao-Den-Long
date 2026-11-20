# Phase4 verification matrix

Runtime `af34df0`. [Report](../../docs/proof/phase-4/report.md), [Verify](../../verification/runs/20261120T114459Z-1492f376/report.md).

| Requirement | Evidence/assertions | Result |
|---|---|---|
| US1 bench scene + stats + runner | tests/phase4 (stats, camera, scene, flags, regression); scripts/bench.mjs → bench.json | PASS (máy dev) |
| US2 soak | tests/phase4 soak; scripts/check-phase4.mjs; soak.json; Linux | PASS |
| US3 leaderboard | tests/phase4 (rules, store, export CLI); browser UI/restart/export | PASS |
| US4 accessibility | tests/phase4 keymap; browser: fonts, rebind, captions, reduced motion | PASS |
| US5 packaging/docs | README/CHANGELOG/CREDITS/retro; Docker clean build/test/soak/parity | PASS (Windows + Linux); macOS NOT_RUN |
| Contract 1.3 | game.contract.json, tests/phase4 | PASS |
| Phase 1–3 regression | npm test 67/67, check-phase3 22 scenarios byte-identical, Docker | PASS |
| Instructor machine thresholds, hidden tests | không có | NOT_RUN |

No test expectation was changed to hide a failure. Earlier phase proof and tags are untouched.
