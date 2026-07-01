import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });

// CORS — 允许前端访问
await app.register(cors, { origin: true });
// 文件上传 (字体)
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB 上限

// 静态资源 (前端构建产物)
import staticPlugin from "@fastify/static";
const distPath = path.join(__dirname, "../../frontend/dist");
await app.register(staticPlugin, { root: distPath, prefix: "/" });

// ============================================================================
// 初始化数据库
// ============================================================================
import { initDb, closeDb } from "./services/project-store";
initDb();

// ============================================================================
// 健康检查
// ============================================================================
app.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// ============================================================================
// 项目路由
// ============================================================================
import { registerProjectRoutes } from "./routes/projects";
await registerProjectRoutes(app);

// ============================================================================
// 字体路由
// ============================================================================
import { registerFontRoutes } from "./routes/fonts";
await registerFontRoutes(app);

// ============================================================================
// 工具路由 (简繁转换等)
// ============================================================================
import { registerToolRoutes } from "./routes/tools";
await registerToolRoutes(app);

// ============================================================================
// PDF 路由
// ============================================================================
import { registerPdfRoutes } from "./routes/pdf";
import { shutdownBrowser } from "./services/pdf-generator";
await registerPdfRoutes(app);

// ============================================================================
// 优雅关闭
// ============================================================================
process.on("SIGTERM", async () => {
  closeDb();
  await shutdownBrowser();
  process.exit(0);
});

process.on("SIGINT", async () => {
  closeDb();
  await shutdownBrowser();
  process.exit(0);
});

// ============================================================================
// 启动
// ============================================================================
const PORT = process.env.PORT || 8080;

try {
  await app.listen({ port: Number(PORT), host: "0.0.0.0" });
  console.log(`vRain Backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
