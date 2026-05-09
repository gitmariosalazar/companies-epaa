import * as mysql from 'mysql2/promise';
import { DatabaseAbstract, IDatabaseClient, MutationResponse } from '../abstract/abstract.database';
import { RpcException } from '@nestjs/microservices';
import { environments } from '../../../../settings/environments/environments';
import { statusCode } from '../../../../settings/environments/status-code';

export class MySQLClientWrapper implements IDatabaseClient {
  constructor(private readonly client: mysql.PoolConnection) {}

  async query<T>(
    sql: string,
    params?: any[],
  ): Promise<T[]> {
    const translatedSql = sql.replace(/\$(\d+)/g, '?');
    const [rows]: [any, any] = await this.client.query(translatedSql, params);
    return Array.isArray(rows) ? rows as T[] : [];
  }

  async execute(sql: string, params?: any[]): Promise<MutationResponse> {
    const translatedSql = sql.replace(/\$(\d+)/g, '?');
    const [result]: [any, any] = await this.client.execute(translatedSql, params);
    return {
      affectedRows: result.affectedRows || 0,
      insertId: result.insertId,
    };
  }

  async release(): Promise<void> {
    this.client.release();
  }
}

export class DatabaseServiceMySQL extends DatabaseAbstract {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;

  constructor() {
    super();
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.pool) return;

    try {
      const config: mysql.PoolOptions = {
        host: environments.DATABASE_HOST,
        port: Number(environments.DATABASE_PORT),
        user: environments.DATABASE_USER,
        password: environments.DATABASE_PASSWORD,
        database: environments.DATABASE_NAME,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        connectTimeout: 5000,
      };

      this.pool = mysql.createPool(config);
      const connection = await this.pool.getConnection();
      connection.release();
      
      this.isConnected = true;
      console.log('✅ MySQL Connected Successfully');
    } catch (error) {
      console.error('❌ MySQL Connection Failed (Non-fatal at startup):', error.message);
      this.isConnected = false;
      // We don't throw here to allow NestJS bootstrap
    }
  }

  public async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.isConnected) {
      await this.connect();
      if (!this.isConnected) {
        throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'MySQL connection is down' });
      }
    }

    try {
      const translatedSql = sql.replace(/\$(\d+)/g, '?');
      const [rows]: [any, any] = await this.pool!.query(translatedSql, params);
      return Array.isArray(rows) ? rows as T[] : [];
    } catch (error) {
      console.error('Database query failed:', error);
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
      });
    }
  }

  public async execute(sql: string, params: any[] = []): Promise<MutationResponse> {
    if (!this.isConnected) {
      await this.connect();
      if (!this.isConnected) {
        throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'MySQL connection is down' });
      }
    }

    try {
      const translatedSql = sql.replace(/\$(\d+)/g, '?');
      const [result]: [any, any] = await this.pool!.execute(translatedSql, params);
      return {
        affectedRows: result.affectedRows || 0,
        insertId: result.insertId,
      };
    } catch (error) {
      console.error('Database execution failed:', error);
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: 'Database mutation failed',
      });
    }
  }

  public async transaction<T>(
    operations: (client: IDatabaseClient) => Promise<T>,
  ): Promise<T> {
    if (!this.isConnected) {
      await this.connect();
      if (!this.isConnected) {
        throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'MySQL connection is down' });
      }
    }

    const connection = await this.pool!.getConnection();

    try {
      await connection.beginTransaction();
      const wrapper = new MySQLClientWrapper(connection);
      const result = await operations(wrapper);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      console.error('Transaction failed:', error);
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: 'Transaction failed',
      });
    } finally {
      connection.release();
    }
  }

  public async getClient(): Promise<IDatabaseClient> {
    if (!this.isConnected) {
        await this.connect();
        if (!this.isConnected) {
             throw new RpcException({ statusCode: statusCode.INTERNAL_SERVER_ERROR, message: 'MySQL connection is down' });
        }
    }
    const connection = await this.pool!.getConnection();
    return new MySQLClientWrapper(connection);
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }
}
