# Engine reuse and browser adaptation

The fork originally imports `objection_engine~=3.2` from PyPI; it does **not** contain a renderer submodule. The only submodule is the Apache-2.0 `video-splitter`, commit `7feb65df318804f0b0be627c6bd039071f7bb1fe`. Its existing local modifications were left alone.

Inspected renderer source: LuisMayo/objection_engine, commit `ebf4a2346028df8a130b45da71eb8fa72d3a8a39` (package version 3.5.1). Source is MIT. See `licenses/objection-engine-MIT.txt` and `upstream/ace_attorney_scene.py`, retained as a reference for the adapted portions. This is a source snapshot, not a second runnable Python installation.

## What the original does

- `main.py::process_tweets` walks explicit API parent/quote IDs backwards, sanitizes text, builds comments, invokes `render_comment_list`, splits MP4s, uploads and posts via Tweepy.
- `comment_list_brige.py` maps author IDs/names/text, optionally downloads the first media item as evidence.
- Engine `SceneBuilder` counts authors, assigns Phoenix/Edgeworth/Larry first, chooses expressions, wraps three-line dialogue, schedules objections, music, camera movement and talk/idle animations.
- `AceAttorneyDirector` composites a 256×192 courtroom with a 1296-pixel background, foreground parallax, GIF sprites, textbox/name labels, blips, voices and music.
- `MovieKit.py` uses Pillow/NumPy/OpenCV for frames and pydub/FFmpeg for audio/video. Engine dependencies also include Polyglot/ICU, spaCy, Torch/Transformers and optional translation services. Upstream currently targets Python 3.10. These native dependencies do not execute inside Chrome.
- The asset pack is downloaded separately by upstream `utils.py` from `https://dl.luismayo.com/assetsv4.zip`.

## What is reused

`extension/src/renderer/script.ts` adapts priority casting, three-line boxes, timing and talk/idle/objection sequencing. `scene.ts` adapts the original coordinate system, layer order, foreground parallax, pan lookup table and dialogue placement. The original GIF animations, PNG backgrounds/foreground/textbox, Igiari font, character voices, blips, page sound and two PWR tracks are used directly. `prepare-assets.mjs` reads upstream character TOML configs and selects two available, non-spoiler poses per character (53 characters in the pinned pack).

`record.ts` replaces only the platform-specific compositing/encoding/audio backend with Canvas, Web Audio and MediaRecorder. `assets.ts` composites GIF disposal modes correctly using locally bundled gifuct-js. No runtime asset download, Python, FFmpeg, cloud, translation or sentiment-model API is required. The installed extension is self-contained after the build-time asset preparation.

## Intentional differences and remaining fidelity gaps

- Casting remains stable within a video. Ties and secondary casting are deterministic instead of random; distinct authors get distinct characters up to the pack's limit.
- Reactions use punctuation and explicit English/Spanish objection cues, not upstream sentiment analysis. Only two expressions per character are packaged. Timing includes minimum reading holds and deterministic camera pans.
- Text is preserved, including mentions and URLs. The bot's censorship/link replacement is not used because the requested extension must preserve dialogue. Literal text cannot inject scene commands.
- Unicode uses browser shaping and system fallback fonts; font availability affects glyph coverage. Grapheme segmentation avoids splitting emoji sequences. Some complex-script wrapping remains dependent on browser fonts.
- Attached photo evidence, arbitrary XML scene commands, gavel/verdict effects, automatic moderation, translation, bot mentions, queues, MongoDB, posting/deleting tweets and automatic video splitting are not part of this extension's renderer. Legacy bot source and the splitter are retained unchanged.
- Rendering is real time and requires the studio to remain visible. Large selections are bounded to 100 messages, 100,000 UTF-16 units, 20 minutes, 256 MiB of decoded GIF patches and 300 MiB of recorded output. Limits fail explicitly rather than cutting dialogue.
- MediaRecorder chooses H.264/AAC MP4 when supported; otherwise WebM. Exact parity with the Python renderer is not claimed. See the main README for manual conversion and X upload limitations.

This adaptation was chosen over a local companion because the original artwork and animation can run locally in Chrome. The source bot remains available for users who separately maintain its old Python/API environment.
