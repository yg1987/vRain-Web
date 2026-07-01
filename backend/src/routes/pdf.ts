/**
 * PDF 路由 — PDF 生成和导出
 */
import { FastifyInstance } from "fastify";
import { generatePdf } from "../services/pdf-generator";
import type { Page, BookConfig, CanvasConfig } from "../types/layout";

/** 注册 PDF 路由 */
export async function registerPdfRoutes(app: FastifyInstance) {
  // ==========================================================================
  // PDF 生成
  // ==========================================================================
  app.post("/api/render/pdf", async (request, reply) => {
    try {
      const body = request.body as {
        pages: Page[];
        bookConfig: BookConfig;
        canvasConfig: CanvasConfig;
        testPages?: number;
        compress?: boolean;
        includeCover?: boolean;
        includePreface?: boolean;
        includeAppendix?: boolean;
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
        includePreface: body.includePreface,
        includeAppendix: body.includeAppendix,
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
}
