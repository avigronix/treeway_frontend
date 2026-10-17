/// <reference lib="webworker" />
import { parseChallenge, powSearch } from './pow';

// Solves the sign-up proof of work off the main thread. In: the challenge. Out: { nonce }.
self.onmessage = (e: MessageEvent<{ challenge: string }>) => {
  const { salt, bits } = parseChallenge(e.data.challenge);
  let start = 0;
  for (;;) {
    const n = powSearch(salt, bits, start, 50_000);
    if (n !== null) {
      self.postMessage({ nonce: String(n) });
      return;
    }
    start += 50_000;
  }
};
