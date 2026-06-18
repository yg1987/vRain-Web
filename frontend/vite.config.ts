import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// 读取端口配置 (支持环境变量覆盖)
const FRONTEND_PORT = parseInt(process.env.VITE_PORT || "3000", 10);
const BACKEND_HOST = process.env.PORT ? `localhost:${process.env.PORT}` : "localhost:8080";

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
});
