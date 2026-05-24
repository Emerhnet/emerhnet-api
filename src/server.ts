// Suppress url.parse() deprecation from MongoDB driver — DEP0169 is their bug, not ours.
process.on("warning", (w) => {
  if (
    w.name === "DeprecationWarning" &&
    (w as NodeJS.ErrnoException).code === "DEP0169"
  )
    return;
  process.stderr.write(w.stack ?? w.message);
});

import { createApp } from "./app";
import { env } from "./config/env";
import { connectDb, disconnectDb } from "./config/db";
import { logger } from "./shared/logger";

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      `api listening on http://localhost:${env.PORT}${env.API_PREFIX}`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
