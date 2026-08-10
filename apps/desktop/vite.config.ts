import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@quanti/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/"
      }
    },
    setupFiles: "./test/setup.ts",
    css: true,
    restoreMocks: true,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"]
  }
});
