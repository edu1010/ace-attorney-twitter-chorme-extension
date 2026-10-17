# Verification — 17 October 2026

Implemented and built in the existing fork. Original Python bot files and the pre-existing modifications inside `video-splitter` were preserved.

## Passed

- `npm run typecheck` — strict TypeScript check.
- `npm test` — 16 unit tests in 2 files.
- `npm run build` — unpacked MV3 package with local assets and license notices.
- `npm run test:browser` with `PW_EXECUTABLE_PATH` set to installed Microsoft Edge — 3 end-to-end tests, all passed.
- `npm audit` — 0 reported vulnerabilities, including development dependencies at verification time.
- `git diff --check` — no whitespace errors.

Browser: Microsoft Edge 155.0.4283.45, Chromium engine 155, Windows, isolated temporary profile. The automated X/Twitter pages were controlled fixtures, not live signed-in accounts. Both supported hostname routes were exercised with the actual extension content script and background service worker.

The browser tests verify button injection without duplication, asynchronous messages, SPA navigation, session-storage handoff, selection/reordering, missing text, light/dark presentation, actual recording/playback, download, cancellation/retry, and opening the prepared X composer. The promotional text's exact contents and placement after all original dialogue are asserted by the script tests. Rendering and promotional screenshots were visually inspected.

The final recorded sample was independently inspected with FFprobe/FFmpeg:

| Property | Observed |
| --- | --- |
| Container | MP4 |
| Video | H.264 Constrained Baseline, level 3.1 |
| Dimensions | 768 × 576 |
| Average frame rate | about 28.95 fps (30 fps target) |
| Audio | AAC-LC, 48 kHz |
| Duration | 26.138 seconds |
| Size | 7,791,434 bytes |
| Audio mean / peak | −24.5 / −4.6 dB |

The full final promotional page was extracted from the MP4 and visually checked. The local sample is `.cache/verification/sample-courtroom.mp4`; screenshots and test downloads are in `test-results/`. These generated files are ignored by Git. A subsequent test run replaces `test-results/`.

## Not established by these tests

- Windows returned `spawn UNKNOWN` for downloaded Playwright Chromium executables. The end-to-end run used installed Edge's Chromium implementation. A normal Google Chrome installation has not been manually acceptance-tested here.
- A live authenticated X layout, reply metadata availability on current production pages, and video acceptance/upload in a real account were not tested. The fixture uses explicit parent links to exercise the verified-chain path; production X often omits those IDs, so only the clicked tweet may be preselected.
- Automatic video attachment is deliberately absent. The tested workflow downloads the file and opens the composer for manual attachment. No post was published.
- The 100-message case and duration limits were tested at the script-generation level; a full 20-minute recording and every character/language combination were not exhaustively rendered.
- WebM fallback is covered by codec-selection tests, but this browser selected MP4 for the end-to-end recording.
- Upstream game-asset redistribution permission is not established by an MIT code license. See `THIRD_PARTY_NOTICES.md`.

Use `tests/MANUAL.md` for the outstanding live acceptance checks.

## Follow-up: missing GIF root and incorrect review order

Inspected the user's open, authenticated X thread through Chrome's rendered DOM. The first tweet was an ordinary multiline post with an embedded GIF. X wrapped that GIF in `data-testid="placementTracking"`; the extractor incorrectly treated the wrapper as an ad and dropped the entire post. The studio also moved its selected focus to the beginning, putting it ahead of preceding context when no explicit parent IDs were available.

The extractor now excludes only an explicit `promotedIndicator`, not generic media tracking. The studio retains the collected source order independently of checkbox selection. It does not invent parent IDs or automatically select unrelated branches.

Rebuilt `dist` and passed strict TypeScript, all 18 unit tests, and both relevant browser tests (the existing MV3/navigation/selection test and a new four-message GIF-root regression). The new test checks the complete two-paragraph root, all four IDs, final-focus position after the context, and the conservative default selection. Screenshot: `test-results/thread-order-regression.png`.

The browser control policy blocks `chrome://extensions`, so reloading the installed extension in the user's Chrome requires a user action. Live inspection confirmed the cause; the compiled fix was verified in the isolated browser tests before requesting that reload.
