import { describe, expect, it } from 'vitest';
import { extractConversation, visibleText } from '../../extension/src/content/extract';
import { statusFromUrl, validateConversation, verifiedChain } from '../../extension/src/services/conversation';
import { threadHtml, tweetHtml, mediaThreadHtml } from '../fixtures';

function extract() { document.body.innerHTML = threadHtml; return extractConversation(document, 'https://x.com/Bob/status/101', '101'); }
describe('visible conversation extraction', () => {
  it('keeps a GIF-bearing root, its full multiline text, and source order', () => {
    document.body.innerHTML = mediaThreadHtml;
    const result = extractConversation(document, 'https://x.com/Latest/status/203', '203');
    expect(result.tweets.map(tweet => tweet.id)).toEqual(['200', '201', '202', '203']);
    expect(result.tweets[0].text).toBe('First paragraph.\n\nThe complete second paragraph about courtroom videos.');
    expect([...verifiedChain(result)]).toEqual(['203']);
    expect(result.tweets.every(tweet => tweet.parentId === undefined)).toBe(true);
  });
  it('excludes explicitly marked promotions without using media tracking as an ad signal', () => {
    document.body.innerHTML = mediaThreadHtml;
    document.querySelectorAll('article')[1].insertAdjacentHTML('beforeend', '<span data-testid="promotedIndicator">Ad</span>');
    const result = extractConversation(document, 'https://x.com/Latest/status/203', '203');
    expect(result.tweets.map(tweet => tweet.id)).toEqual(['200', '202', '203']);
  });
  it('collects authors, IDs, text, explicit parents and loaded order', () => {
    const result = extract(); expect(result.tweets).toHaveLength(4);
    expect(result.tweets[1]).toMatchObject({ id: '101', username: 'Bob', parentId: '100', order: 1, text: '¡Objeción! Hola, mundo. 👩🏽‍⚖️' });
    expect([...verifiedChain(result)]).toEqual(['101', '100']);
  });
  it('does not claim unrelated branches are a linear chain', () => {
    const result = extract(); delete result.tweets[1].parentId;
    expect([...verifiedChain(result)]).toEqual(['101']);
    expect(result.warnings.join(' ')).toContain('separate branches');
  });
  it('preserves emoji images, Unicode and line breaks', () => {
    document.body.innerHTML = '<div id="text">Español &amp; English <img alt="👩🏽‍⚖️"><br>日本語 مرحبا</div>';
    expect(visibleText(document.getElementById('text')!)).toBe('Español & English 👩🏽‍⚖️\n日本語 مرحبا');
  });
  it('excludes nested quoted tweets and duplicate timeline entries', () => {
    document.body.innerHTML = `<main>${tweetHtml('1', 'Author', 'Original text')}${tweetHtml('1', 'Author', 'Original text')}</main>`;
    document.querySelector('article')!.insertAdjacentHTML('afterbegin', `<div data-testid="quoteTweet">${tweetHtml('99', 'Quote', 'Quoted text')}</div>`);
    const result = extractConversation(document, 'https://twitter.com/Author/status/1', '1');
    expect(result.tweets.map(t => t.id)).toEqual(['1']); expect(result.tweets[0].text).toBe('Original text');
  });
  it('marks unavailable text and never fabricates dialogue', () => {
    const result = extract(); expect(result.tweets[3].unavailable).toBe(true); expect(result.tweets[3].text).toBe('');
    expect(result.warnings.join(' ')).toContain('missing');
  });
  it('handles cycles in explicit parent links without looping', () => {
    const result = extract(); result.tweets[0].parentId = '101'; expect(verifiedChain(result).size).toBe(2);
  });
  it('rejects non-X URLs, duplicate IDs and oversized payloads', () => {
    expect(statusFromUrl('https://evil.example/Alice/status/1')).toBeUndefined();
    expect(statusFromUrl('javascript:alert(1)')).toBeUndefined();
    const result = extract(); result.tweets.push(result.tweets[0]); expect(() => validateConversation(result)).toThrow('duplicate');
    const big = extract(); big.tweets[0].text = 'a'.repeat(25001); expect(() => validateConversation(big)).toThrow('large');
  });
  it('accepts both supported hostnames', () => {
    expect(statusFromUrl('https://twitter.com/Alice/status/1/photo/1')?.id).toBe('1'); expect(validateConversation(extract()).tweets).toHaveLength(4);
  });
});
