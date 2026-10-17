import type { Conversation, Tweet } from '../types';
import { statusFromUrl } from '../services/conversation';
import { SETTINGS } from '../settings';

function ownElements(article: Element, selector: string): Element[] {
  return [...article.querySelectorAll(selector)].filter(element =>
    element.closest('article') === article && !element.closest('[data-testid="quoteTweet"]'));
}

/** Preserve emoji IMG alt text and explicit line breaks without reading React internals. */
export function visibleText(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? '';
  if (node instanceof Element && node.tagName === 'IMG') return node.getAttribute('alt') ?? '';
  if (node instanceof Element && node.tagName === 'BR') return '\n';
  return [...node.childNodes].map(visibleText).join('');
}

export function extractTweet(article: Element, order: number): Tweet | undefined {
  // X also wraps ordinary GIFs/videos in placementTracking. That wrapper is
  // not evidence of an ad: excluding it drops legitimate conversation roots.
  if (ownElements(article, '[data-testid="promotedIndicator"]').length) return;
  // A timestamp permalink distinguishes the author from mentions and quoted tweets.
  const link = ownElements(article, 'a[href]')
    .find(anchor => anchor.querySelector('time') && statusFromUrl(anchor.getAttribute('href') ?? ''));
  const status = link && statusFromUrl(link.getAttribute('href') ?? '');
  if (!status) return;
  const name = ownElements(article, '[data-testid="User-Name"]')[0];
  const nameLink = name?.querySelector('a');
  const textNode = ownElements(article, '[data-testid="tweetText"]')[0];
  const text = textNode ? visibleText(textNode) : '';
  // Only an explicitly labelled reply-parent permalink establishes a relationship.
  // X normally exposes usernames here, which are insufficient to infer a parent ID.
  const parentLink = ownElements(article, '[data-testid="reply-to"] a[href], [data-testid="replyTo"] a[href]')
    .map(a => statusFromUrl(a.getAttribute('href') ?? '')).find(Boolean);
  return { ...status, displayName: nameLink ? visibleText(nameLink).trim() || status.username : status.username,
    text, url: `https://x.com/${status.username}/status/${status.id}`, parentId: parentLink?.id,
    order, unavailable: !text.trim() };
}

export function extractConversation(root: ParentNode, sourceUrl: string, focusId: string): Conversation {
  const column = root.querySelector('[data-testid="primaryColumn"]') ?? root;
  const tweets: Tweet[] = [];
  const seen = new Set<string>();
  for (const article of column.querySelectorAll('article[data-testid="tweet"], article:has(time)')) {
    const tweet = extractTweet(article, tweets.length);
    if (tweet && !seen.has(tweet.id)) { seen.add(tweet.id); tweets.push(tweet); }
  }
  const warnings = ['Only messages currently loaded in the page were collected. Deleted, collapsed, private, truncated, or unloaded messages may be missing.',
    'Visual order does not prove reply order. Unverified messages may be separate branches or recommendations; select and arrange only the messages you intend to include.'];
  if (tweets.some(tweet => tweet.unavailable)) warnings.push('Some tweets have no available text (possibly media-only). They cannot be rendered as dialogue.');
  if (tweets.length > SETTINGS.maxMessages) warnings.push(`Only ${SETTINGS.maxMessages} loaded messages can be reviewed at once.`);
  // Keep the clicked focus even if the surrounding timeline exceeds the limit.
  const focus = tweets.find(tweet => tweet.id === focusId);
  const limited = tweets.slice(0, SETTINGS.maxMessages);
  if (focus && !limited.includes(focus)) limited[limited.length - 1] = focus;
  return { sourceUrl, focusId, tweets: limited, warnings };
}
