/**
 * 项目列表页 — 展示所有项目，支持创建/删除项目
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ProjectData } from "../lib/api";
import { DEFAULT_BOOK_CONFIG, DEFAULT_CANVAS_CONFIG, DEFAULT_TEXT_LINES } from "../hooks/useProjectStore";

export default function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");

  // ========== 加载项目列表 ==========
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { projects } = await api.getProjects();
      setProjects(projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ========== 创建项目 ==========
  const handleCreate = async () => {
    if (showNewInput) {
      const name = newName.trim() || `未命名项目 ${projects.length + 1}`;
      try {
        const project = await api.createProject(name, {
          bookConfig: { ...DEFAULT_BOOK_CONFIG, name, title: name },
          canvasConfig: { ...DEFAULT_CANVAS_CONFIG },
          textLines: DEFAULT_TEXT_LINES.map((arr) => [...arr]),
        });
        setShowNewInput(false);
        setNewName("");
        navigate(`/project/${project.id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "创建失败");
      }
    } else {
      setShowNewInput(true);
    }
  };

  const handleCancelNew = () => {
    setShowNewInput(false);
    setNewName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") handleCancelNew();
  };

  // ========== 删除项目 ==========
  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // 阻止冒泡到卡片点击
    if (!confirm("确定删除该项目？")) return;

    try {
      await api.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  // ========== 渲染 ==========
  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-ink/75">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-red-500">
          <p>加载失败: {error}</p>
          <button className="btn-primary mt-4" onClick={loadProjects}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-ancient font-bold text-ink">
          vRain — 兀雨古籍刻本直排电子书制作工具
        </h1>
        <p className="mt-1 text-sm text-ink/85">
          古典线装书风格竖排 PDF 电子书生成器，Web 版
        </p>
      </header>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">我的项目</h2>
        {showNewInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="rounded border border-ink/20 px-3 py-1.5 text-sm focus:border-vermilion focus:outline-none"
              placeholder="输入项目名称..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button className="btn-primary text-sm px-3 py-1.5" onClick={handleCreate}>
              创建
            </button>
            <button className="btn-secondary text-sm px-3 py-1.5" onClick={handleCancelNew}>
              取消
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={handleCreate}>
            ＋ 新建项目
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-ink/10 bg-white/40 p-12 text-center text-ink/75">
          暂无项目，点击「新建项目」开始
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              className="group relative cursor-pointer rounded-lg border border-ink/10 bg-white/60 p-5 text-left shadow-sm transition-all hover:border-vermilion/30 hover:shadow-md"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <h3 className="text-base font-semibold text-ink">{project.name}</h3>
              {project.bookConfig.author && (
                <p className="mt-1 text-xs text-ink/75">{project.bookConfig.author}</p>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-ink/65">
                <span>{project.bookConfig.rowNum} 字/列</span>
                <span>{project.textLines.length} 文件</span>
                <span>{project.bookConfig.canvasId}</span>
              </div>
              <p className="mt-1 text-[10px] text-ink/55">
                {new Date(project.updatedAt).toLocaleString("zh-CN")}
              </p>

              {/* 删除按钮 */}
              <button
                className="absolute right-2 top-2 rounded p-1 text-ink/55 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                onClick={(e) => handleDelete(e, project.id)}
                title="删除项目"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
