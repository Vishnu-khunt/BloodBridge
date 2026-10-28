import fs from 'fs';
import path from 'path';
import { db } from './client';

export async function runMigrations(): Promise<void> {
  console.log('[Database] Initializing database migrations...');
  await db.init();

  // Ensure migrations tracking table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  let migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.resolve(__dirname, '../../src/db/migrations');
  }
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const existing = await db.query(
      'SELECT id FROM _migrations WHERE name = $1',
      [file]
    );

    if (existing.rowCount === 0) {
      console.log(`[Database] Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await db.transaction(async (tx) => {
        // Execute the migration DDL
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          await tx.query(stmt);
        }

        await tx.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      });
      console.log(`[Database] Successfully applied: ${file}`);
    } else {
      console.log(`[Database] Already applied: ${file}`);
    }
  }

  console.log('[Database] All migrations applied successfully.');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Database] Migration failed:', err);
      process.exit(1);
    });
}
