import { extractConversation, extractTweet } from './extract';
import { statusFromUrl } from '../services/conversation';

let scheduled = false;
function scan() {
  scheduled = false;
  const applicable = statusFromUrl(location.href);
  document.querySelectorAll<HTMLElement>('ace-attortw-action').forEach(host => {
    if (!applicable || !host.closest('article')) host.remove();
  });
  if (!applicable) return;
  const column = document.querySelector('[data-testid="primaryColumn"]') ?? document;
  for (const article of column.querySelectorAll('article[data-testid="tweet"], article:has(time)')) {
    if (article.querySelector('ace-attortw-action') || !extractTweet(article, 0)) continue;
    const actions = article.querySelector('[role="group"]');
    if (!actions) continue;
    const host = document.createElement('ace-attortw-action');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ':host{display:block;margin:10px 0 4px}button{font:600 13px system-ui;color:#1d9bf0;background:transparent;border:1px solid #536471;border-radius:999px;padding:8px 14px;cursor:pointer}button:hover{background:#1d9bf022}button:focus-visible{outline:2px solid #1d9bf0;outline-offset:3px}p{font:13px system-ui;color:inherit}';
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Create Ace Attorney Courtroom';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    button.addEventListener('click', async event => {
      event.preventDefault(); event.stopPropagation();
      button.disabled = true;
      try {
        const tweet = extractTweet(article, 0);
        if (!tweet) throw new Error('Tweet changed. Reopen the thread and try again.');
        const conversation = extractConversation(document, location.href, tweet.id);
        const response = await chrome.runtime.sendMessage({ type: 'OPEN_STUDIO', conversation });
        if (!response?.ok) throw new Error(response?.error ?? 'Unable to open the courtroom panel');
        status.textContent = 'Courtroom opened in a new tab.';
      } catch (error) { status.textContent = error instanceof Error ? error.message : 'Reload X after updating the extension.'; }
      finally { button.disabled = false; }
    });
    shadow.append(style, button, status);
    actions.insertAdjacentElement('afterend', host);
  }
}
function schedule() {
  if (!scheduled) { scheduled = true; setTimeout(scan, 180); }
}
const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
// pushState does not emit popstate. Check only the URL, not the entire DOM.
let lastUrl = location.href;
setInterval(() => { if (lastUrl !== location.href) { lastUrl = location.href; schedule(); } }, 800);
schedule();
