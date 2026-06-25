import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// 读取端口配置 (支持环境变量覆盖)
// VITE_BACKEND_PORT 由 start.mjs 和 npm dev 脚本传递
const FRONTEND_PORT = parseInt(process.env.VITE_PORT || "3000", 10);
const backendPort = process.env.VITE_BACKEND_PORT || process.env.PORT || "8080";
const BACKEND_HOST = `localhost:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: FRONTEND_PORT,
    proxy: {
      "/api": {
        target: `http://${BACKEND_HOST}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
});
