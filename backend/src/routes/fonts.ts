/**
 * 字体路由 — 上传/列表/静态服务
 */
import { FastifyInstance } from "fastify";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 字体存放目录 */
export const FONTS_DIR = path.resolve(__dirname, "../../uploads/fonts");

/** 注册字体路由 */
export async function registerFontRoutes(app: FastifyInstance) {
  // 确保目录存在
  fs.mkdirSync(FONTS_DIR, { recursive: true });

  // ==========================================================================
  // 上传字体
  // ==========================================================================
  app.post("/api/fonts/upload", async (request, reply) => {
    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "未上传文件" });
      }

      // 验证文件类型
      const filename = file.filename.toLowerCase();
      if (!filename.endsWith(".ttf") && !filename.endsWith(".otf") && !filename.endsWith(".woff2")) {
        return reply.status(400).send({
          error: "仅支持 .ttf / .otf / .woff2 格式的字体文件",
        });
      }

      // 写入磁盘
      const filePath = path.join(FONTS_DIR, file.filename);
      const writeStream = fs.createWriteStream(filePath);
      await file.file.pipe(writeStream);

      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const stats = fs.statSync(filePath);

      app.log.info(`字体已上传: ${file.filename} (${stats.size} bytes)`);

      return reply.code(201).send({
        filename: file.filename,
        size: stats.size,
        path: `/api/fonts/file/${file.filename}`,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: "字体上传失败: " + (err as Error).message });
    }
  });

  // ==========================================================================
  // 字体列表
  // ==========================================================================
  app.get("/api/fonts", async () => {
    try {
      const files = fs.readdirSync(FONTS_DIR);
      const fonts = files
        .filter((f) => f.endsWith(".ttf") || f.endsWith(".otf") || f.endsWith(".woff2"))
        .map((f) => {
          const stats = fs.statSync(path.join(FONTS_DIR, f));
          return {
            filename: f,
            size: stats.size,
            uploadedAt: stats.mtime.toISOString(),
            url: `/api/fonts/file/${f}`,
          };
        })
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      return { fonts };
    } catch (err) {
      return { fonts: [] };
    }
  });

  // ==========================================================================
  // 字体文件静态服务 — 通过 /api/fonts/file/<filename> 访问
  // ==========================================================================
  app.get("/api/fonts/file/:filename", async (request, reply) => {
    const { filename } = request.params as { filename: string };
    // 防止目录穿越
    const safeName = path.basename(filename);
    const filePath = path.join(FONTS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: "字体文件不存在" });
    }

    const ext = path.extname(safeName).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".ttf": "font/ttf",
      ".otf": "font/otf",
      ".woff2": "font/woff2",
    };

    return reply
      .header("Content-Type", mimeMap[ext] || "application/octet-stream")
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(fs.readFileSync(filePath));
  });
}
