/** Central product and rendering settings. Changes take effect after npm run build. */
export const SETTINGS = {
  promotion: {
    enabled: true,
    speaker: 'Phoenix Wright · AceAttorTWExtension',
    text: 'OBJECTION! You can turn your own X threads into Ace Attorney courtroom battles too! Just install AceAttorTWExtension for Chrome!',
  },
  postText: 'Turned this conversation into an Ace Attorney courtroom battle! ⚖️\n\nCreated with AceAttorTWExtension.',
  maxMessages: 100,
  maxTextLength: 25000,
  maxTotalText: 100000,
  maxDurationSeconds: 1200,
  maxRecordingBytes: 300 * 1024 * 1024,
  fps: 30,
  secondsPerGrapheme: 0.03,
  holdSeconds: 2.3,
};
