/**
 * AgroOps — Vitest config
 *
 * Tests unitarios + integración. Carga `.env.local` para los tests que
 * tocan la DB (services.ts). Path alias `@/*` igual que Next.js.
 *
 * Cobertura mínima por SDD-07:
 * - services.ts ≥ 80% líneas + 80% branches
 * - schemas.ts ≥ 90%
 * - lib/* ≥ 80%
 */
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const srcPath = resolve(fileURLToPath(new URL("./src", import.meta.url)));

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tasks"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/features/**/services.ts",
        "src/features/**/schemas.ts",
        "src/lib/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    },
  },
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
});
