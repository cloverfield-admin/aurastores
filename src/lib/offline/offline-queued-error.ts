export class OfflineQueuedError extends Error {
  readonly code = "OFFLINE_QUEUED" as const;

  constructor(message = "Changes were saved and will sync when you are back online.") {
    super(message);
    this.name = "OfflineQueuedError";
  }
}

export function isOfflineQueuedError(err: unknown): err is OfflineQueuedError {
  return err instanceof OfflineQueuedError;
}
