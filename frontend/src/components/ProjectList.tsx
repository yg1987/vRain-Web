/**
 * 项目列表页 — 展示所有项目，支持创建新项目
 */
import { useNavigate } from "react-router-dom";

export default function ProjectList() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-ancient font-bold text-ink">
          vRain — 兀雨古籍刻本直排电子书制作工具
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          古典线装书风格竖排 PDF 电子书生成器，Web 版
        </p>
      </header>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">我的项目</h2>
        <button
          className="btn-primary"
          onClick={() => navigate("/project/new")}
        >
          ＋ 新建项目
        </button>
      </div>

      <div className="rounded-lg border border-ink/10 bg-white/40 p-12 text-center text-ink/50">
        暂无项目，点击「新建项目」开始
      </div>
    </div>
  );
}
