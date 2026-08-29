import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // Matches Next.js's own bundler condition for the "server-only" package
    // marker, so importing server-only modules in tests doesn't throw.
    conditions: ["react-server"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share one Postgres database and each test truncates
    // it in beforeEach — running test files concurrently causes one file's
    // truncate to wipe rows another file is mid-transaction with (FK
    // violations, deadlocks). Serialize file execution to keep them isolated.
    fileParallelism: false,
  },
});
