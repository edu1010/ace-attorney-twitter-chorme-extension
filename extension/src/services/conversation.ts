import { SETTINGS } from '../settings';
import type { Conversation, Tweet } from '../types';

export function statusFromUrl(value: string, base = 'https://x.com'): { id: string; username: string } | undefined {
  try {
    const url = new URL(value, base);
    if (!['x.com', 'twitter.com'].includes(url.hostname) || url.protocol !== 'https:') return;
    const match = /^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)(?:\/|$)/.exec(url.pathname);
    if (match) return { username: match[1], id: match[2] };
  } catch { /* Malformed links are not tweets. */ }
}

/** Returns only the focus and explicitly proven ancestors; visual order is not proof of a reply. */
export function verifiedChain(conversation: Conversation): Set<string> {
  const byId = new Map(conversation.tweets.map(tweet => [tweet.id, tweet]));
  const selected = new Set<string>();
  let current = byId.get(conversation.focusId);
  while (current && !selected.has(current.id)) {
    if (!current.unavailable) selected.add(current.id);
    else break;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return selected;
}

export function validateConversation(value: unknown): Conversation {
  if (!value || typeof value !== 'object') throw new Error('Invalid conversation');
  const data = value as Conversation;
  if (!Array.isArray(data.tweets) || !data.tweets.length || data.tweets.length > SETTINGS.maxMessages) throw new Error('Invalid message count');
  if (!statusFromUrl(data.sourceUrl) || !/^\d+$/.test(data.focusId)) throw new Error('Invalid source thread');
  const ids = new Set<string>();
  let textLength = 0;
  const tweets: Tweet[] = data.tweets.map((tweet, order) => {
    if (!tweet || typeof tweet.id !== 'string' || !/^\d+$/.test(tweet.id) || ids.has(tweet.id)) throw new Error('Invalid or duplicate tweet ID');
    ids.add(tweet.id);
    if (typeof tweet.username !== 'string' || !/^[A-Za-z0-9_]{1,15}$/.test(tweet.username)) throw new Error('Invalid username');
    if (typeof tweet.displayName !== 'string' || tweet.displayName.length > 200 || typeof tweet.text !== 'string' || tweet.text.length > SETTINGS.maxTextLength) throw new Error('Message is too large');
    textLength += tweet.text.length;
    if (statusFromUrl(tweet.url)?.id !== tweet.id) throw new Error('Invalid tweet link');
    return { id: tweet.id, username: tweet.username, displayName: tweet.displayName, text: tweet.text, url: tweet.url,
      order, unavailable: !tweet.text.trim() || tweet.unavailable === true,
      parentId: typeof tweet.parentId === 'string' && /^\d+$/.test(tweet.parentId) && tweet.parentId !== tweet.id ? tweet.parentId : undefined };
  });
  if (textLength > SETTINGS.maxTotalText || !ids.has(data.focusId)) throw new Error('Conversation too large or focused tweet unavailable');
  return { focusId: data.focusId, sourceUrl: data.sourceUrl, tweets,
    warnings: Array.isArray(data.warnings) ? data.warnings.filter((w): w is string => typeof w === 'string').slice(0, 10).map(w => w.slice(0, 500)) : [] };
}
