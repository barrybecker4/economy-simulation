import { publishPercent, type RunRequest } from './worker-protocol.js';
import { safeHandleRequest } from './worker-safe.js';

export type { RunProgress, RunRequest, RunResponse, WorkerMessage } from './worker-protocol.js';
export { handleRequest } from './run-request.js';
export { safeHandleRequest } from './worker-safe.js';

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
