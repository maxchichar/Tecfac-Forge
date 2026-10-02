import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import { defineConfig } from "vitest/config";

// Pre-load .env.local so that environment variables (like DATABASE_URL)
// are present before PrismaClient or other singletons are evaluated.
const envPath = resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

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
