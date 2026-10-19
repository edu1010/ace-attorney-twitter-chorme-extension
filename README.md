# AceAttorTWExtension

<img src="extension/branding/logo-256.png" width="160" height="160" alt="AATW logo">

A Manifest V3 Chrome extension that turns selected, loaded X/Twitter messages into Ace Attorney courtroom videos **on your device**. It uses the original objection_engine artwork, animated sprites and audio with a TypeScript browser adaptation of its scene composition. No Python, local server, paid API, subscription or AI service is needed at runtime.

The original bot source remains intact. Its previous instructions are in [README.legacy-bot.md](README.legacy-bot.md). The dependency investigation, reused engine behavior and fidelity differences are in [engine/README.md](engine/README.md).

## Load the prepared build

If `dist/manifest.json` and `dist/assets/catalog.json` exist, the extension is ready to load:

1. Open `chrome://extensions` in desktop Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this repository's **dist** folder, not `extension` or the repository root.
4. Pin AceAttorTWExtension from Chrome's Extensions menu if desired.
5. Open or reload an X/Twitter conversation. Existing tabs must be reloaded after first installation or an extension update.

Use the popup's **Try a sample conversation** to verify rendering without an X account. The sample messages are fictional.

## Build from source

Prerequisite: Node.js 22.12+ (Node 24 recommended) and npm. The installed extension itself does not need Node.

```sh
npm ci
npm run assets
npm run build
```

Asset preparation downloads the original approximately 85 MB archive once, verifies its pinned SHA-256, reads its character configuration, and prepares a roughly 26 MB local subset with 53 characters. Subsequent builds reuse the cache. Scripts, sprites, music, effects and fonts are bundled in `dist`; no asset requests leave the device during generation. Do not install the legacy Python `requirements.txt` for the extension.

If your network uses a private TLS certificate, configure Node's trusted CA with `NODE_EXTRA_CA_CERTS` or download `https://dl.luismayo.com/assetsv4.zip` using your trusted system browser into `.cache/assetsv4.zip`, then run `npm run assets` again. The checksum is still verified. Do not disable certificate validation.

Before sharing a packaged build, read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Source-code licenses do not establish redistribution rights for Capcom game assets. The original font has separate noncommercial attribution/share-alike terms. Downloaded assets, caches and build outputs are deliberately excluded from Git.

Run `npm run package` to build `dist/AceAttorTWExtension.zip` for upload to the Chrome Web Store. The ZIP contains the contents of `dist` with the extension's only `manifest.json` at the root. The asset catalog is named `assets/catalog.json` to avoid a duplicate-manifest upload error. Existing ZIPs and source maps are excluded from the package.

## Use it

1. Open a status/conversation URL on `https://x.com` or `https://twitter.com`.
2. Expand long posts and load the replies you want. Only text/tweets presently in the rendered DOM can be collected. X may unload older posts as you scroll.
3. Click **Create Ace Attorney Courtroom** beneath a tweet's action row.
4. In the new extension courtroom tab, review the messages. The clicked tweet and explicitly verifiable ancestors are selected by default. Select other relevant messages yourself and use ↑ / ↓ to arrange them.
5. Click **Generate courtroom video**. Keep this tab visible until completion. Sound plays during recording. Generation takes approximately the length of the video; progress and Cancel remain available.
6. Preview the result, then choose **Download video** or **Post to X**.
7. **Post to X** requests a download and opens X's composer with introductory text. **Attach the downloaded file yourself**, review it, and click X's Publish/Post button when ready. If the browser blocks a download, use Download video again.

The extension does not request passwords, access cookies, call private X endpoints, automatically scroll/scrape, bypass security checks, attach files through unsupported automation, or publish a tweet. Sign into X normally if your session has expired.

## Conversation accuracy

X's visible DOM commonly exposes reply usernames without parent tweet IDs. A username or a visual connector is not proof of a specific reply relationship. The extension records `parentId` only when the page contains an explicitly labelled reply-parent status link; otherwise it leaves it unknown. It never treats all visible replies as a single linear chain.

Unverified candidates can include unrelated branches or recommendations. Their inclusion/order is a user choice, not an inferred relationship. Empty or unavailable text is disabled; missing messages are warned about; duplicate IDs and quoted-tweet internals are excluded. Text is never invented to fill gaps. Media-only tweets have no dialogue; photo/video attachments and quoted-tweet contents are not imported as evidence. Text is preserved as loaded, including mentions, URLs, emoji and line breaks.

Selectors use semantic article/timestamp structures and X's `data-testid` attributes instead of minified class names. A debounced MutationObserver handles asynchronous content; a lightweight URL check and `popstate` handle navigation. If X changes those structures, extraction may need maintenance. If the button is absent, confirm a `/username/status/id` URL, reload X, and wait for the tweet to load. Returning to the feed removes buttons.

## Rendering and promotional ending

Authors receive consistent characters, prioritizing frequent speakers as Phoenix, Edgeworth and Larry. Additional authors get distinct characters in deterministic order. Original GIF talk/idle animations, courtroom backgrounds/benches, dialogue-box art, PWR music, voice objections, blips and page effects are composed in Canvas/Web Audio. Text wraps into three-line pages with typewriter animation and reading pauses. Expressions and objections use deterministic rules.

Every video ends with a separate Phoenix scene, after all selected dialogue:

> OBJECTION! You can turn your own X threads into Ace Attorney courtroom battles too! Just install AceAttorTWExtension for Chrome!

It uses normal dialogue animation, Phoenix's voice effect, an explicit **AceAttorTWExtension** speaker label and reading holds. It is not attributed to a Twitter author. Configure the text and its default-enabled flag in `extension/src/settings.ts`, then rebuild/reload. Limits and introductory post text are centralized there too.

This adapts the engine's core scene behavior; it does not claim full parity with the Python engine's optional evidence, XML scenes, translation, sentiment, gavel or verdict features. See `engine/README.md`.

## Formats, limits and privacy

- Output: 768×576 at a target 30 fps, with audio. H.264/AAC MP4 is selected only when the browser reports support; otherwise output is VP9/VP8 WebM with the correct extension and compatibility notice. Encoding varies by browser/OS.
- X may reject unsupported codecs or files beyond the account's duration/file limits. No paid account is assumed; upload acceptance is not guaranteed. Videos are not split automatically.
- If necessary, convert WebM with a separately installed FFmpeg (optional; not needed for normal rendering):

  ```sh
  ffmpeg -i courtroom.webm -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart courtroom.mp4
  ```

- Bounds: 100 messages, 25,000 UTF-16 units per message, 100,000 total, 20 minutes, 53 distinct participants, 256 MiB of decoded GIF patches, and 300 MiB of recorded video. Exceeding rendering bounds produces an error; selected dialogue is not silently truncated. Encoded chunks stay in memory until download.
- Background throttling can damage recordings, so hiding the studio cancels with an explicit explanation. Keep the computer awake and the tab visible. Cancellation releases audio nodes, video tracks, animation resources and chunks. Closing the tab discards the result; download first.
- Glyph coverage depends on the bundled font and system fallbacks. Emoji grapheme clusters are not split; browser font support affects less common scripts.
- Only the `storage` permission is requested, alongside content-script access to X/Twitter. Collected text is handed off in browser session storage, then removed when the studio loads. Unopened handoffs expire after 30 minutes and are pruned on the next handoff; Chrome clears session storage when its session ends. Reloading the studio requires recollection. Nothing is stored remotely; there are no analytics.

## Testing

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
```

Unit tests cover two/many authors, long conversations, English/Spanish/Unicode/emoji, exact text preservation, missing text, reply ambiguity, quote exclusion, validation, deterministic casting, codecs and promotional suffixes. Browser tests load the MV3 extension into an isolated Chromium profile and route X/Twitter to controlled fixtures: injection, SPA navigation, asynchronous loading, light/dark mode, selection, recording/playback, cancellation/retry, downloading and opening the composer. With FFprobe installed, the downloaded streams are also inspected. Tests never publish or use your real profile.

For an installed Chromium-compatible browser that supports loading test extensions, set `PW_EXECUTABLE_PATH` to its executable. For example, PowerShell:

```powershell
$env:PW_EXECUTABLE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm run test:browser
```

These tests exercise representative DOM fixtures and real browser APIs. They do **not** establish compatibility with every live X layout or successful upload to a signed-in account. Follow [tests/MANUAL.md](tests/MANUAL.md) before claiming a public release.

## Layout

```text
extension/
  manifest.json        Manifest V3, limited to X/Twitter
  src/content/         injection and visible DOM extraction
  src/background/      validated ephemeral studio handoff
  src/panel/           message review, generation and preview
  src/renderer/        adapted scene builder, animation, audio, recording
  src/services/        validation and publishing fallback
  src/settings.ts      promotion, post text, timing and limits
  assets/              prepared subset; ignored by Git
engine/                analysis, upstream scene reference and code licenses
scripts/               pinned asset preparation and bundling
tests/                 unit/browser tests and live checklist
dist/                  unpacked extension; generated and ignored
```
