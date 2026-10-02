import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// ESLint 9 flat config.
//
// eslint-config-next@15 does not ship a native flat config yet, so the legacy
// (`.eslintrc`) presets are bridged through FlatCompat — the same approach the
// official Next.js template uses. `next lint` was deprecated and removed the
// non-interactive path in this version; plain `eslint .` is the supported tool.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "next-env.d.ts", "coverage/**"],
  },
];

export default config;
