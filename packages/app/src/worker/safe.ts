import { handleRequest } from './request.js';
import { formatWorkerError, type RunRequest, type RunResponse } from './protocol.js';

export function safeHandleRequest(
  request: RunRequest,
  onTick?: (completed: number, total: number) => void,
): RunResponse {
  try {
    return handleRequest(request, onTick);
  } catch (err) {
    const message = formatWorkerError(err);
    console.error('[sim-worker]', message, err);
    return { kind: 'error', message };
  }
}
