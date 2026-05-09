import { Pool, PoolConfig, QueryResult, PoolClient } from 'pg';
import { DatabaseAbstract, IDatabaseClient, MutationResponse } from '../abstract/abstract.database';
import { RpcException } from '@nestjs/microservices';
import { environments } from '../../../../settings/environments/environments';
import { statusCode } from '../../../../settings/environments/status-code';

export class PostgreSQLClientWrapper implements IDatabaseClient {
  constructor(private readonly client: PoolClient) {}

  async query<T>(
    sql: string,
    params?: any[],
  ): Promise<T[]> {
    let pIndex = 0;
    const translatedSql = sql.replace(/\?/g, () => '$' + (++pIndex));
    const result: QueryResult<T> = await this.client.query<T>(translatedSql, params);
    return result.rows;
  }

  async execute(sql: string, params?: any[]): Promise<MutationResponse> {
    let pIndex = 0;
    const translatedSql = sql.replace(/\?/g, () => '$' + (++pIndex));
    const result = await this.client.query(translatedSql, params);
    return {
      affectedRows: result.rowCount || 0,
    };
  }

  async release(): Promise<void> {
    this.client.release();
  }
}

export class DatabaseServicePostgreSQL extends DatabaseAbstract {
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  public constructor() {
    super();
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.pool) return;
    try {
      const poolConfig: PoolConfig = {
        user: environments.DATABASE_USER,
        host: environments.DATABASE_HOST,
        password: environments.DATABASE_PASSWORD,
        database: environments.DATABASE_NAME,
        port: Number(environments.DATABASE_PORT),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
      this.pool = new Pool(poolConfig);
      // We check connection but we don't throw to avoid crashing the container at startup
      await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      console.log('✅ PostgreSQL Connected Successfully');
    } catch (error) {
      console.error('❌ PostgreSQL Connection Failed (Non-fatal at startup):', error.message);
      this.isConnected = false;
      // We don't throw here so the NestJS bootstrap can finish
    }
  }

  public async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.isConnected) {
        // Here we DO throw because it's an actual request failing
        await this.connect();
        if (!this.isConnected) {
            throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'Database connection is down' });
        }
    }
    try {
      let pIndex = 0;
      const translatedSql = sql.replace(/\?/g, () => '$' + (++pIndex));
      const result = await this.pool!.query<T>(translatedSql, params);
      return result.rows;
    } catch (error) {
      console.error('PostgreSQL query failed:', error);
      throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: error.message });
    }
  }

  public async execute(sql: string, params: any[] = []): Promise<MutationResponse> {
    if (!this.isConnected) {
        await this.connect();
        if (!this.isConnected) {
            throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'Database connection is down' });
        }
    }
    try {
      let pIndex = 0;
      const translatedSql = sql.replace(/\?/g, () => '$' + (++pIndex));
      const result = await this.pool!.query(translatedSql, params);
      return {
        affectedRows: result.rowCount || 0,
      };
    } catch (error) {
      console.error('PostgreSQL execution failed:', error);
      throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: error.message });
    }
  }

  public async transaction<T>(operations: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
        await this.connect();
        if (!this.isConnected) {
             throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'Database connection is down' });
        }
    }
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const wrapper = new PostgreSQLClientWrapper(client);
      const result = await operations(wrapper);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async getClient(): Promise<IDatabaseClient> {
    if (!this.isConnected) {
        await this.connect();
        if (!this.isConnected) {
             throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'Database connection is down' });
        }
    }
    const client = await this.pool!.connect();
    return new PostgreSQLClientWrapper(client);
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }
}
