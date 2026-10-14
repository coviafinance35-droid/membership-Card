import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as unknown as { pool?: Pool };
const databaseUrl = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL_3)?.replace(/sslmode=(prefer|require|verify-ca)/i, "sslmode=verify-full");

// Keep route modules importable during static build; the first query still fails clearly when misconfigured.
export const pool = globalForDb.pool ?? new Pool({ connectionString: databaseUrl ?? "postgresql://missing:missing@localhost:5432/missing", connectionTimeoutMillis: 5000 });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
export const db = drizzle(pool, { schema });
