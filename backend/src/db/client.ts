import { Pool, PoolClient } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { env } from '../config/env';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface TransactionClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}

class DatabaseManager {
  private pgPool: Pool | null = null;
  private pglite: PGlite | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (env.USE_IN_MEMORY_DB || !env.DATABASE_URL) {
      this.pglite = new PGlite();
      this.initialized = true;
    } else {
      this.pgPool = new Pool({
        connectionString: env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      try {
        const client = await this.pgPool.connect();
        client.release();
        this.initialized = true;
      } catch (err) {
        console.warn(
          'Could not connect to external PostgreSQL at DATABASE_URL, falling back to embedded PGlite engine:',
          (err as Error).message
        );
        this.pgPool = null;
        this.pglite = new PGlite();
        this.initialized = true;
      }
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.initialized) await this.init();

    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
      };
    }

    if (this.pglite) {
      const res = await this.pglite.query<T>(sql, params);
      return {
        rows: res.rows,
        rowCount: res.rows.length,
      };
    }

    throw new Error('Database not initialized');
  }

  async exec(sql: string): Promise<void> {
    if (!this.initialized) await this.init();

    if (this.pgPool) {
      await this.pgPool.query(sql);
    } else if (this.pglite) {
      await this.pglite.exec(sql);
    }
  }

  async transaction<T>(callback: (client: TransactionClient) => Promise<T>): Promise<T> {
    if (!this.initialized) await this.init();

    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const wrappedClient: TransactionClient = {
          query: async <R = any>(text: string, params: any[] = []) => {
            const res = await client.query(text, params);
            return { rows: res.rows as R[], rowCount: res.rowCount ?? res.rows.length };
          },
        };
        const result = await callback(wrappedClient);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    if (this.pglite) {
      return await this.pglite.transaction(async (tx) => {
        const wrappedClient: TransactionClient = {
          query: async <R = any>(text: string, params: any[] = []) => {
            const res = await tx.query<R>(text, params);
            return { rows: res.rows, rowCount: res.rows.length };
          },
        };
        return await callback(wrappedClient);
      });
    }

    throw new Error('Database not initialized');
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = null;
    }
    this.initialized = false;
  }
}

export const db = new DatabaseManager();
