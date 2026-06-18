/**
 * 项目布局 — 包裹 ProjectDetail，由 ProjectDetail 自身通过 useParams 读取 id
 */
import ProjectDetail from "./ProjectDetail";

export default function ProjectLayout() {
  return <ProjectDetail />;
}
