// Local dev database: runs PGlite in ONE dedicated process and exposes it
// over the Postgres wire protocol on 127.0.0.1:5433. The app, drizzle-kit,
// and seed scripts all connect as normal Postgres clients, which eliminates
// the corruption caused by multiple processes opening ./.pglite directly.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.PGLITE_PORT ?? 5433);

async function main() {
  const db = await PGlite.create("./.pglite");
  const server = new PGLiteSocketServer({
    db,
    port: PORT,
    host: "127.0.0.1",
    // Cover the app's connection pool plus drizzle-kit/seed scripts running
    // alongside; queries are multiplexed onto the single PGlite instance.
    maxConnections: 20,
  });
  await server.start();
  console.log(`PGlite dev database listening on 127.0.0.1:${PORT}`);

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    console.log("Shutting down dev database…");
    await server.stop().catch(() => {});
    await db.close().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Dev database failed to start:", err);
  process.exit(1);
});
