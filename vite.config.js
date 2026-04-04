import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
  },
  server: {
    open: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
});
