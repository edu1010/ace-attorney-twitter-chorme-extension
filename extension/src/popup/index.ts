document.querySelector('button')!.addEventListener('click', () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('studio.html#demo') });
});
