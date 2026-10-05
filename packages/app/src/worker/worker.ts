import { publishPercent, type RunRequest } from './protocol.js';
import { safeHandleRequest } from './safe.js';

self.onmessage = (event: MessageEvent<RunRequest>) => {
  let lastPercent = 0;
  const response = safeHandleRequest(event.data, (completed, total) => {
    const percent = publishPercent(completed, total, lastPercent);
    if (percent === null) {
      return;
    }
    lastPercent = percent;
    self.postMessage({ kind: 'progress', completed, total });
  });
  self.postMessage(response);
};
