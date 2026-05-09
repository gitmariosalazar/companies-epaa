import { AsyncLocalStorage } from 'async_hooks';

export interface AuditContext {
  userId?: string;
  userName?: string;
  ip?: string;
  sessionId?: string;
  userAgent?: string;
}

export class AuditContextStorage {
  private static readonly storage = new AsyncLocalStorage<AuditContext>();

  static run(context: AuditContext, callback: () => any) {
    return this.storage.run(context, callback);
  }

  static getContext(): AuditContext | undefined {
    return this.storage.getStore();
  }
}
