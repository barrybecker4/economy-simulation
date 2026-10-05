import { type RunRequest } from './worker-protocol.js';
import { safeHandleRequest } from './worker-safe.js';

export type { RunRequest, RunResponse } from './worker-protocol.js';
export { handleRequest } from './run-request.js';
export { safeHandleRequest } from './worker-safe.js';

self.onmessage = (event: MessageEvent<RunRequest>) => {
  self.postMessage(safeHandleRequest(event.data));
};
