import { formatWorkerError, type RunRequest, type RunResponse } from './worker-protocol.js';
import { handleRequest } from './run-request.js';

export function safeHandleRequest(request: RunRequest): RunResponse {
  try {
    return handleRequest(request);
  } catch (err) {
    const message = formatWorkerError(err);
    console.error('[sim-worker]', message, err);
    return { kind: 'error', message };
  }
}
