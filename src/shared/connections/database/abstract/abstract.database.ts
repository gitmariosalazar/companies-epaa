export interface QueryResponse<T> {
  rows: T[];
  rowCount: number;
  affectedRows?: number;
  insertId?: any;
}

export interface MutationResponse {
  affectedRows: number;
  insertId?: any;
}

export interface IDatabaseClient {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<MutationResponse>;
  release(): Promise<void>;
}

export abstract class DatabaseAbstract {
  abstract connect(): Promise<void>;
  abstract query<T>(sql: string, params?: any[]): Promise<T[]>;
  abstract execute(sql: string, params?: any[]): Promise<MutationResponse>;
  abstract transaction<T>(operations: (client: IDatabaseClient) => Promise<T>): Promise<T>;
  abstract getClient(): Promise<IDatabaseClient>;
  abstract close(): Promise<void>;
}
