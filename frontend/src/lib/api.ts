/**
 * api — 后端 API 封装
 *
 * 统一 fetch 调用，简化前后端通信。
 * 所有请求自动处理 JSON 序列化/反序列化。
 */

// ============================================================================
// 基础请求函数
// ============================================================================

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

function get<T>(url: string): Promise<T> {
  return request<T>(url);
}

function post<T>(url: string, data: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function put<T>(url: string, data: unknown): Promise<T> {
  return request<T>(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

function del<T>(url: string): Promise<T> {
  return request<T>(url, {
    method: "DELETE",
  });
}

// ============================================================================
// 类型定义
// ============================================================================

export interface ProjectData {
  id: string;
  name: string;
  bookConfig: Record<string, unknown>;
  canvasConfig: Record<string, unknown>;
  textLines: string[][];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface UpdateProjectResponse {
  updated: true;
}

export interface DeleteProjectResponse {
  deleted: true;
}

// ============================================================================
// API 函数
// ============================================================================

export const api = {
  /**
   * 获取所有项目
   */
  getProjects: () => get<{ projects: ProjectData[] }>("/api/projects"),

  /**
   * 创建新项目
   */
  createProject: (name: string, defaults?: {
    bookConfig?: Record<string, unknown>;
    canvasConfig?: Record<string, unknown>;
    textLines?: string[][];
  }) =>
    post<ProjectData>("/api/projects", { name, ...defaults }),

  /**
   * 获取单个项目
   */
  getProject: (id: string) => get<ProjectData>(`/api/projects/${id}`),

  /**
   * 更新项目
   */
  updateProject: (
    id: string,
    data: {
      bookConfig?: Record<string, unknown>;
      canvasConfig?: Record<string, unknown>;
      textLines?: string[][];
    },
  ) =>
    put<UpdateProjectResponse>(`/api/projects/${id}`, {
      book_config: data.bookConfig,
      canvas_config: data.canvasConfig,
      text_files: data.textLines,
    }),

  /**
   * 删除项目
   */
  deleteProject: (id: string) => del<DeleteProjectResponse>(`/api/projects/${id}`),
};
