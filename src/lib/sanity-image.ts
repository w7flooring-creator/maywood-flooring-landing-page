/**
 * Sanity 图片 URL 优化 —— 给 GROQ `asset->url` 直出的原图 URL 追加 Sanity 图片 CDN
 * 变换参数（目标宽度 / 自动格式 / 质量），并生成响应式 srcset。
 *
 * 背景：本仓库未装 `@sanity/image-url`，各 lib 在 GROQ 里 `asset->url` 直出原图
 * （常是 3000–6000px 的多 MB 原图）。直接渲染会让分类页达 20MB+、Lighthouse 重扣分
 * （#27 launch QA 实测：分类页 23.6MB / perf 57）。Sanity 图片 CDN 支持在 URL 上
 * 直接加查询参数做即时变换（无需额外依赖），故用一个轻量 helper 统一装饰所有图片 URL。
 *
 * 安全：仅对 cdn.sanity.io 的图片 URL 生效；非 Sanity URL / 空值原样返回（不破图）。
 * `auto=format` 让 CDN 按浏览器 Accept 头自动下发 webp/avif；`q` 控制有损质量。
 */

const SANITY_IMAGE_HOST = "cdn.sanity.io";

export interface SanityImageOptions {
  /** 目标宽度（px）。不传则不限制宽度（仅做格式/质量优化）。 */
  width?: number;
  /** 有损质量 1–100，默认 70（视觉无损、体积大降）。 */
  quality?: number;
  /** 是否让 CDN 自动选最优格式（webp/avif），默认 true。 */
  auto?: boolean;
}

/** 是否为可被 Sanity 图片 CDN 变换的 URL。 */
function isSanityImageUrl(url: string): boolean {
  return url.includes(SANITY_IMAGE_HOST);
}

/**
 * 给单个 Sanity 图片 URL 追加变换参数。
 * 非 Sanity URL / 空串原样返回（调用方无需判空）。
 */
export function sanityImageUrl(
  url: string | null | undefined,
  opts: SanityImageOptions = {}
): string {
  if (!url || !isSanityImageUrl(url)) return url ?? "";
  const { width, quality = 70, auto = true } = opts;
  const params = new URLSearchParams();
  if (width) params.set("w", String(Math.round(width)));
  params.set("q", String(quality));
  if (auto) params.set("auto", "format");
  // 原图 URL 理论上不带 query，但稳妥起见按已有 ? 决定衔接符。
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${params.toString()}`;
}

/**
 * 生成响应式 srcset 字符串：每个宽度一项 `"<url?w=W…> Ww"`。
 * widths 去重升序；非 Sanity URL / 空值返回空串（调用方据此决定不输出 srcset）。
 */
export function sanityImageSrcset(
  url: string | null | undefined,
  widths: number[],
  opts: Omit<SanityImageOptions, "width"> = {}
): string {
  if (!url || !isSanityImageUrl(url) || widths.length === 0) return "";
  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);
  return uniqueWidths
    .map((w) => `${sanityImageUrl(url, { ...opts, width: w })} ${w}w`)
    .join(", ");
}
