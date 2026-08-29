import { loadEnvFile } from "node:process";
import path from "node:path";

// Vitest sets NODE_ENV=test itself; we just need .env.test's other values.
try {
  loadEnvFile(path.resolve(__dirname, ".env.test"));
} catch {
  // .env.test not present — assume env vars are already set (e.g. in CI)
}
