import { parseGIF, decompressFrames, type ParsedFrame } from 'gifuct-js';

class Animation {
  canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private patch = document.createElement('canvas');
  private frames: ParsedFrame[];
  private index = -1;
  private restore?: ImageData;
  readonly bytes: number;
  private duration: number;
  constructor(data: ArrayBuffer) {
    const gif = parseGIF(data);
    this.canvas.width = gif.lsd.width; this.canvas.height = gif.lsd.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.frames = decompressFrames(gif, true);
    this.bytes = this.frames.reduce((sum, frame) => sum + frame.patch.length, 0);
    // Patches are the only pixel representation playback needs. Release the much
    // larger JS-number arrays produced by the decoder before caching animations.
    for (const frame of this.frames) { frame.pixels = []; frame.colorTable = []; }
    this.duration = this.frames.reduce((sum, frame) => sum + Math.max(20, frame.delay), 0);
    if (!this.frames.length || !this.duration) throw new Error('Invalid animated sprite');
  }
  at(seconds: number): HTMLCanvasElement {
    let remainder = (Math.max(0, seconds) * 1000) % this.duration;
    let target = 0;
    while (target < this.frames.length - 1 && remainder >= Math.max(20, this.frames[target].delay)) {
      remainder -= Math.max(20, this.frames[target].delay); target++;
    }
    if (target < this.index) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.index = -1; this.restore = undefined; }
    while (this.index < target) {
      if (this.index >= 0) {
        const previous = this.frames[this.index];
        if (previous.disposalType === 2) this.ctx.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
        if (previous.disposalType === 3 && this.restore) this.ctx.putImageData(this.restore, 0, 0);
      }
      const frame = this.frames[++this.index];
      this.restore = frame.disposalType === 3 ? this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : undefined;
      this.patch.width = frame.dims.width; this.patch.height = frame.dims.height;
      this.patch.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height), 0, 0);
      this.ctx.drawImage(this.patch, frame.dims.left, frame.dims.top);
    }
    return this.canvas;
  }
  close() { this.frames = []; this.canvas.width = this.patch.width = 0; this.restore = undefined; }
}

export class Assets {
  private images = new Map<string, ImageBitmap | Animation>();
  readonly sounds = new Map<string, AudioBuffer>();
  private bytes = 0;
  async load(paths: string[], audio: AudioContext, signal: AbortSignal, progress: (ratio: number) => void) {
    const unique = [...new Set(paths)];
    for (const [index, path] of unique.entries()) {
      signal.throwIfAborted();
      const response = await fetch(`assets/${path}`, { signal });
      if (!response.ok) throw new Error(`Missing local asset: ${path}. Run npm run assets and rebuild.`);
      const data = await response.arrayBuffer();
      if (/\.(wav|mp3)$/.test(path)) this.sounds.set(path, await audio.decodeAudioData(data));
      else if (path.endsWith('.gif')) {
        const animation = new Animation(data); this.bytes += animation.bytes;
        this.images.set(path, animation);
        if (this.bytes > 256 * 1024 * 1024) throw new Error('Sprite memory limit reached. Select fewer participants.');
      } else this.images.set(path, await createImageBitmap(new Blob([data])));
      progress((index + 1) / unique.length);
    }
  }
  image(path: string, time = 0): CanvasImageSource {
    const image = this.images.get(path);
    if (!image) throw new Error(`Asset was not prepared: ${path}`);
    return image instanceof Animation ? image.at(time) : image;
  }
  close() { for (const image of this.images.values()) image.close(); this.images.clear(); this.sounds.clear(); }
}
