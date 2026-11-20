# Changelog

## v1.0.0 — Phase 4, contract 1.3 (release)
Gameplay rules, tuning, maps, scoring and headless output are unchanged from contract 1.2.
- Added: benchmark mode (`node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`) on a fixed scene of 200 wandering Shades and 100 motes; soak test (`node --expose-gc src/headless/soak.mjs --seed 7 --nights 10 --out soak.json`).
- Added: local top-10 leaderboard saved on disk (data/leaderboard.json), menu screen, name entry after a loss or the Night 3 dawn, `npm start -- --export-leaderboard out.json`.
- Added: key rebinding with conflict warning and reset, captions and edge arrows (Shade appears, wind, last 10 s, fuel < 30), reduced motion, UI text >= 18 px with a x1.25 option.
- Changed: `game.contract.json` is 1.3 and adds `bench_cmd`, `soak_cmd`, `export_leaderboard_cmd`; `keyboardInput` accepts bindings (default = old keys); core has a bench-only flag that disables fuel decay, damage, pickups and night end.
- Proof: docs/proof/phase-4 (bench.json, soak.json, browser results, Linux results). Rule table: specs/004-dawn-release/requirements.md.

## Phase3 — Contract1.2 (breaking changes)
- Lanterns consume fuel; lit lamps accept refuel, weak lamps lose safety and can be drained. Out lamps retain ever_lit; relight cost 5 replaces first cost 10 after first light.
- No immediate all_lit victory. Dawn 240/270/300 seconds requires 3/5, 4/6, 5/7 lit and alive; won reason dawn_survived replaces all_lit.
- Capacity grows 10 to 20 from actual lighting count. Scenario successful_lights supports setup without fake events.
- Score replaced: 5/mote deposit/refuel, 100 first/40 relight, 5 pulse/15 drain pulse; win 50 + floor fuel per lit lamp plus 50/flame; no time bonus.
- Protocol adds fuel/history/capacity/drain/scenario fields and events. Old schemas and changed expected values must be updated; no silent test skip.
- Persisted distinguishable palette; cyan shade eyes/edges, white warnings; non-color lamp status.
- See specs/003-lantern-fuel/requirements.md and docs/adr/003-lantern-fuel.md.

## Phase2 — Contract1.1
- Three canonical islands (Đảo Bến, Đảo Cau, Đảo Chuông), dash/fall, Gió Lạc, Bùa Gió, wind, campaign, pause, settings, procedural audio and HUD.
- Replaced Phase 1 tuning/geometry/score/terminal rules; see specs/002-three-islands/requirements.md.

## Phase1 — Contract1.0
- Night 1 on Đảo Bến: core simulation at 60 Hz, Three.js third-person game, deterministic headless CLI (JSONL), replay tests and Linux Docker proof. See specs/001-night-one.
