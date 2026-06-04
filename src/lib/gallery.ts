/**
 * Gallery 页 /gallery 的数据与纯逻辑层（issue #19）。
 *
 * 拆分原则同 category-page.ts / product-detail.ts：
 *  - GROQ 字符串、归一化、面包屑、SEO 输入都是纯函数/常量（可单测、不触网）；
 *  - 只有 `get*` 函数才真正用 getSanityClient() 发请求。
 *
 * 图片在数据层直接解出可渲染 url：本仓库未装 `@sanity/image-url`，沿用
 * collection-landing.ts / product-detail.ts 的 `asset->url` 约定（生产禁止热链 Wix，
 * 这里解出的是 Sanity CDN url）。
 *
 * 「内容尚未灌入」是 Phase 1 常态：galleryImage 文档未灌入 → getGalleryItems()
 * 恒返回空数组，页面据此渲染优雅空态（coming soon + 浏览产品兜底链接，绝不
 * 输出 lorem / 破图）。本模块对空字段一律收敛为 null，由页面/lightbox 优雅降级。
 *
 * 术语见 CONTEXT.md；路由 /gallery 与视觉方向见 AGENTS.md。
 */
import { getSanityClient } from "@/lib/sanity";
import type { BreadcrumbItem, SeoInput } from "@/lib/seo";

/** 一条可直接渲染的图库条目（已解引用 asset->url）。无 url 视为无图。 */
export interface GalleryItem {
  _id: string;
  /** 已解析的图片 url（Sanity CDN）。无则该条目被丢弃，不进网格。 */
  url: string;
  /** 替代文字（无障碍 + SEO）。schema 强制必填，缺省 null 由页面回落。 */
  alt: string | null;
  /** 可选标题（如项目名）。 */
  title: string | null;
  /** 可选说明文字。 */
  caption: string | null;
}

/**
 * 图库投影：解引用 image.asset->url，并摘出 image.alt / title / caption。
 * 按 sortOrder 升序（与 galleryImage schema 的 orderings 一致）。
 * Phase 1 文档未灌入 → 现阶段恒返回空数组；此查询面向内容上线后预留。
 */
export const GALLERY_IMAGES_QUERY = `*[_type == "galleryImage" && defined(image.asset)] | order(sortOrder asc){
  _id,
  "url": image.asset->url,
  "alt": image.alt,
  title,
  caption
}`;

/** 把空字符串/全空白/非字符串归一化为 null。 */
function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 归一化一条图库投影：无 url（编辑漏传图 / 资产被删）→ 返回 null，由调用方丢弃，
 * 绝不让破图进网格。alt / title / caption 空值统一收敛为 null。
 */
export function normaliseGalleryItem(
  raw: Record<string, unknown>
): GalleryItem | null {
  const url = emptyToNull(raw.url);
  if (!url) return null;
  return {
    _id: String(raw._id ?? ""),
    url,
    alt: emptyToNull(raw.alt),
    title: emptyToNull(raw.title),
    caption: emptyToNull(raw.caption),
  };
}

/** 归一化整个图库列表：丢弃无 url 的脏数据、保留 GROQ 排序。 */
export function normaliseGalleryItems(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw)) return [];
  const items: GalleryItem[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === "object") {
      const item = normaliseGalleryItem(entry as Record<string, unknown>);
      if (item) items.push(item);
    }
  }
  return items;
}

/** Gallery 页面包屑：Home > Gallery（末项自指 /gallery，与 canonical 一致）。 */
export function buildGalleryBreadcrumbs(): BreadcrumbItem[] {
  return [
    { name: "Home", url: "/" },
    { name: "Gallery", url: "/gallery" },
  ];
}

/**
 * Gallery 页 SEO 输入。
 * - 唯一 title / meta description（澳洲拼写，自然提及 Melbourne / Victoria）。
 * - canonical 自指 /gallery（图库是唯一主版本）。
 * - 有图时用首图作 OG image，缺省不设（回落站点默认 OG）。
 */
export function buildGallerySeo(items: GalleryItem[] = []): SeoInput {
  const path = "/gallery";
  return {
    title: "Gallery",
    description:
      "Explore finished timber, laminate and hybrid flooring projects, showroom displays and installations from Maywood Flooring across Melbourne and Victoria.",
    path,
    canonical: path,
    image: items[0]?.url,
  };
}

/**
 * 取全部图库图片（build 时调用），已归一化。
 * Phase 1 galleryImage 未灌入 → 恒返回空数组；页面据此渲染优雅空态。
 */
export async function getGalleryItems(): Promise<GalleryItem[]> {
  const raw =
    await getSanityClient().fetch<Record<string, unknown>[]>(
      GALLERY_IMAGES_QUERY
    );
  return normaliseGalleryItems(raw);
}
