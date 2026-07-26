import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema.js";

export type DbClient = DrizzleD1Database<typeof schema>;

export function createDbClient(env: { DB: D1Database }): DbClient {
  return drizzle(env.DB, { schema }) as unknown as DbClient;
}
