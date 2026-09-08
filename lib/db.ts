import postgres from "postgres";

declare global {
  var __xenoSql: ReturnType<typeof postgres> | undefined;
}

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://xeno:xeno_local_dev@localhost:5433/xeno_lab";

export const sql =
  global.__xenoSql ??
  postgres(connectionString, {
    ssl: connectionString.includes("sslmode=require") ? "require" : undefined,
    max: 5,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  global.__xenoSql = sql;
}
