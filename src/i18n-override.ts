/**
 * Force browser locale to en-US to prevent RainbowKit from auto-detecting French
 */

// Override navigator.language to always return en-US
if (typeof window !== 'undefined') {
  Object.defineProperty(window.navigator, 'language', {
    get: () => 'en-US',
    configurable: true,
  });

  Object.defineProperty(window.navigator, 'languages', {
    get: () => ['en-US', 'en'],
    configurable: true,
  });
}

export {};
