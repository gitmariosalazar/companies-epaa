export abstract class DatabaseAbstract {
  abstract connect(): Promise<void>;
  abstract query<T>(sql: string, params?: any[]): Promise<T[]>;
  abstract close(): Promise<void>;
}