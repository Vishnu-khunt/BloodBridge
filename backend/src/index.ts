import { createApp } from './app';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import { runSeeds } from './db/seed';

async function bootstrap() {
  console.log('======================================================');
  console.log('Starting BloodBridge Backend Services');
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log('======================================================');

  // 1. Run migrations and demo seeds
  try {
    await runMigrations();
    await runSeeds();
  } catch (err) {
    console.error('Initialization error during database migration/seed:', err);
    process.exit(1);
  }

  // 2. Start HTTP server
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[Server] BloodBridge API is listening on port ${env.PORT}`);
    console.log(`[Server] Health check: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`[Server] Demo accounts: http://localhost:${env.PORT}/api/v1/auth/demo-accounts`);
  });
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}
