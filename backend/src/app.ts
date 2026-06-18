import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });

// CORS — 允许前端访问
await app.register(cors, { origin: true });

// 静态资源 (前端构建产物)
const distPath = path.join(__dirname, "../../frontend/dist");
// await app.register(staticPlugin, { root: distPath });

// ============================================================================
// 健康检查
// ============================================================================
app.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// ============================================================================
// 项目 CRUD (占位)
// ============================================================================
app.get("/api/projects", async () => {
  return { projects: [] };
});

app.post("/api/projects", async (request, reply) => {
  const { name } = request.body as { name: string };
  void name;
  return reply.code(201).send({ id: "placeholder-id" });
});

// ============================================================================
// 字体上传 (占位)
// ============================================================================
app.post("/api/fonts/upload", async (request, reply) => {
  void request;
  void reply;
  return { message: "Font upload endpoint — to be implemented" };
});

// ============================================================================
// PDF 生成
// ============================================================================
import { generatePdf, shutdownBrowser } from "./services/pdf-generator";
import type { Page, BookConfig, CanvasConfig } from "./types/layout";

app.post("/api/render/pdf", async (request, reply) => {
  try {
    const body = request.body as {
      pages: Page[];
      bookConfig: BookConfig;
      canvasConfig: CanvasConfig;
      testPages?: number;
      compress?: boolean;
      includeCover?: boolean;
      fileFrom?: number;
      fileTo?: number;
    };

    const result = await generatePdf({
      pages: body.pages,
      bookConfig: body.bookConfig,
      canvasConfig: body.canvasConfig,
      testPages: body.testPages,
      compress: body.compress,
      includeCover: body.includeCover ?? true,
      fileFrom: body.fileFrom,
      fileTo: body.fileTo,
      fileName: body.bookConfig.title,
    });

    // 以下载附件形式返回 PDF
    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(body.bookConfig.title)}.pdf`,
      )
      .header("Content-Length", String(result.buffer.length))
      .send(result.buffer);
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({
      error: "PDF 生成失败: " + (err as Error).message,
    });
  }
});

// ============================================================================
// 优雅关闭
// ============================================================================
process.on("SIGTERM", async () => {
  await shutdownBrowser();
  process.exit(0);
});

process.on("SIGINT", async () => {
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
