/**
 * 配置编辑器 — 书籍配置 + 画布配置双面板
 * 所有变更立即同步到父组件 (受控组件)
 */
import { useState, useCallback, useEffect } from "react";
import type { BookConfig, CanvasConfig } from "../types/layout";

interface Props {
  bookConfig: BookConfig;
  canvasConfig: CanvasConfig;
  onChange: (book: BookConfig, canvas: CanvasConfig) => void;
}

export default function ConfigEditor({ bookConfig, canvasConfig, onChange }: Props) {
  // 本地副本 — 初始化和父组件变更时同步
  const [book, setBook] = useState<BookConfig>(bookConfig);
  const [canvas, setCanvas] = useState<CanvasConfig>(canvasConfig);

  // 父组件 props 变化时更新本地状态
  useEffect(() => { setBook(bookConfig); }, [bookConfig]);
  useEffect(() => { setCanvas(canvasConfig); }, [canvasConfig]);

  const commitBook = useCallback((newBook: BookConfig) => {
    setBook(newBook);
    onChange(newBook, canvas);
  }, [onChange, canvas]);

  const commitCanvas = useCallback((newCanvas: CanvasConfig) => {
    setCanvas(newCanvas);
    onChange(book, newCanvas);
  }, [onChange, book]);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 书籍配置 */}
      <div className="config-panel">
        <h3 className="config-panel-title">📖 书籍配置</h3>

        <div className="config-group">
          <label className="config-group-label">书名 (title)</label>
          <input
            className="config-input"
            value={book.title}
            onChange={(e) => commitBook({ ...book, title: e.target.value })}
          />
        </div>

        <div className="config-group">
          <label className="config-group-label">作者 (author)</label>
          <input
            className="config-input"
            value={book.author}
            onChange={(e) => commitBook({ ...book, author: e.target.value })}
          />
        </div>

        <div className="config-group">
          <label className="config-group-label">每列字数 (row_num)</label>
          <input
            className="config-input"
            type="number"
            min={1}
            max={100}
            value={book.rowNum}
            onChange={(e) =>
              commitBook({ ...book, rowNum: parseInt(e.target.value) || 1 })
            }
          />
        </div>

        <div className="config-group">
          <label className="config-group-label">画布 ID (canvas_id)</label>
          <select
            className="config-select"
            value={book.canvasId}
            onChange={(e) =>
              commitBook({ ...book, canvasId: e.target.value })
            }
          >
            <option value="24_black_blank">24_black_blank</option>
            <option value="24_paper">24_paper</option>
            <option value="simple">simple</option>
            <option value="bamboo">bamboo</option>
            <option value="vintage">vintage</option>
          </select>
        </div>

        {/* 简繁对照 */}
        <div className="config-group">
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            <input
              type="checkbox"
              checked={book.simplifiedToTraditional}
              onChange={(e) =>
                commitBook({ ...book, simplifiedToTraditional: e.target.checked })
              }
              className="accent-vermilion h-4 w-4 cursor-pointer"
            />
            <label className="cursor-pointer text-sm font-medium text-amber-900">
              简繁对照
            </label>
            <span className="text-xs text-amber-700/70">
              正文简体→繁体 (替代 vrain_mr.pl)
            </span>
          </div>
        </div>
      </div>

      {/* 画布配置 */}
      <div className="config-panel">
        <h3 className="config-panel-title">🎨 画布配置</h3>

        <div className="config-group">
          <label className="config-group-label">画布宽度 (canvas_width)</label>
          <input
            className="config-input"
            type="number"
            min={500}
            max={5000}
            value={canvas.width}
            onChange={(e) =>
              commitCanvas({ ...canvas, width: parseInt(e.target.value) || 500 })
            }
          />
        </div>

        <div className="config-group">
          <label className="config-group-label">画布高度 (canvas_height)</label>
          <input
            className="config-input"
            type="number"
            min={500}
            max={5000}
            value={canvas.height}
            onChange={(e) =>
              commitCanvas({ ...canvas, height: parseInt(e.target.value) || 500 })
            }
          />
        </div>

        <div className="config-group">
          <label className="config-group-label">列数 (leaf_col)</label>
          <input
            className="config-input"
            type="number"
            min={1}
            max={50}
            value={canvas.leafCol}
            onChange={(e) =>
              commitCanvas({ ...canvas, leafCol: parseInt(e.target.value) || 1 })
            }
          />
        </div>

        <div className="config-group">
          <label className="config-group-label">版心中缝 (leaf_center_width)</label>
          <input
            className="config-input"
            type="number"
            min={0}
            max={500}
            value={canvas.leafCenterWidth}
            onChange={(e) =>
              commitCanvas({ ...canvas, leafCenterWidth: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>
    </div>
  );
}
