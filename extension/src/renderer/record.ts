import { SETTINGS } from '../settings';
import { Assets } from './assets';
import { drawScene } from './scene';
import { scriptDuration, spritePath, type Page } from './script';
import type { AssetManifest } from '../types';

export function recordingType(supported: (type: string) => boolean): string {
  for (const type of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus'])
    if (supported(type)) return type;
  throw new Error('This browser cannot record a supported video format. Use current desktop Chrome.');
}

export async function recordVideo(canvas: HTMLCanvasElement, pages: Page[], manifest: AssetManifest,
  signal: AbortSignal, progress: (ratio: number, message: string) => void, audio: AudioContext): Promise<Blob> {
  const assets = new Assets();
  const streams: MediaStream[] = [];
  let recorder: MediaRecorder | undefined;
  let music: AudioBufferSourceNode | undefined;
  const liveSources = new Set<AudioBufferSourceNode>();
  const destination = audio.createMediaStreamDestination();
  const master = audio.createGain(); master.gain.value = .7;
  master.connect(destination); master.connect(audio.destination);
  streams.push(destination.stream);
  try {
    const paths = ['bg/bg_main.png', 'bg/bg_judge.png', 'fg/pr_bench.png', 'fg/witness_stand.png',
      'textbox/mainbox.png', 'textbox/nametag_left.png', 'textbox/nametag_center.png', 'textbox/nametag_right.png',
      'textbox/arrow.gif', 'exclamations/objection.gif', 'sound/sfx-blipmale.wav', 'sound/sfx-blipfemale.wav',
      'sound/sfx-pichoop.wav', manifest.relaxed, manifest.tense];
    for (const page of pages) paths.push(spritePath(page, false), spritePath(page, true), page.character.objection);
    await assets.load(paths, audio, signal, ratio => progress(ratio * .1, 'Preparing local animation and sound…'));
    signal.throwIfAborted();
    if (document.hidden) throw new Error('Keep the courtroom tab visible while recording.');
    const mimeType = recordingType(type => MediaRecorder.isTypeSupported(type));
    canvas.width = 768; canvas.height = 576;
    const context = canvas.getContext('2d')!;
    drawScene(context, assets, pages[0], 0);
    const stream = canvas.captureStream(SETTINGS.fps); streams.push(stream);
    destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    let bytes = 0;
    let failure: Error | undefined;
    const stopped = new Promise<void>(resolve => recorder!.addEventListener('stop', () => resolve(), { once: true }));
    recorder.addEventListener('dataavailable', event => {
      bytes += event.data.size;
      if (bytes > SETTINGS.maxRecordingBytes) { failure = new Error('Recording exceeded 300 MB. Select fewer messages.'); if (recorder?.state === 'recording') recorder.stop(); }
      else if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener('error', () => { failure = new Error('The browser video encoder failed. Try a shorter conversation.'); });
    const play = (path: string, volume: number, loop = false) => {
      const source = audio.createBufferSource(); source.buffer = assets.sounds.get(path)!; source.loop = loop;
      const gain = audio.createGain(); gain.gain.value = volume; source.connect(gain); gain.connect(master);
      liveSources.add(source);
      source.onended = () => { liveSources.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(); return source;
    };
    recorder.start(1000);
    music = play(manifest.relaxed, .22, true);
    const started = audio.currentTime;
    const duration = scriptDuration(pages);
    let index = 0, objectionPage = -1, previousIndex = -1, lastBlip = -1, tense = false;
    while (true) {
      signal.throwIfAborted();
      if (failure) throw failure;
      if (document.hidden) throw new Error('Recording cancelled because the tab became hidden. Keep this tab visible and try again.');
      if (audio.state !== 'running') throw new Error('Audio was suspended. Keep the browser active and try again.');
      const time = audio.currentTime - started;
      if (time >= duration) break;
      while (index < pages.length - 1 && time >= pages[index].start + pages[index].duration) index++;
      const page = pages[index];
      const local = time - page.start;
      if (index !== previousIndex) {
        if (previousIndex >= 0) play('sound/sfx-pichoop.wav', .35);
        previousIndex = index;
      }
      if (page.objection && local >= .5 && objectionPage !== index) {
        objectionPage = index; play(page.character.objection, .75);
        if (!tense) { music.stop(); music = play(manifest.tense, .22, true); tense = true; }
      }
      if (local >= page.lead && local < page.lead + page.typing && time - lastBlip >= .06) {
        play(`sound/sfx-blip${page.character.gender === 'female' ? 'female' : 'male'}.wav`, .24); lastBlip = time;
      }
      drawScene(context, assets, page, local, pages[index - 1]);
      if (time > duration - .5) {
        context.fillStyle = `rgba(0,0,0,${(time - duration + .5) / .5})`; context.fillRect(0, 0, canvas.width, canvas.height);
        master.gain.value = .7 * (duration - time) / .5;
      }
      progress(.1 + .9 * time / duration, `${page.promotion ? 'Promotional ending' : 'Courtroom dialogue'} · ${Math.ceil(duration - time)}s remaining`);
      await new Promise(resolve => setTimeout(resolve, 1000 / SETTINGS.fps));
    }
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    if (failure) throw failure;
    signal.throwIfAborted();
    if (!chunks.length) throw new Error('The browser produced an empty recording.');
    progress(1, 'Video ready');
    return new Blob(chunks, { type: recorder.mimeType || mimeType });
  } finally {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    for (const source of liveSources) { try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); }
    for (const stream of streams) stream.getTracks().forEach(track => track.stop());
    master.disconnect(); assets.close();
    await audio.close();
  }
}
