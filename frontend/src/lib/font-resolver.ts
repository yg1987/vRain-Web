/**
 * 字体解析器 — 使用 opentype.js 移植原 vrain.pl 的字体回退链算法
 *
 * 原代码: vrain.pl get_font() + font_check() + compute_font_scales()
 *
 * 核心功能:
 *   1. 字形存在检测: 检查指定字符是否在字体中
 *   2. 多级字体回退: 按优先级尝试字体链
 *   3. 字体度量校准: 参考字符高度对比, 计算缩放比例
 *   4. 字体对象缓存
 */

import * as opentype from "opentype.js";

/** 字体缓存项 */
interface FontCacheEntry {
  font: opentype.Font;
  glyphCache: Map<string, boolean>; // char → glyph exists
  heightCache: Map<number, number>; // refSize → height
}

/**
 * 字体解析器
 * 管理字体加载、字形检测、回退链、度量校准
 */
export class FontResolver {
  private cache: Map<string, FontCacheEntry> = new Map();
  private scales: Map<string, number> = new Map();

  /** 加载字体文件 */
  async loadFont(fontUrl: string): Promise<opentype.Font> {
    if (this.cache.has(fontUrl)) {
      return this.cache.get(fontUrl)!.font;
    }

    // 从 ArrayBuffer 加载
    const arrayBuffer = await fetch(fontUrl).then((r) => r.arrayBuffer());
    const font = opentype.parse(arrayBuffer);

    this.cache.set(fontUrl, {
      font,
      glyphCache: new Map(),
      heightCache: new Map(),
    });

    return font;
  }

  /**
   * 从 ArrayBuffer 加载字体 (用于上传的字体)
   */
  loadFontFromBuffer(name: string, buffer: ArrayBuffer): opentype.Font {
    if (this.cache.has(name)) {
      return this.cache.get(name)!.font;
    }

    const font = opentype.parse(buffer);

    this.cache.set(name, {
      font,
      glyphCache: new Map(),
      heightCache: new Map(),
    });

    return font;
  }

  /**
   * 检测字符是否在指定字体中
   */
  hasGlyph(fontUrl: string, char: string): boolean {
    const entry = this.cache.get(fontUrl);
    if (!entry) return false;

    // 缓存命中
    if (entry.glyphCache.has(char)) {
      return entry.glyphCache.get(char) as boolean;
    }

    // 使用 opentype.js 检测
    const glyphs = entry.font.stringToGlyphs(char);
    const exists = glyphs.length > 0;

    entry.glyphCache.set(char, exists);
    return exists;
  }

  /**
   * 字体回退链: 遍历字体优先级数组, 返回首个包含字符的字体
   * 原代码: get_font($char, $fref)
   */
  resolveFont(
    char: string,
    fontOrder: number[],
    fontUrls: string[]
  ): string | null {
    for (const idx of fontOrder) {
      if (idx >= fontUrls.length) continue;
      const url = fontUrls[idx];
      if (this.hasGlyph(url, char)) {
        return url;
      }
    }
    // 无匹配返回 null (前端渲染时显示 □)
    return null;
  }

  /**
   * 获取字形的度量信息 (宽度、高度、bearing)
   */
  getGlyphMetrics(fontUrl: string, char: string): {
    width: number;
    height: number;
    bearingX: number;
    bearingY: number;
  } | null {
    const entry = this.cache.get(fontUrl);
    if (!entry) return null;

    const glyphs = entry.font.stringToGlyphs(char);
    if (glyphs.length === 0) return null;

    const glyph = glyphs[0];
    const bbox = glyph.getPath(0, 0, 1000).getBoundingBox();
    return {
      width: glyph.advanceWidth || 0,
      height: bbox ? ((bbox?.y1 ?? 0) - (bbox?.y2 ?? 0)) : 0,
      bearingX: 0,
      bearingY: 0,
    };
  }

  /**
   * 获取字体的面级高度 (ascender - descender)
   * 用于字体度量校准的回退方案
   */
  getFaceHeight(fontUrl: string): number {
    const entry = this.cache.get(fontUrl);
    if (!entry) return 0;

    return entry.font.ascender - entry.font.descender;
  }

  /**
   * 字体度量校准: 计算参考字符在不同字体中的缩放比例
   *
   * Phase 1: 逐字级 — 测量参考字符 "国" 在各字体中的实际高度
   * Phase 2: 面级回退 — 对不包含参考字符的字体, 使用 ascender-descender 比例
   */
  computeFontScales(
    primaryFontUrl: string,
    referenceChar: string,
    referenceSize: number,
    fallbackUrls: string[]
  ): Map<string, number> {
    const primaryEntry = this.cache.get(primaryFontUrl);
    if (!primaryEntry) return new Map();

    // Phase 1: 逐字级测量参考字符
    const primaryGlyphs = primaryEntry.font.stringToGlyphs(referenceChar);
    let primaryHeight = 0;
    if (primaryGlyphs.length > 0) {
      // 使用 bounding box 计算高度 (通过 getPath 获取)
      const bbox = primaryGlyphs[0].getPath(0, 0, 1000).getBoundingBox();
      primaryHeight = (bbox?.y1 ?? 0) - (bbox?.y2 ?? 0);
    }

    // 如果 bbox 不可用, 回退到面级
    if (primaryHeight === 0) {
      primaryHeight = this.getFaceHeight(primaryFontUrl);
    }

    const result = new Map<string, number>();

    for (const url of fallbackUrls) {
      const entry = this.cache.get(url);
      if (!entry) continue;

      // Phase 1: 逐字级
      const fallbackGlyphs = entry.font.stringToGlyphs(referenceChar);
      if (fallbackGlyphs.length > 0) {
        // 使用 getPath 获取 boundingBox
        const bbox = fallbackGlyphs[0].getPath(0, 0, 1000).getBoundingBox();
        const height = (bbox?.y1 ?? 0) - (bbox?.y2 ?? 0);
        if (height > 0 && primaryHeight > 0) {
          result.set(url, primaryHeight / height);
          this.scales.set(url, primaryHeight / height);
        }
      } else {
        // Phase 2: 面级回退
        const faceHeight = this.getFaceHeight(url);
        const primaryFaceHeight = this.getFaceHeight(primaryFontUrl);
        if (faceHeight > 0 && primaryFaceHeight > 0) {
          // 使用参考比例校准
          const calibratedRatio = primaryHeight / primaryFaceHeight;
          result.set(url, calibratedRatio * faceHeight / primaryHeight);
          this.scales.set(url, calibratedRatio * faceHeight / primaryHeight);
        }
      }
    }

    return result;
  }

  /**
   * 获取字体的缩放比例 (已计算)
   */
  getScale(fontUrl: string): number {
    return this.scales.get(fontUrl) ?? 1;
  }

  /**
   * 清除字体缓存
   */
  clear(): void {
    this.cache.clear();
    this.scales.clear();
  }

  /**
   * 获取已加载的字体
   */
  getLoadedFonts(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * 单字字体检测结果
 */
export interface GlyphResult {
  fontFamily: string;
  hasGlyph: boolean;
  width?: number;
  height?: number;
}
