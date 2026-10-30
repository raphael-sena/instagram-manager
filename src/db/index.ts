import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

let pool: Pool | undefined;

function criar() {
  pool = new Pool({ connectionString: env().DATABASE_URL, max: 5 });
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

let instancia: ReturnType<typeof criar> | undefined;
export const db = () => (instancia ??= criar());

export async function fecharDb() {
  await pool?.end();
  pool = undefined;
  instancia = undefined;
}
