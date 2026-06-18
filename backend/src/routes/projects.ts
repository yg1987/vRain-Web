/**
 * 项目路由 — CRUD 操作
 */
import { FastifyInstance } from "fastify";
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "../services/project-store";

/** 注册项目路由 */
export async function registerProjectRoutes(app: FastifyInstance) {
  // ==========================================================================
  // 获取所有项目
  // ==========================================================================
  app.get("/api/projects", async () => {
    const projects = getAllProjects();
    return { projects };
  });

  // ==========================================================================
  // 创建新项目
  // ==========================================================================
  app.post("/api/projects", async (request, reply) => {
    const { name, bookConfig, canvasConfig, textLines } = request.body as {
      name: string;
      bookConfig?: Record<string, unknown>;
      canvasConfig?: Record<string, unknown>;
      textLines?: string[][];
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return reply.status(400).send({ error: "项目名称不能为空" });
    }

    const project = createProject(
      name.trim(),
      bookConfig ?? {},
      canvasConfig ?? {},
      textLines ?? [],
    );
    return reply.code(201).send(project);
  });

  // ==========================================================================
  // 获取单个项目
  // ==========================================================================
  app.get("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = getProject(id);

    if (!project) {
      return reply.status(404).send({ error: "项目不存在" });
    }

    return project;
  });

  // ==========================================================================
  // 更新项目
  // ==========================================================================
  app.put("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { book_config, canvas_config, text_files } = request.body as {
      book_config?: Record<string, unknown>;
      canvas_config?: Record<string, unknown>;
      text_files?: string[][];
    };

    const updated = updateProject(id, {
      bookConfig: book_config,
      canvasConfig: canvas_config,
      textLines: text_files,
    });

    if (!updated) {
      return reply.status(404).send({ error: "项目不存在" });
    }

    return { updated: true };
  });

  // ==========================================================================
  // 删除项目
  // ==========================================================================
  app.delete("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteProject(id);

    if (!deleted) {
      return reply.status(404).send({ error: "项目不存在" });
    }

    return { deleted: true };
  });
}
