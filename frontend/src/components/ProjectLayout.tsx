/**
 * 项目布局 — 从路由参数获取项目 ID，包裹 ProjectDetail
 */
import { useParams } from "react-router-dom";
import ProjectDetail from "./ProjectDetail";

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  // TODO: 根据 id 加载项目数据
  void id;
  return <ProjectDetail />;
}
