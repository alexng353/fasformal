import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import * as schema from "./schema";

// Load root .env if DATABASE_URL not already set
if (!process.env.DATABASE_URL) {
  const envPath = resolve(__dirname, "../../../../.env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
