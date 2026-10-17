// Adapted from objection_engine/AceAttorneyDirector (MIT). The original 256×192
// coordinate system, foreground parallax, layer order and dialogue box are retained.
import { Assets } from './assets';
import { graphemes, spritePath, type Page } from './script';
import { SETTINGS } from '../settings';

const camera = { left: 0, center: 520, right: 1040, judge: 0 };
const foreground = { left: 0, center: 141, right: 282, judge: 0 };
const bench = { left: 0, center: 411, right: 758, judge: 0 };
// Original engine's camera easing lookup, linearly interpolated.
const panLut = [0, .0154675, .0304909, .0459777, .1001429, .1920789, .284015, .3841579, .4843008, .5839802, .6841231, .7842467, .8766462, .9686016, .9840691, 1];
function ease(t: number) {
  const position = Math.max(0, Math.min(1, t)) * 15;
  const i = Math.floor(position);
  return i === 15 ? 1 : panLut[i] + (panLut[i + 1] - panLut[i]) * (position - i);
}
export const FONT = '16px Courtroom, "Segoe UI", "Noto Sans", sans-serif';

export function drawScene(ctx: CanvasRenderingContext2D, assets: Assets, page: Page, local: number, previous?: Page) {
  const scale = ctx.canvas.width / 256;
  ctx.save(); ctx.scale(scale, scale); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 192);
  const location = page.character.location;
  const previousLocation = previous?.character.location ?? location;
  const pan = local < 0.5 && page.lead > 0 && location !== 'judge' && previousLocation !== 'judge';
  const interpolation = pan ? ease(local / .5) : 1;
  const cameraX = camera[previousLocation] + (camera[location] - camera[previousLocation]) * interpolation;
  const fgX = foreground[previousLocation] + (foreground[location] - foreground[previousLocation]) * interpolation;
  const typingTime = local - page.lead;
  const talking = typingTime >= 0 && typingTime < page.typing;
  const drawPerson = (p: Page, talk: boolean) => {
    const pos = p.character.location;
    const x = fgX + bench[pos] - cameraX - (pos === 'center' ? 31 : 0);
    ctx.drawImage(assets.image(spritePath(p, talk), local), x, 0, 256, 192);
  };
  if (location === 'judge') {
    ctx.drawImage(assets.image('bg/bg_judge.png'), 0, 0, 256, 192);
    ctx.drawImage(assets.image(spritePath(page, talking), local), 0, 0, 256, 192);
  } else {
    ctx.drawImage(assets.image('bg/bg_main.png'), -cameraX, 0);
    if (pan && previous && previousLocation !== location) drawPerson(previous, false);
    drawPerson(page, talking);
    ctx.drawImage(assets.image('fg/pr_bench.png'), fgX - cameraX, 0);
    ctx.drawImage(assets.image('fg/witness_stand.png'), fgX + 411 - cameraX, 0, 192, 192);
    ctx.save(); ctx.translate(fgX + 758 - cameraX + 256, 0); ctx.scale(-1, 1);
    ctx.drawImage(assets.image('fg/pr_bench.png'), 0, 0); ctx.restore();
  }
  if (page.objection && local >= .5 && local < 1.8) {
    if (local < .58) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 256, 192); }
    ctx.drawImage(assets.image('exclamations/objection.gif', local - .5), Math.sin(local * 80) * 2, 0, 256, 192);
  }
  if (typingTime >= 0) {
    ctx.drawImage(assets.image('textbox/mainbox.png'), 0, 128, 256, 64);
    ctx.font = '9px "Segoe UI", sans-serif'; ctx.textBaseline = 'top';
    let speaker = page.speaker;
    while (ctx.measureText(speaker).width > 242 && speaker.length > 1) speaker = graphemes(speaker).slice(0, -2).join('') + '…';
    const width = Math.min(246, ctx.measureText(speaker).width + 8);
    ctx.drawImage(assets.image('textbox/nametag_left.png'), 1, 117);
    ctx.drawImage(assets.image('textbox/nametag_center.png'), 2, 117, width, 11);
    ctx.drawImage(assets.image('textbox/nametag_right.png'), width + 2, 117);
    ctx.fillStyle = '#fff'; ctx.fillText(speaker, 5, 118);
    ctx.font = FONT;
    let visible = Math.floor(typingTime / SETTINGS.secondsPerGrapheme);
    for (const [index, line] of page.lines.entries()) {
      const chars = graphemes(line);
      const text = chars.slice(0, Math.max(0, visible)).join('').replace(/\n/g, '');
      ctx.direction = /[\u0590-\u08ff]/.test(text) ? 'rtl' : 'ltr';
      ctx.textAlign = ctx.direction === 'rtl' ? 'right' : 'left';
      ctx.fillText(text, ctx.direction === 'rtl' ? 240 : 10, 133 + index * 16);
      visible -= chars.length;
    }
    ctx.direction = 'ltr'; ctx.textAlign = 'left';
    if (!talking) ctx.drawImage(assets.image('textbox/arrow.gif', local), 236, 172, 15, 15);
  }
  ctx.restore();
}
