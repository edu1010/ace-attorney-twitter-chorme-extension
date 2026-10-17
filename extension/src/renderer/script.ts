// Browser adaptation of objection_engine's SceneBuilder: priority casting, 3-line
// dialogue pages, talk/idle poses, 30 ms lettering, courtroom cuts and objections.
// See engine/README.md and engine/licenses/objection-engine-MIT.txt.
import { SETTINGS } from '../settings';
import type { AssetManifest, Character, Tweet } from '../types';

export const graphemes = (text: string): string[] => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(s => s.segment);
export interface Page {
  speaker: string; character: Character; pose: string; lines: string[];
  text: string; tweetId?: string; promotion: boolean; objection: boolean;
  start: number; lead: number; typing: number; duration: number;
}
export function layout(text: string, measure: (text: string) => number, maxWidth = 220): string[][] {
  const lines: string[] = [];
  let line = '';
  for (const char of graphemes(text)) {
    if (char === '\n') { lines.push(line + char); line = ''; continue; }
    if (line && measure(line + char) > maxWidth) {
      const breakAt = Math.max(line.lastIndexOf(' '), line.lastIndexOf('\t'));
      if (breakAt >= 0 && breakAt < line.length - 1) {
        lines.push(line.slice(0, breakAt + 1)); line = line.slice(breakAt + 1);
      } else { lines.push(line); line = ''; }
      // A long word or wide grapheme must never be dropped.
      if (line && measure(line + char) > maxWidth) { lines.push(line); line = ''; }
    }
    line += char;
  }
  if (line) lines.push(line);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
  return pages;
}

export function cast(tweets: Tweet[], assets: AssetManifest): Map<string, Character> {
  const counts = new Map<string, number>();
  for (const tweet of tweets) counts.set(tweet.username.toLowerCase(), (counts.get(tweet.username.toLowerCase()) ?? 0) + 1);
  const users = [...counts].sort((a, b) => b[1] - a[1]).map(([user]) => user);
  const characters = [...assets.priority.map(id => assets.characters.find(c => c.id === id)).filter((c): c is Character => !!c),
    ...assets.characters.filter(c => !assets.priority.includes(c.id)).sort((a, b) => a.id.localeCompare(b.id))];
  if (users.length > characters.length) throw new Error(`This asset pack supports ${characters.length} distinct participants. Select fewer authors.`);
  return new Map(users.map((user, index) => [user, characters[index]]));
}

export function buildScript(tweets: Tweet[], assets: AssetManifest, measure: (text: string) => number,
  promotion = SETTINGS.promotion): Page[] {
  const usable = tweets.filter(tweet => !tweet.unavailable && tweet.text.trim());
  if (!usable.length) throw new Error('Select at least one message with available text.');
  const assignments = cast(usable, assets);
  const pages: Page[] = [];
  let start = 0;
  const append = (text: string, speaker: string, character: Character, isPromotion: boolean, tweetId?: string) => {
    const dramatic = isPromotion || /[!！]|\b(?:objection|objeci[oó]n|disagree|incorrect|wrong|mentira)\b/iu.test(text);
    for (const [index, lines] of layout(text, measure).entries()) {
      const pageText = lines.join('');
      const typing = graphemes(pageText).length * SETTINGS.secondsPerGrapheme;
      const objection = dramatic && index === 0;
      const lead = index === 0 ? (objection ? 1.8 : 0.5) : 0;
      const duration = lead + typing + Math.max(SETTINGS.holdSeconds, graphemes(pageText).length / 18 - typing);
      pages.push({ speaker, character, pose: dramatic ? character.dramatic : character.neutral, lines,
        text: pageText, tweetId, promotion: isPromotion, objection, start, lead, typing, duration });
      start += duration;
    }
  };
  for (const tweet of usable) append(tweet.text, `${tweet.displayName} (@${tweet.username})`, assignments.get(tweet.username.toLowerCase())!, false, tweet.id);
  if (promotion.enabled) {
    const phoenix = assets.characters.find(c => c.id === 'phoenix');
    if (!phoenix) throw new Error('Phoenix assets are required for the promotional ending.');
    append(promotion.text, promotion.speaker, phoenix, true);
  }
  if (start > SETTINGS.maxDurationSeconds) throw new Error('This selection exceeds 20 minutes. Split it into smaller conversations.');
  return pages;
}
export const scriptDuration = (pages: Page[]) => pages.length ? pages.at(-1)!.start + pages.at(-1)!.duration + 0.5 : 0;
export const spritePath = (page: Page, talking: boolean) => `characters/${page.character.id}/${page.character.id}-${page.pose}-${talking ? 'talk' : 'idle'}.gif`;
