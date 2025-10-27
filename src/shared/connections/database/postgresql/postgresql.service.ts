import { Pool, PoolConfig, QueryResult } from 'pg';
import { DatabaseAbstract } from '../abstract/abstract.database';
import { RpcException } from '@nestjs/microservices';
import { environments } from '../../../../settings/environments/environments';
import { statusCode } from '../../../../settings/environments/status-code';

class DatabaseError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseServicePostgreSQL extends DatabaseAbstract {
  private static instance: DatabaseServicePostgreSQL;
  private pool: Pool;
  private isConnected: boolean = false;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000;
  private readonly queryTimeoutMs: number = 10000;

  public constructor() {
    super();
    this.validateConfig();
    console.log(environments.DATABASE_HOST, environments.DATABASE_NAME, environments.DATABASE_PASSWORD, environments.DATABASE_PORT, environments.DATABASE_USER)
    const poolConfig: PoolConfig = {
      user: environments.DATABASE_USER,
      host: environments.DATABASE_HOST,
      password: environments.DATABASE_PASSWORD,
      database: environments.DATABASE_NAME,
      port: environments.DATABASE_PORT,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(poolConfig);
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      this.isConnected = false;
    });
  }

  public static getInstance(): DatabaseServicePostgreSQL {
    if (!DatabaseServicePostgreSQL.instance) {
      DatabaseServicePostgreSQL.instance = new DatabaseServicePostgreSQL();
    }
    return DatabaseServicePostgreSQL.instance;
  }

  private validateConfig(): void {
    const requiredConfigs = {
      databaseUsername: environments.DATABASE_USER,
      databaseHostname: environments.DATABASE_HOST,
      databasePassword: environments.DATABASE_PASSWORD,
      databaseName: environments.DATABASE_NAME,
      databasePort: environments.DATABASE_PORT
    };

    for (const [key, value] of Object.entries(requiredConfigs)) {
      if (!value) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: `Database configuration error: Missing ${key}`,
        });
      }
    }
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to PostgreSQL');
      return;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.pool.query('SELECT NOW()');
        this.isConnected = true;
        console.log('🛢️ Connected to PostgreSQL successfully 🎉!');
        return;
      } catch (error) {
        const errorMessage = `Attempt ${attempt}/${this.maxRetries} - Failed to connect to PostgreSQL: ${error.message}`;
        console.error(errorMessage);

        if (attempt === this.maxRetries) {
          throw new RpcException({
            statusCode: statusCode.INTERNAL_SERVER_ERROR,
            message: 'Could not connect to PostgreSQL after multiple attempts',
          });
        }

        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * Math.pow(2, attempt)));
      }
    }
  }

  public async transaction<T>(operations: (client: Pool) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: 'Database is not connected',
      });
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operations(client);
      await client.query('COMMIT');
      return result;
    }
    catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = `Transaction failed: ${error.message}`;
      console.error(errorMessage);
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      });
    }
    finally {
      client.release();
    }
  }

  public async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.isConnected) {
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: 'Database is not connected',
      });
    }

    try {
      const result: QueryResult<T> = await Promise.race([
        this.pool.query<T>(sql, params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new RpcException({
            statusCode: statusCode.INTERNAL_SERVER_ERROR,
            message: 'Query timeout',
          })), this.queryTimeoutMs)
        )
      ]) as QueryResult<T>;

      console.log(`Query executed successfully: ${sql.slice(0, 50)}...`);
      return result.rows;
    } catch (error) {
      const errorMessage = `Database query failed: ${error.message}, code: ${error.code}`;
      console.error(errorMessage, { sql, params });
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: error.message,
      });
    }
  }

  public async close(): Promise<void> {
    if (!this.isConnected) {
      console.log('Database connection already closed');
      return;
    }

    try {
      await this.pool.end();
      this.isConnected = false;
      console.log('Database connection closed successfully');
    } catch (error) {
      console.error(`Failed to close database connection: ${error.message}`);
      throw new RpcException({
        statusCode: statusCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to close database connection',
      });
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}