import { validateConversation } from '../services/conversation';

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'OPEN_STUDIO') return;
  void (async () => {
    try {
      const origin = new URL(sender.url ?? '').origin;
      if (!sender.tab || !['https://x.com', 'https://twitter.com'].includes(origin)) throw new Error('Unsupported source');
      const conversation = validateConversation(message.conversation);
      const entries = await chrome.storage.session.get(null);
      const stale = Object.keys(entries).filter(key => key.startsWith('courtroom:') && (entries[key] as { created: number }).created < Date.now() - 30 * 60_000);
      if (stale.length) await chrome.storage.session.remove(stale);
      const id = crypto.randomUUID();
      await chrome.storage.session.set({ [`courtroom:${id}`]: { conversation, created: Date.now() } });
      try { await chrome.tabs.create({ url: chrome.runtime.getURL(`studio.html#${id}`) }); }
      catch (error) { await chrome.storage.session.remove(`courtroom:${id}`); throw error; }
      respond({ ok: true });
    } catch (error) { respond({ ok: false, error: error instanceof Error ? error.message : 'Unable to open studio' }); }
  })();
  return true;
});
