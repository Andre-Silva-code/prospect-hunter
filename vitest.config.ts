import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", ".aiox-core/**"],
    // Vários testes reatribuem process.env inteiro (ex.: `process.env = {...}`).
    // Rodar arquivos em paralelo faz esse estado vazar entre eles de forma
    // não-determinística. Executar os arquivos em série elimina a pollution.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
