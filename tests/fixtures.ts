export const tweetHtml = (id: string, username: string, text: string, parent?: string) => `
<article data-testid="tweet">
  <div data-testid="User-Name"><a href="/${username}"><span>${username} Display</span></a><a href="/${username}/status/${id}"><time datetime="2026-10-17">Oct 17</time></a></div>
  ${parent ? `<div data-testid="reply-to"><a href="/parent/status/${parent}">Replying to parent</a></div>` : ''}
  <div data-testid="tweetText">${text}</div><div role="group"><button>Reply</button><button>Like</button></div>
</article>`;
export const threadHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:15px system-ui;margin:40px auto;max-width:650px;color-scheme:light dark}article{padding:20px;border:1px solid #888;margin:10px}a{color:#1d9bf0}
@media(prefers-color-scheme:dark){body{background:#111;color:white}}
</style></head><body><main data-testid="primaryColumn">
${tweetHtml('100', 'Alice', 'The evidence says hello! ⚖️')}
${tweetHtml('101', 'Bob', '¡Objeción! Hola, mundo. 👩🏽‍⚖️', '100')}
${tweetHtml('102', 'Carol', 'Unrelated branch — do not select me automatically.')}
${tweetHtml('103', 'Deleted', '')}
</main></body></html>`;

// Matches the live failure: a GIF in the root, no exposed parent IDs, and a
// focused tweet after three context messages. placementTracking is not an ad.
export const mediaThreadHtml = `<!doctype html><html><meta charset="utf-8"><body><main data-testid="primaryColumn">
${tweetHtml('200', 'Root', 'First paragraph.\n\nThe complete second paragraph about courtroom videos.').replace('</article>', '<div data-testid="placementTracking"><div data-testid="videoPlayer"><div data-testid="videoComponent">GIF</div></div></div></article>')}
${tweetHtml('201', 'Builder', 'The code is available. We could build an extension.')}
${tweetHtml('202', 'Reader', 'That would be sick.')}
${tweetHtml('203', 'Latest', 'Mañana me pongo con ello va')}
</main></body></html>`;
