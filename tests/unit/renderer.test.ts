import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildScript, cast, graphemes, layout, scriptDuration } from '../../extension/src/renderer/script';
import { recordingType } from '../../extension/src/renderer/record';
import { composerUrl } from '../../extension/src/services/publishing';
import { SETTINGS } from '../../extension/src/settings';
import type { AssetManifest, Tweet } from '../../extension/src/types';
const assets: AssetManifest = JSON.parse(readFileSync('extension/assets/manifest.json', 'utf8'));
const tweet = (id: string, username: string, text: string): Tweet => ({ id, username, text, displayName: username, order: 0, url: `https://x.com/${username}/status/${id}`, unavailable: !text });
const measure = (text: string) => graphemes(text).length * 8;
describe('courtroom script', () => {
  it('casts two people consistently and keeps different authors distinct', () => {
    const messages = [tweet('1', 'alice', 'Hi'), tweet('2', 'bob', 'No!'), tweet('3', 'alice', 'Yes')];
    const pages = buildScript(messages, assets, measure);
    expect(pages[0].character.id).toBe('phoenix'); expect(pages[1].character.id).toBe('edgeworth');
    expect(pages[2].character.id).toBe(pages[0].character.id);
    expect(cast(messages, assets)).toEqual(cast(messages, assets));
  });
  it('gives many participants distinct characters and rejects exhausting the pack', () => {
    const messages = Array.from({ length: 30 }, (_, i) => tweet(String(i), `user${i}`, 'Hi'));
    expect(new Set([...cast(messages, assets).values()].map(c => c.id)).size).toBe(30);
    expect(() => cast(Array.from({ length: 100 }, (_, i) => tweet(String(i), `u${i}`, 'Hi')), assets)).toThrow('distinct participants');
  });
  it('splits long Spanish, English, CJK and emoji without losing any text', () => {
    const text = ('Hello, world! ¡Buenos días! 👩🏽‍⚖️ 👨‍👩‍👧‍👦 日本語\nA very long word: ' + 'x'.repeat(120) + '  ').repeat(20);
    const pages = layout(text, measure);
    expect(pages.flat().join('')).toBe(text); expect(pages.length).toBeGreaterThan(20);
    expect(pages.every(p => p.length <= 3)).toBe(true);
    expect(graphemes('👩🏽‍⚖️')).toHaveLength(1);
  });
  it('places the exact promotion after every original dialogue page', () => {
    const text = 'Original dialogue! '.repeat(30);
    const pages = buildScript([tweet('1', 'alice', text)], assets, measure);
    const firstPromotion = pages.findIndex(p => p.promotion);
    expect(pages.slice(0, firstPromotion).map(p => p.text).join('')).toBe(text);
    expect(pages.slice(firstPromotion).every(p => p.promotion && p.character.id === 'phoenix' && !p.tweetId)).toBe(true);
    expect(pages.slice(firstPromotion).map(p => p.text).join('')).toBe(SETTINGS.promotion.text);
    expect(pages[firstPromotion].objection).toBe(true);
    expect(pages[firstPromotion].speaker).toContain('AceAttorTWExtension');
    expect(pages.every(p => p.duration - p.typing - p.lead >= 2.299)).toBe(true);
  });
  it('supports long conversations and explicitly rejects oversized videos', () => {
    const pages = buildScript(Array.from({ length: 100 }, (_, i) => tweet(String(i), `user${i % 5}`, `Message number ${i}`)), assets, measure);
    expect(pages.filter(p => !p.promotion)).toHaveLength(100); expect(scriptDuration(pages)).toBeGreaterThan(300);
    expect(() => buildScript([tweet('1', 'alice', 'Long '.repeat(10000))], assets, measure)).toThrow('20 minutes');
  });
  it('does not substitute deleted messages and supports centrally disabling promotion', () => {
    expect(() => buildScript([tweet('1', 'alice', '')], assets, measure)).toThrow('Select');
    const pages = buildScript([tweet('1', 'alice', 'Hello')], assets, measure, { ...SETTINGS.promotion, enabled: false });
    expect(pages.some(p => p.promotion)).toBe(false);
  });
  it('uses capability detection for MP4 and an honestly labelled fallback', () => {
    expect(recordingType(t => t.startsWith('video/mp4'))).toContain('avc1');
    expect(recordingType(t => t.includes('vp8'))).toContain('webm');
    expect(() => recordingType(() => false)).toThrow('cannot record');
  });
  it('opens a prepared composer without requesting publication', () => {
    const url = new URL(composerUrl()); expect(url.origin).toBe('https://x.com');
    expect(url.pathname).toBe('/intent/post'); expect(url.searchParams.get('text')).toBe(SETTINGS.postText);
    expect([...url.searchParams.keys()]).toEqual(['text']);
  });
});
