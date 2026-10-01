import { buildApp } from './app.js';
import { closeDatabase, createDatabase } from './config/database.js';
import { loadConfig, requireDatabaseUrl } from './config/env.js';

const config = loadConfig();
const database = createDatabase(requireDatabaseUrl(config));
const app = buildApp({ config, database });

const shutdown = async () => {
  await app.close();
  await closeDatabase(database);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  await shutdown();
  process.exitCode = 1;
}
