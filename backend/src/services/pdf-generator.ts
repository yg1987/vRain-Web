/**
 * PDF 生成服务 — Puppeteer headless Chromium
 *
 * 将 IR (Page[]) 通过 ir-to-css 转为 HTML，
 * 用 Puppeteer headless Chromium 渲染为 PDF。
 */

import puppeteer from "puppeteer";
import {
  pagesToHtml,
  generateCoverHtml,
  filterPagesByRange,
} from "../../../frontend/src/lib/ir-to-css";
import type { Page, BookConfig, CanvasConfig } from "../types/layout";

// ============================================================================
// 浏览器单例
// ============================================================================

let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

async function getBrowser(): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-background-networking",
        "--disable-extensions",
        "--disable-translate",
      ],
    });
  }
  return browserInstance;
}

/** 关闭浏览器实例（优雅关闭） */
export async function shutdownBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// ============================================================================
// 类型
// ============================================================================

export interface PdfGenerationOptions {
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
  fileName?: string;
}

export interface PdfResult {
  buffer: Uint8Array;
  pageCount: number;
}

// ============================================================================
// 主函数
// ============================================================================

export async function generatePdf(
  options: PdfGenerationOptions,
): Promise<PdfResult> {
  const {
    pages,
    bookConfig,
    canvasConfig,
    testPages,
    compress,
    includeCover,
    includePreface,
    includeAppendix,
    fileFrom = 1,
    fileTo,
  } = options;

  // 1. 筛选页面
  const toPage = fileTo !== undefined ? fileTo : pages.length;
  const filteredPages = filterPagesByRange(pages, fileFrom, toPage, testPages, includePreface, includeAppendix);

  if (filteredPages.length === 0) {
    throw new Error("没有可渲染的页面");
  }

  // 2. 生成 HTML
  let html = pagesToHtml(filteredPages, bookConfig, canvasConfig, {
    includePageNumbers: true,
    compress: !!compress,
  });

  // 3. 前置封面页
  if (includeCover) {
    const coverHtml = generateCoverHtml(bookConfig, canvasConfig);
    // 将封面注入到 <body> 开头
    html = html.replace(
      "<body>",
      `<body><div style="page-break-after:always;">${coverHtml}</div>`,
    );
  }

  // 4. 启动浏览器 + 打开页面
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // 设置视口匹配画布尺寸
    const { width, height } = canvasConfig;
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
    });

    // 注入 HTML
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    // 5. 生成 PDF
    const pdfBuffer = await page.pdf({
      width: `${width}px`,
      height: `${height}px`,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 120000,
    });

    return {
      buffer: new Uint8Array(pdfBuffer),
      pageCount: filteredPages.length + (includeCover ? 1 : 0),
    };
  } finally {
    await page.close();
  }
}
