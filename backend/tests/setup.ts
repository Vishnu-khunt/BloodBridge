import { db } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { runSeeds } from '../src/db/seed';

export async function setupTestEnvironment(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  await db.init();
  await runMigrations();
  await runSeeds();
}

export async function teardownTestEnvironment(): Promise<void> {
  await db.close();
}

// Mocha root hooks plugin
export const mochaHooks = {
  async beforeAll(this: any) {
    if (this && this.timeout) {
      this.timeout(30000);
    }
    await setupTestEnvironment();
  },
  async afterAll() {
    await teardownTestEnvironment();
  },
};
