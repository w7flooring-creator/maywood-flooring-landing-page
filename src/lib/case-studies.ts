/**
 * Case study（案例 / 项目）页 /projects/[slug] 的数据与纯逻辑层（issue #21）。
 *
 * 拆分原则同 product-detail.ts / content-pages.ts：
 *  - GROQ 字符串、getStaticPaths→paths 映射、面包屑、SEO 输入、Article JSON-LD
 *    全是纯函数/常量（可单测、不触网）；
 *  - 只有 `get*` 函数才真正用 getSanityClient() 发请求。
 *
 * 图片在数据层直接解出可渲染 url：本仓库未装 `@sanity/image-url`，沿用
 * product-detail.ts / gallery.ts 的 `asset->url` 约定（生产禁止热链 Wix，
 * 这里解出的是 Sanity CDN url）。body 内嵌图片同 content-pages.ts 一样
 * 在投影里解出 url，供 RichTextRenderer 的 image 组件直接消费。
 *
 * 「案例尚未灌入」是 Phase 1 常态（无 read token → getCaseStudySlugs() 恒空 →
 * 本地/CI 构建 0 项目页，**符合预期**；4 个已知 legacy slug —— zero-carbon-world /
 * desert-wildlife-conservation / renewable-energy-program / rainforest-action-initiative
 * —— 待编辑在 Studio 建成 caseStudy 文档后自动「亮起」）。本模块对空字段一律
 * 收敛为 null / 空数组，由页面/组件优雅降级，绝不输出 lorem。
 *
 * 术语见 CONTEXT.md；路由 /projects/<slug> 与 SEO（Article 结构化数据）见 AGENTS.md。
 */
import { getSanityClient } from "@/lib/sanity";
import type { PortableTextBlock } from "@portabletext/types";
import type { BreadcrumbItem, SeoInput } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";

/** 一张可直接渲染的案例图（已解引用 asset->url）。无 url 视为无图。 */
export interface CaseStudyImage {
  url: string;
  alt: string | null;
}

/** 所用产品摘要（交叉链接到 /product-page/<slug> 用最小字段）。 */
export interface CaseStudyProductRef {
  title: string;
  slug: string;
}

/** 案例详情页消费的完整视图模型（GROQ 投影 + 归一化结果）。 */
export interface CaseStudy {
  _id: string;
  title: string;
  slug: string;
  /** 项目地点（如 "Brighton, Melbourne"），缺省 null。本地 SEO 用。 */
  location: string | null;
  /** 项目类型（如 "Residential" / "Commercial"），缺省 null。 */
  projectType: string | null;
  /** 一两句话摘要，缺省 null（页面 / 卡片据此判空）。 */
  summary: string | null;
  /** Portable Text 正文（编辑未填时为空数组 —— 页面据此不渲染 RichTextRenderer）。 */
  body: PortableTextBlock[];
  /** 项目图库（已解引用、去空），空数组表示无图。 */
  images: CaseStudyImage[];
  /** 所用产品（解引用为摘要），无关联时为空数组。 */
  productsUsed: CaseStudyProductRef[];
  /** 编辑在 seo 对象里手填的 metaTitle，缺省 null（回落到 title）。 */
  seoTitle: string | null;
  /** 编辑在 seo 对象里手填的 metaDescription，缺省 null。 */
  seoDescription: string | null;
}

/**
 * 列表 / 相关案例卡片（CaseStudyCard）消费的摘要形状。
 * 比完整 CaseStudy 轻：只取卡片需要的字段（标题 / slug / 地点 / 类型 / 摘要 / 首图）。
 */
export interface CaseStudySummary {
  _id: string;
  title: string;
  slug: string;
  location: string | null;
  projectType: string | null;
  summary: string | null;
  /** 卡片缩略图（取 images 首张），无图时为 null。 */
  image: CaseStudyImage | null;
}

/** 单个 image 字段投影：解引用 asset->url + alt。 */
const IMAGE_PROJECTION = `{ "url": asset->url, alt }`;

/**
 * body 内嵌图片的 asset 解引用投影：把每个 image 块的 asset->url 解出来，
 * 这样 RichTextRenderer 的 image 组件能直接拿到 url（同 content-pages.ts）。
 */
const BODY_PROJECTION = `body[]{
    ...,
    _type == "image" => { ..., "url": asset->url }
  }`;

/**
 * 案例详情投影：解引用 images / productsUsed / body 内图片为可直接渲染的 url，
 * 摘出 seo 子字段。
 */
const CASE_STUDY_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  location,
  projectType,
  summary,
  ${BODY_PROJECTION},
  "images": images[] ${IMAGE_PROJECTION},
  "productsUsed": productsUsed[]->{ title, "slug": slug.current },
  "seoTitle": seo.metaTitle,
  "seoDescription": seo.metaDescription
}`;

/** 案例卡片摘要投影：只取卡片字段，首图解为可渲染 url。 */
const CASE_STUDY_SUMMARY_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  location,
  projectType,
  summary,
  "image": images[0] ${IMAGE_PROJECTION}
}`;

/** 已发布（= 有 slug）案例的过滤条件（路由只出有 slug 的案例）。 */
const CASE_STUDY_FILTER = `_type == "caseStudy" && defined(slug.current)`;

/** 全部案例的 slug（供 getStaticPaths）。 */
export const CASE_STUDY_SLUGS_QUERY = `*[${CASE_STUDY_FILTER}]{ "slug": slug.current }`;

/**
 * 按 slug 取单个案例详情。用 `$slug` 参数传值，避免把外部 slug 拼进 GROQ（防注入）。
 */
export const CASE_STUDY_BY_SLUG_QUERY = `*[_type == "caseStudy" && slug.current == $slug][0] ${CASE_STUDY_PROJECTION}`;

/** 全部案例摘要（列表 / 相关用），按标题升序（无发布时间字段，标题为稳定序）。 */
export const CASE_STUDY_SUMMARIES_QUERY = `*[${CASE_STUDY_FILTER}] | order(title asc) ${CASE_STUDY_SUMMARY_PROJECTION}`;

/** 把空字符串/全空白/非字符串归一化为 null。 */
function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** image 投影可能返回 url 为空——归一化成「有 url 才算有图」。 */
function normaliseImage(raw: unknown): CaseStudyImage | null {
  if (!raw || typeof raw !== "object") return null;
  const { url, alt } = raw as { url?: unknown; alt?: unknown };
  if (typeof url !== "string" || url.length === 0) return null;
  return { url, alt: emptyToNull(alt) };
}

/** images 列表归一化：丢弃无 url 的脏数据、保留 GROQ 顺序。 */
function normaliseImages(raw: unknown): CaseStudyImage[] {
  if (!Array.isArray(raw)) return [];
  const images: CaseStudyImage[] = [];
  for (const entry of raw) {
    const img = normaliseImage(entry);
    if (img) images.push(img);
  }
  return images;
}

/** body 归一化：非数组（缺省 / null）一律收敛为空数组，页面据此判空降级。 */
export function normaliseBody(raw: unknown): PortableTextBlock[] {
  return Array.isArray(raw) ? (raw as PortableTextBlock[]) : [];
}

/** 解引用的产品摘要归一化（缺 title/slug 视为脏数据，丢弃）。 */
function normaliseProductRef(raw: unknown): CaseStudyProductRef | null {
  if (!raw || typeof raw !== "object") return null;
  const { title, slug } = raw as { title?: unknown; slug?: unknown };
  if (typeof title !== "string" || typeof slug !== "string") return null;
  if (title.length === 0 || slug.length === 0) return null;
  return { title, slug };
}

/** productsUsed 投影归一化：丢弃缺 title/slug 的脏数据（含未发布 / 缺 slug 的引用）。 */
export function normaliseProductsUsed(raw: unknown): CaseStudyProductRef[] {
  if (!Array.isArray(raw)) return [];
  const result: CaseStudyProductRef[] = [];
  for (const entry of raw) {
    const ref = normaliseProductRef(entry);
    if (ref) result.push(ref);
  }
  return result;
}

/**
 * 归一化一条案例详情投影：所有「可能缺」的字段统一收敛为 null / 空数组，
 * 让页面只需判空，不必关心 GROQ 返回的是 undefined / "" / 缺键。
 */
export function normaliseCaseStudy(raw: Record<string, unknown>): CaseStudy {
  return {
    _id: String(raw._id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    location: emptyToNull(raw.location),
    projectType: emptyToNull(raw.projectType),
    summary: emptyToNull(raw.summary),
    body: normaliseBody(raw.body),
    images: normaliseImages(raw.images),
    productsUsed: normaliseProductsUsed(raw.productsUsed),
    seoTitle: emptyToNull(raw.seoTitle),
    seoDescription: emptyToNull(raw.seoDescription),
  };
}

/** 归一化一条案例摘要：缺字段收敛为 null，绝不编造内容。 */
export function normaliseCaseStudySummary(
  raw: Record<string, unknown>
): CaseStudySummary {
  return {
    _id: String(raw._id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    location: emptyToNull(raw.location),
    projectType: emptyToNull(raw.projectType),
    summary: emptyToNull(raw.summary),
    image: normaliseImage(raw.image),
  };
}

/** 案例是否有可渲染正文（body 至少一个块）。 */
export function hasBody(caseStudy: CaseStudy | null): boolean {
  return caseStudy !== null && caseStudy.body.length > 0;
}

/** 案例详情页 canonical / og:url 路径。 */
export function caseStudyPath(slug: string): string {
  return `/projects/${slug}`;
}

/**
 * 详情页面包屑：Home > Projects > {Project}。
 * 「Projects」指向项目列表落点 /projects；末项为当前案例（与 canonical 一致）。
 */
export function buildCaseStudyBreadcrumbs(
  caseStudy: Pick<CaseStudy, "title" | "slug">
): BreadcrumbItem[] {
  return [
    { name: "Home", url: "/" },
    { name: "Projects", url: "/projects" },
    { name: caseStudy.title, url: caseStudyPath(caseStudy.slug) },
  ];
}

/**
 * 详情页 SEO 输入。
 * - canonical 指向自身 /projects/<slug>（案例是唯一主版本）。
 * - title/description 优先用编辑填的 seo 字段，否则回落到案例名 / summary，
 *   再不行给一句符合事实的克制描述（拼上地点 / 类型，不编造营销长文）。
 * - type=article（案例本质是项目故事，OG / 结构化数据按 Article 处理）。
 */
export function buildCaseStudySeo(caseStudy: CaseStudy): SeoInput {
  const path = caseStudyPath(caseStudy.slug);
  const title = caseStudy.seoTitle ?? caseStudy.title;
  const context = [caseStudy.projectType, caseStudy.location]
    .filter((part): part is string => part !== null)
    .join(", ");
  const fallbackDescription = context
    ? `${caseStudy.title} — a ${context} flooring project by Maywood Flooring.`
    : `${caseStudy.title} — a flooring project by Maywood Flooring, Melbourne.`;
  const description =
    caseStudy.seoDescription ?? caseStudy.summary ?? fallbackDescription;
  return {
    title,
    description,
    path,
    canonical: path,
    type: "article",
    image: caseStudy.images[0]?.url,
  };
}

/** schema.org Article JSON-LD（案例页专属，叠加在站点级 LocalBusiness 之上）。 */
export interface CaseStudyJsonLd {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  url: string;
  description?: string;
  image?: string[];
  publisher: { "@type": "Organization"; name: string };
}

/**
 * 构造案例页 Article 结构化数据（AGENTS.md「结构化数据：博客/资源 Article/BlogPosting」，
 * 案例同属 editorial 项目故事，按 Article 处理）。
 * 只输出有值的字段；图片 / 描述缺省时整字段省略，不放空串 / 空数组。
 */
export function buildCaseStudyJsonLd(caseStudy: CaseStudy): CaseStudyJsonLd {
  const url = absoluteUrl(caseStudyPath(caseStudy.slug));
  const description =
    caseStudy.seoDescription ?? caseStudy.summary ?? undefined;
  const images = caseStudy.images.map((img) => img.url);

  const jsonLd: CaseStudyJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: caseStudy.title,
    url,
    publisher: { "@type": "Organization", name: SITE.name },
  };
  if (description) jsonLd.description = description;
  if (images.length > 0) jsonLd.image = images;
  return jsonLd;
}

/**
 * 由 slug 列表生成 getStaticPaths 返回数组（纯映射，便于单测）。
 * Phase 1 案例未灌入 → 入参恒空 → 0 项目页（符合预期）。
 */
export function toCaseStudyPaths(
  slugs: string[]
): Array<{ params: { slug: string } }> {
  return slugs
    .filter((slug) => slug.length > 0)
    .map((slug) => ({ params: { slug } }));
}

/** 取全部案例的 slug（build 时给 getStaticPaths 用）。 */
export async function getCaseStudySlugs(): Promise<string[]> {
  const rows = await getSanityClient().fetch<{ slug: string }[]>(
    CASE_STUDY_SLUGS_QUERY
  );
  return (rows ?? []).map((row) => row.slug).filter(Boolean);
}

/** 按 slug 取单个案例详情（已归一化）；找不到返回 null。 */
export async function getCaseStudyBySlug(
  slug: string
): Promise<CaseStudy | null> {
  const raw = await getSanityClient().fetch<Record<string, unknown> | null>(
    CASE_STUDY_BY_SLUG_QUERY,
    { slug }
  );
  return raw ? normaliseCaseStudy(raw) : null;
}

/** 取全部案例摘要（build 时调用），已归一化、已排序。 */
export async function getCaseStudySummaries(): Promise<CaseStudySummary[]> {
  const raw = await getSanityClient().fetch<Record<string, unknown>[]>(
    CASE_STUDY_SUMMARIES_QUERY
  );
  return (raw ?? []).map(normaliseCaseStudySummary);
}
