import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };
const databaseUrl = (process.env.PRISMA_DATABASE_URL_2 ?? process.env.PRISMA_DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL)?.replace(/sslmode=(prefer|require|verify-ca)/i, "sslmode=verify-full");
if (!databaseUrl) throw new Error("A PostgreSQL connection string is required.");
export const pool = globalForDb.pool ?? new Pool({ connectionString: databaseUrl });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
export const db = drizzle(pool);
