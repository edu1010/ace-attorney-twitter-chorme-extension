import type { AssetManifest, Conversation, Tweet } from '../types';
import { validateConversation, verifiedChain } from '../services/conversation';
import { buildScript, scriptDuration } from '../renderer/script';
import { FONT } from '../renderer/scene';
import { recordVideo } from '../renderer/record';
import { downloadVideo, postToX } from '../services/publishing';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = element('status'), generate = element<HTMLButtonElement>('generate');
const canvas = element<HTMLCanvasElement>('canvas'), preview = element<HTMLVideoElement>('preview');
const progress = element<HTMLProgressElement>('progress'), cancel = element<HTMLButtonElement>('cancel');
let conversation: Conversation;
let assets: AssetManifest;
let selected = new Set<string>();
let controller: AbortController | undefined;
let videoUrl: string | undefined;
let videoMime = '';
function say(message: string, error = false) { status.textContent = message; status.classList.toggle('error', error); }
function clearVideo() {
  preview.pause(); preview.removeAttribute('src'); preview.load(); preview.hidden = true;
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = undefined; element('result').hidden = true; canvas.hidden = false;
}
function updateSelection() {
  const tweets = conversation.tweets.filter(tweet => selected.has(tweet.id));
  generate.disabled = !!controller || !tweets.length;
  try {
    const ctx = canvas.getContext('2d')!; ctx.font = FONT;
    const pages = buildScript(tweets, assets, text => ctx.measureText(text).width);
    element('selection').textContent = `${tweets.length} selected · about ${Math.ceil(scriptDuration(pages))} seconds including the promotional ending`;
  } catch (error) { element('selection').textContent = error instanceof Error ? error.message : ''; generate.disabled = true; }
}
function renderMessages() {
  const container = element('messages'); container.replaceChildren();
  const verified = verifiedChain(conversation);
  conversation.tweets.forEach((tweet, index) => {
    const card = document.createElement('div'); card.className = 'message';
    const label = document.createElement('label');
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = selected.has(tweet.id); check.disabled = tweet.unavailable || !!controller;
    check.addEventListener('change', () => { if (check.checked) selected.add(tweet.id); else selected.delete(tweet.id); clearVideo(); updateSelection(); });
    const title = document.createElement('span'), author = document.createElement('strong'), relation = document.createElement('small');
    author.textContent = `${tweet.displayName} · @${tweet.username}`;
    relation.textContent = tweet.id === conversation.focusId ? 'Focused tweet' : verified.has(tweet.id) ? 'Verified ancestor' : 'Unverified candidate · may be a separate branch';
    title.append(author, relation); label.append(check, title);
    const body = document.createElement('p'); body.textContent = tweet.text || '[No available text]';
    const actions = document.createElement('div'); actions.className = 'actions';
    const link = document.createElement('a'); link.href = tweet.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'View tweet ↗'; actions.append(link);
    for (const [offset, arrow] of [[-1, '↑'], [1, '↓']] as const) {
      const move = document.createElement('button'); move.className = 'secondary'; move.textContent = arrow;
      move.setAttribute('aria-label', `${offset < 0 ? 'Move up' : 'Move down'} message from ${tweet.username}`);
      move.disabled = !!controller || index + offset < 0 || index + offset >= conversation.tweets.length;
      move.addEventListener('click', () => {
        const other = index + offset; [conversation.tweets[index], conversation.tweets[other]] = [conversation.tweets[other], conversation.tweets[index]];
        clearVideo(); renderMessages();
      }); actions.append(move);
    }
    card.append(label, body, actions); container.append(card);
  });
  updateSelection();
}
function demo(): Conversation {
  const make = (id: string, username: string, text: string, order: number, parentId?: string): Tweet => ({ id, username, displayName: username,
    text, order, parentId, unavailable: false, url: `https://x.com/${username}/status/${id}` });
  return { focusId: '3', sourceUrl: 'https://x.com/Maya/status/3', warnings: ['Sample conversation — these are fictional demonstration messages.'], tweets: [
    make('1', 'Phoenix', 'The evidence is clear. Pineapple belongs on pizza! 🍍', 0),
    make('2', 'Edgeworth', '¡Objeción! Eso no demuestra absolutamente nada.', 1, '1'),
    make('3', 'Maya', 'Can we order lunch before the verdict? ⚖️', 2, '2'),
  ] };
}
generate.addEventListener('click', async () => {
  if (controller) return;
  // AudioContext is resumed in the trusted click before any asynchronous asset work.
  const audio = new AudioContext();
  void audio.resume();
  controller = new AbortController(); clearVideo();
  cancel.hidden = false; element('empty').hidden = true; renderMessages();
  try {
    const ctx = canvas.getContext('2d')!; ctx.font = FONT;
    const pages = buildScript(conversation.tweets.filter(tweet => selected.has(tweet.id)), assets, text => ctx.measureText(text).width);
    const blob = await recordVideo(canvas, pages, assets, controller.signal, (ratio, message) => { progress.value = ratio; say(message); }, audio);
    videoUrl = URL.createObjectURL(blob); videoMime = blob.type;
    preview.src = videoUrl; preview.hidden = false; canvas.hidden = true; element('result').hidden = false;
    element('format').textContent = blob.type.startsWith('video/mp4') ? 'MP4 / H.264 with audio. X may apply its own file size and duration limits.' : 'WebM with audio. X may reject WebM; use a browser with MP4 recording or convert the download using the README instructions.';
    say(`Video ready · ${(blob.size / 1024 / 1024).toFixed(1)} MB. Review it before posting.`);
  } catch (error) {
    say(controller.signal.aborted ? 'Generation cancelled. You can change your selection and try again.' : error instanceof Error ? error.message : 'Generation failed', !controller.signal.aborted);
    progress.value = 0;
  } finally {
    if (audio.state !== 'closed') await audio.close();
    controller = undefined; cancel.hidden = true; renderMessages();
  }
});
cancel.addEventListener('click', () => controller?.abort());
element('download').addEventListener('click', () => { if (videoUrl) downloadVideo(videoUrl, videoMime); });
element('post').addEventListener('click', async () => {
  if (!videoUrl) return;
  try { await postToX(videoUrl, videoMime); say('Download requested. Attach the video in the X composer, review it, and publish when ready.'); }
  catch { say('Could not open X. Download the video and open x.com/compose/post manually.', true); }
});
window.addEventListener('beforeunload', event => { if (controller) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', () => { controller?.abort(); if (videoUrl) URL.revokeObjectURL(videoUrl); });

async function init() {
  await document.fonts.load(FONT);
  const response = await fetch('assets/catalog.json');
  if (!response.ok) throw new Error('Local assets are missing. Run npm run assets and rebuild.');
  assets = await response.json();
  const id = location.hash.slice(1);
  if (id === 'demo') conversation = demo();
  else {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Open a tweet on X and click Create Ace Attorney Courtroom, or use the extension popup demo.');
    const key = `courtroom:${id}`;
    const saved = (await chrome.storage.session.get(key))[key] as { created: number; conversation: unknown } | undefined;
    if (!saved || saved.created < Date.now() - 30 * 60_000) {
      await chrome.storage.session.remove(key); throw new Error('This conversation has expired. Collect it again from X.');
    }
    conversation = validateConversation(saved.conversation);
    // Sensitive page text stays in this panel's memory after the handoff.
    await chrome.storage.session.remove(key);
  }
  const source = element<HTMLAnchorElement>('source'); source.href = conversation.sourceUrl;
  if (id === 'demo') source.hidden = true;
  for (const warning of conversation.warnings) { const p = document.createElement('p'); p.textContent = warning; element('warnings').append(p); }
  selected = verifiedChain(conversation);
  // Selection is independent of presentation order. Keep the collected DOM
  // sequence, including unverified preceding context, until the user reorders it.
  renderMessages(); say('Review the selected messages, then generate your video.');
}
void init().catch(error => say(error instanceof Error ? error.message : 'Unable to load conversation', true));
