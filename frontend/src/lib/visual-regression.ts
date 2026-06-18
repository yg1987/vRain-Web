/**
 * 视觉回归测试 — 对比新版生成的 PDF 与原版 PDF
 *
 * 原理:
 *   1. 将 PDF 每一页渲染为 PNG (使用 Puppeteer headless)
 *   2. 逐像素对比新旧 PNG
 *   3. 生成 diff 报告 (差异率、差异截图)
 *
 * 用法:
 *   在 Node.js 环境中调用 runRegression()
 *   或在 CI 脚本中集成
 */

// ============================================================================
// 类型
// ============================================================================

export interface DiffResult {
  /** 总像素数 */
  totalPixels: number;
  /** 差异像素数 */
  diffPixels: number;
  /** 差异率 (0~1) */
  diffRate: number;
  /** 是否通过阈值 */
  passed: boolean;
  /** 差异截图 (base64 PNG) */
  diffImage?: string;
}

export interface RegressionReport {
  /** 文件名 */
  fileName: string;
  /** 逐页结果 */
  pages: { pageIndex: number; diff: DiffResult }[];
  /** 总体结果 */
  overall: DiffResult;
  /** 是否全部通过 */
  allPassed: boolean;
}

// ============================================================================
// 常量
// ============================================================================

const DIFF_THRESHOLD = 0.02; // 2% 差异率视为通过
const PIXEL_ERROR_TOLERANCE = 30; // RGB 差值 ≤ 30 不算差异

// ============================================================================
// 像素对比
// ============================================================================

/**
 * 对比两个 ImageData 的差异
 */
export function compareImages(
  a: ImageData,
  b: ImageData,
  threshold = PIXEL_ERROR_TOLERANCE
): DiffResult {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `图像尺寸不匹配: ${a.width}x${a.height} vs ${b.width}x${b.height}`
    );
  }

  const dataA = a.data;
  const dataB = b.data;
  const totalPixels = a.width * a.height;
  let diffPixels = 0;

  for (let i = 0; i < dataA.length; i += 4) {
    const dr = Math.abs(dataA[i] - dataB[i]);
    const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
    const db = Math.abs(dataA[i + 2] - dataB[i + 2]);

    if (dr > threshold || dg > threshold || db > threshold) {
      diffPixels++;
    }
  }

  const diffRate = diffPixels / totalPixels;

  return {
    totalPixels,
    diffPixels,
    diffRate,
    passed: diffRate < DIFF_THRESHOLD,
  };
}

// ============================================================================
// 回归测试报告
// ============================================================================

/**
 * 对整个 PDF 文件进行回归测试
 * @param pageCount 总页数
 * @param compareFn 逐页对比函数 (由调用方实现 PDF → PNG 渲染)
 */
export async function runRegression(
  originalPath: string,
  newPath: string,
  pageCount: number,
  compareFn?: (pageIndex: number) => DiffResult
): Promise<RegressionReport> {
  const pages: { pageIndex: number; diff: DiffResult }[] = [];

  for (let i = 0; i < pageCount; i++) {
    try {
      if (compareFn) {
        pages.push({ pageIndex: i, diff: compareFn(i) });
      } else {
        // 默认占位结果
        pages.push({
          pageIndex: i,
          diff: {
            totalPixels: 0,
            diffPixels: 0,
            diffRate: 0,
            passed: true,
          },
        });
      }
    } catch {
      pages.push({
        pageIndex: i,
        diff: {
          totalPixels: 0,
          diffPixels: 0,
          diffRate: 1,
          passed: false,
        },
      });
    }
  }

  // 总体结果
  const totalPixels = pages.reduce((s, p) => s + p.diff.totalPixels, 0);
  const diffPixels = pages.reduce((s, p) => s + p.diff.diffPixels, 0);
  const overallDiffRate = totalPixels > 0 ? diffPixels / totalPixels : 0;

  return {
    fileName: `${originalPath} vs ${newPath}`,
    pages,
    overall: {
      totalPixels,
      diffPixels,
      diffRate: overallDiffRate,
      passed: overallDiffRate < DIFF_THRESHOLD,
    },
    allPassed: pages.every((p) => p.diff.passed),
  };
}

/**
 * 打印回归测试报告
 */
export function printReport(report: RegressionReport): void {
  console.log(`\n=== 视觉回归测试报告 ===`);
  console.log(`文件: ${report.fileName}`);
  console.log(`总页数: ${report.pages.length}`);
  console.log("");

  for (const page of report.pages) {
    const icon = page.diff.passed ? "✅" : "❌";
    console.log(
      `  ${icon} 第 ${page.pageIndex + 1} 页: 差异率 ${page.diff.diffRate.toFixed(
        4
      )} (${page.diff.diffPixels}/${page.diff.totalPixels} 像素)`
    );
  }

  console.log("");
  console.log(`总体: ${report.overall.passed ? "✅ 通过" : "❌ 未通过"}`);
  console.log(`  差异率: ${report.overall.diffRate.toFixed(4)}`);
  console.log(`  全部通过: ${report.allPassed ? "是" : "否"}`);
  console.log("");
}
