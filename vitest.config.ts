import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests never load deployment credentials. Database/live verification must
// explicitly supply an isolated test environment through the verification script.
export default defineConfig({
  resolve: {
    alias: {
      "@": dirname(fileURLToPath(import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
