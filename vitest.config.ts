import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

if (typeof process.loadEnvFile === "function") {
  if (fs.existsSync(".env.local")) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // Ignore if parsing fails
    }
  }
}

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});


