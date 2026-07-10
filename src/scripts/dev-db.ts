/**
 * Local development database (no system Postgres needed).
 *
 * Starts an embedded PostgreSQL on port 5433 with a persistent data dir at
 * .devdb/. First run initializes the cluster and creates the `eidos` database.
 *
 * Usage:  npm run dev:db     (keep it running in its own terminal)
 * Then:   npx prisma migrate deploy && npm run prisma:seed && npm run dev
 */
// embedded-postgres only exposes an `exports` map (no `types`/`main`), which
// the node10 moduleResolution used by this project cannot see - runtime is fine.
// @ts-ignore
import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(__dirname, "../../.devdb");
const PORT = 5433;

async function main() {
  const firstRun = !fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "eidos",
    password: "eidos",
    port: PORT,
    persistent: true,
  });

  if (firstRun) {
    console.log("🐘 Initializing embedded Postgres cluster...");
    await pg.initialise();
  }

  await pg.start();

  if (firstRun) {
    await pg.createDatabase("eidos");
    console.log("🐘 Created database 'eidos'");
  }

  console.log(`🐘 Postgres running on port ${PORT}`);
  console.log(`   DATABASE_URL=postgresql://eidos:eidos@localhost:${PORT}/eidos`);
  console.log("   Press Ctrl+C to stop.");

  const stop = async () => {
    console.log("\n🐘 Stopping Postgres...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch(error => {
  console.error("❌ dev-db error:", error);
  process.exit(1);
});
