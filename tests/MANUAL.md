# Live acceptance checks

Automated tests use controlled X-like fixtures in an isolated profile. These checks require a real X account/browser and must not be reported as passed from fixture results alone. No test should publish without the tester's explicit final action.

1. Load `dist` unpacked in Chrome and reload X. Open a two-person conversation. Verify one button per loaded article and compare extracted authors/text against the page.
2. Use several participants and reply branches. Verify only focus/proven ancestors are preselected. Choose a branch manually and arrange its messages.
3. Expand a long post and load a longer thread. Compare extracted text against originals; observe warnings for messages absent due to virtualization. Generate a longer selection within the documented limits and cancel once.
4. Include English, Spanish, emoji with skin tones/ZWJ, long links and line breaks. Verify complete dialogue across pages, consistent speakers and system-font coverage for other scripts.
5. Include deleted, protected, media-only and collapsed replies. Verify warnings/disabled empty entries, without fabricated text or automatic fetching.
6. Navigate between threads and the feed without reloading. Verify buttons appear/disappear appropriately and do not multiply as replies load.
7. Repeat in light/dark themes and on both supported hostnames.
8. Generate a short video. Check animated mouths, foreground benches, dialogue alignment, voices/blips/music and camera transitions.
9. Verify all original dialogue precedes the complete promotional message, delivered by Phoenix with the extension label. Check reading time and clean fade.
10. Play the saved file externally; check audio/video synchronization and duration. Hide the studio during a recording and verify explicit cancellation, then retry while visible.
11. Download and verify filename/format. Check MP4 availability on the target browser; if WebM is used, verify the warning and optional conversion.
12. Click Post to X. Confirm download and composer; attach manually. Check X accepts the file, review text/video. Publish only if you choose. Automatic attachment/publication are deliberately not implemented.

Record browser/OS versions, date, output format, limitations and pass/fail evidence. Do not save account credentials or session data in this repository.
