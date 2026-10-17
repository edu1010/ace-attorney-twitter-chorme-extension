import { SETTINGS } from '../settings';
export const composerUrl = () => `https://x.com/intent/post?text=${encodeURIComponent(SETTINGS.postText)}`;
export function downloadVideo(url: string, mime: string) {
  const anchor = document.createElement('a'); anchor.href = url;
  anchor.download = `AceAttorTWExtension-${new Date().toISOString().replace(/[:.]/g, '-')}.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`;
  document.body.append(anchor); anchor.click(); anchor.remove();
}
export function postToX(url: string, mime: string) {
  downloadVideo(url, mime);
  // Deliberate manual attachment fallback. No DOM file injection or publish click.
  return chrome.tabs.create({ url: composerUrl() });
}
