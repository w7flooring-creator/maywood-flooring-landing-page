/**
 * 内容页（`page` / `resource`）的数据与纯逻辑层 —— About / Sustainability / Resources。
 *
 * 拆分原则同 collection-landing.ts：
 *  - GROQ 字符串、归一化、面包屑构造、SEO 输入构造都是纯函数/常量
 *    （可单测、不触网）；
 *  - 只有 `get*` 函数才真正用 getSanityClient() 发请求。
 *
 * 「内容尚未灌入」是常态（编辑后续在 Studio 填 body / heroImage / SEO）：
 * 本模块只负责把**存在的字段**安全地投影出来；缺字段一律给 null/空数组，
 * 由页面优雅降级（静态 editorial 回落文案），绝不输出 lorem。
 *
 * 术语见 CONTEXT.md；URL/canonical 策略见 ADR-0001。
 */
import { getSanityClient } from "@/lib/sanity";
import type { PortableTextBlock } from "@portabletext/types";
import type { BreadcrumbItem, SeoInput } from "@/lib/seo";

/** 投影自 image{ asset->url, alt }，无图时整体为 null。 */
export interface ContentImage {
  url: string;
  alt: string | null;
}

/**
 * `page` 文档（通用内容页：About Us / Sustainability）的投影形状。
 * body 是 Portable Text 数组（含 block 与 image），交给 RichTextRenderer 渲染。
 */
export interface ContentPage {
  _id: string;
  title: string;
  slug: string;
  /** Hero 主图（未上传时为 null —— 页面回落到无图的克制 hero）。 */
  heroImage: ContentImage | null;
  /** Portable Text 正文（编辑未填时为空数组 —— 页面用静态回落文案）。 */
  body: PortableTextBlock[];
  /** 编辑在 seo 对象里手填的 metaTitle，缺省 null（页面回落到 title）。 */
  seoTitle: string | null;
  /** 编辑在 seo 对象里手填的 metaDescription，缺省 null。 */
  seoDescription: string | null;
}

/** Resources 列表卡片消费的资料摘要形状（GROQ 投影结果）。 */
export interface ResourceSummary {
  _id: string;
  title: string;
  slug: string;
  /** 卡片摘要（编辑未填时为 null —— 卡片只显标题）。 */
  excerpt: string | null;
  /** 卡片缩略图（未上传时为 null —— 卡片回落到无图布局）。 */
  heroImage: ContentImage | null;
  /** 分类标签（如 Installation / Care & Maintenance），缺省 null。 */
  category: string | null;
  /** 发布时间 ISO 字符串，缺省 null。 */
  publishedAt: string | null;
}

/**
 * body 内嵌图片的 asset 解引用投影：把每个 image 块的 asset->url 解出来，
 * 这样 RichTextRenderer 的 image 组件能直接拿到 url（生产不热链 Wix，资产在 Sanity CDN）。
 */
const BODY_PROJECTION = `body[]{
    ...,
    _type == "image" => { ..., "url": asset->url }
  }`;

/** `page` 投影：解平 slug、解引用 heroImage / body 内图片、摘出 seo 子字段。 */
const PAGE_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  "heroImage": heroImage{ "url": asset->url, alt },
  ${BODY_PROJECTION},
  "seoTitle": seo.metaTitle,
  "seoDescription": seo.metaDescription
}`;

/** 资料卡片投影：解平 slug、解引用缩略图、摘出 category / publishedAt。 */
const RESOURCE_SUMMARY_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  "heroImage": heroImage{ "url": asset->url, alt },
  category,
  publishedAt
}`;

/** 按 slug 取单个 `page`（用 $slug 参数传入，防注入）。 */
export const PAGE_BY_SLUG_QUERY = `*[_type == "page" && slug.current == $slug][0] ${PAGE_PROJECTION}`;

/** 全部资料，按发布时间新→旧（无时间者沉底），同时间再按标题。 */
export const RESOURCES_QUERY = `*[_type == "resource"] | order(publishedAt desc, title asc) ${RESOURCE_SUMMARY_PROJECTION}`;

/** image 投影可能返回 url 为空的对象——归一化成「有 url 才算有图」。 */
export function normaliseContentImage(raw: unknown): ContentImage | null {
  if (!raw || typeof raw !== "object") return null;
  const { url, alt } = raw as { url?: unknown; alt?: unknown };
  if (typeof url !== "string" || url.length === 0) return null;
  return { url, alt: typeof alt === "string" && alt.length > 0 ? alt : null };
}

/** 把空字符串/全空白归一化为 null（编辑留空字段在 GROQ 里可能回 "" 或缺省）。 */
function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** body 归一化：非数组（缺省 / null）一律收敛为空数组，页面据此判空降级。 */
export function normaliseBody(raw: unknown): PortableTextBlock[] {
  return Array.isArray(raw) ? (raw as PortableTextBlock[]) : [];
}

/**
 * 归一化一条 `page` 投影：所有「可能缺」的字段统一收敛为 null / 空数组，
 * 让页面只需判空，不必关心 GROQ 返回的是 undefined / "" / 缺键。
 */
export function normaliseContentPage(
  raw: Record<string, unknown>
): ContentPage {
  return {
    _id: String(raw._id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    heroImage: normaliseContentImage(raw.heroImage),
    body: normaliseBody(raw.body),
    seoTitle: emptyToNull(raw.seoTitle),
    seoDescription: emptyToNull(raw.seoDescription),
  };
}

/** 归一化一条资料摘要：缺字段收敛为 null / 空，绝不编造内容。 */
export function normaliseResourceSummary(
  raw: Record<string, unknown>
): ResourceSummary {
  return {
    _id: String(raw._id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    excerpt: emptyToNull(raw.excerpt),
    heroImage: normaliseContentImage(raw.heroImage),
    category: emptyToNull(raw.category),
    publishedAt: emptyToNull(raw.publishedAt),
  };
}

/** 内容页是否有可渲染正文（body 至少一个块）。 */
export function hasBody(page: ContentPage | null): boolean {
  return page !== null && page.body.length > 0;
}

/**
 * 内容页面包屑：Home > {页面标题}。
 * 末项指向自身 /<slug>（与 canonical 一致）。fallbackTitle 用于 Sanity 无文档时
 * （页面有静态回落标题，面包屑仍要正确）。
 */
export function buildContentBreadcrumbs(
  path: string,
  title: string
): BreadcrumbItem[] {
  return [
    { name: "Home", url: "/" },
    { name: title, url: path },
  ];
}

/**
 * 内容页 SEO 输入。
 * - title/description 优先用编辑填的 seo 字段，否则回落到传入的 fallback
 *   （页面提供符合事实的静态回落文案，不编造营销长文）。
 * - canonical 缺省由 BaseLayout 取当前路径自指（内容页非近重复，无需显式指定）。
 */
export function buildContentSeo(args: {
  path: string;
  page: ContentPage | null;
  fallbackTitle: string;
  fallbackDescription: string;
}): SeoInput {
  const { path, page, fallbackTitle, fallbackDescription } = args;
  return {
    title: page?.seoTitle ?? page?.title ?? fallbackTitle,
    description: page?.seoDescription ?? fallbackDescription,
    path,
    type: "article",
  };
}

/** 取单个 `page`（build 时调用），已归一化；无文档时返回 null。 */
export async function getPageBySlug(slug: string): Promise<ContentPage | null> {
  const raw = await getSanityClient().fetch<Record<string, unknown> | null>(
    PAGE_BY_SLUG_QUERY,
    { slug }
  );
  return raw ? normaliseContentPage(raw) : null;
}

/** 取全部资料（build 时调用），已归一化、已排序。 */
export async function getResources(): Promise<ResourceSummary[]> {
  const raw =
    await getSanityClient().fetch<Record<string, unknown>[]>(RESOURCES_QUERY);
  return (raw ?? []).map(normaliseResourceSummary);
}
