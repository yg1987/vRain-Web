/**
 * 工具路由 — 简繁转换、字体检测等辅助 API
 */
import { FastifyInstance } from "fastify";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const OpenCC = require("opencc");

/** opencc 转换器单例 */
let converter: InstanceType<typeof OpenCC> | null = null;

function getConverter() {
  if (!converter) {
    converter = new OpenCC("s2t.json");
  }
  return converter;
}

/** 注册工具路由 */
export async function registerToolRoutes(app: FastifyInstance) {
  // ==========================================================================
  // 简繁转换 — POST /api/tools/simp2trad
  // 请求: { "text": "简体中文文本" }
  // 返回: { "result": "繁體中文文本" }
  // ==========================================================================
  app.post("/api/tools/simp2trad", async (request, reply) => {
    try {
      const body = request.body as { text?: string };
      if (!body.text) {
        return reply.status(400).send({ error: "缺少 text 字段" });
      }

      const conv = getConverter();
      const result = conv.convertSync(body.text);

      return { result };
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: "简繁转换失败: " + (err as Error).message,
      });
    }
  });

  // ==========================================================================
  // 健康检查（扩展）
  // ==========================================================================
  app.get("/api/tools/health", async () => {
    try {
      const conv = getConverter();
      const test = conv.convertSync("测试");
      return {
        status: "ok",
        opencc: true,
        testResult: test,
      };
    } catch {
      return {
        status: "degraded",
        opencc: false,
      };
    }
  });
}
