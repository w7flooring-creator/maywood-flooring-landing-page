/**
 * 产品查询层 —— 页面在 build 时从 Sanity 拉取 Product（单个产品详情、按
 * Collection / Category 列出、以及全量 slug 供 getStaticPaths）。
 *
 * 与 taxonomy.ts 同构：GROQ 查询字符串拆成纯函数/常量（可单测，不触网）；
 * 带 `get*` 前缀的函数才真正用 `getSanityClient()` 发请求。按 slug / Collection /
 * Category 取数的查询一律用 `$params` 传参，避免把外部 slug 拼进 GROQ（防注入）。
 *
 * 页面只消费 `get*` 函数，不要在页面里硬编码产品数据。
 *
 * 术语见 CONTEXT.md（Category / Collection / Product）；规格字段与 SEO 见 AGENTS.md。
 */
import { getSanityClient } from "@/lib/sanity";

/** Category / Collection 的轻量摘要（解引用结果）。 */
export interface TaxonomyRef {
  _id: string;
  title: string;
  slug: string;
}

/** Sanity image asset 的精简形状（投影 asset ref + alt）。 */
export interface ProductImage {
  /** 解引用后的 asset _ref，供前端用 @sanity/image-url 构图。 */
  assetRef: string | null;
  alt: string | null;
}

/** 列表 / 相关产品用的产品摘要（卡片所需的最小字段）。 */
export interface ProductSummary {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  mainImage: ProductImage | null;
}

/** 产品详情页消费的完整产品形状（GROQ 投影结果）。 */
export interface Product extends ProductSummary {
  legacyPath: string | null;
  status: string | null;
  /** 归属 Category 摘要（解引用），无引用时为 null。 */
  category: TaxonomyRef | null;
  /** 归属 Collection 摘要（解引用），无引用时为 null。 */
  collection: TaxonomyRef | null;
  gallery: ProductImage[] | null;
  // —— 产品详情页规格列表（AGENTS.md「产品详情」九个字段）——
  type: string | null;
  dimensions: string | null;
  packSize: string | null;
  packWeight: string | null;
  finish: string | null;
  bevel: string | null;
  profile: string | null;
  grade: string | null;
  environmentalRate: string | null;
  // —— 补充规格（用于筛选 / 内容，不一定进规格表）——
  waterResistance: string | null;
  material: string | null;
  colourTone: string | null;
  installationMethod: string | null;
  applications: string[] | null;
  downloads: ProductDownload[] | null;
  /** 相关产品（解引用为摘要）。 */
  relatedProducts: ProductSummary[] | null;
}

/** 可下载资料（如规格表 / 安装指南）的精简形状。 */
export interface ProductDownload {
  title: string | null;
  assetRef: string | null;
}

/** image 字段投影：解平 asset ref + alt。 */
const IMAGE_PROJECTION = `{
  "assetRef": asset._ref,
  alt
}`;

/** 列表 / 相关产品共用的产品摘要投影。 */
const PRODUCT_SUMMARY_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  mainImage ${IMAGE_PROJECTION}
}`;

/** 产品详情完整投影（解引用 Category / Collection / relatedProducts）。 */
const PRODUCT_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  legacyPath,
  status,
  shortDescription,
  "category": category->{ _id, title, "slug": slug.current },
  "collection": collection->{ _id, title, "slug": slug.current },
  mainImage ${IMAGE_PROJECTION},
  gallery[] ${IMAGE_PROJECTION},
  type,
  dimensions,
  packSize,
  packWeight,
  finish,
  bevel,
  profile,
  grade,
  environmentalRate,
  waterResistance,
  material,
  colourTone,
  installationMethod,
  applications,
  "downloads": downloads[]{ title, "assetRef": asset._ref },
  relatedProducts[]-> ${PRODUCT_SUMMARY_PROJECTION}
}`;

/** 已发布产品的过滤条件（列表 / 路由只出已发布、且有 slug 的产品）。 */
const PUBLISHED_PRODUCT_FILTER = `_type == "product" && status == "published" && defined(slug.current)`;

/** 列表稳定排序：按标题字母升序。 */
const PRODUCT_ORDERING = `order(title asc)`;

/** 全部已发布产品的 slug（供 product-page/[slug].astro 的 getStaticPaths）。 */
export const PRODUCT_SLUGS_QUERY = `*[${PUBLISHED_PRODUCT_FILTER}]{ "slug": slug.current }`;

/**
 * 按 slug 取单个产品（详情页）。
 * 用 `$slug` 参数传值，避免注入；不过滤 status，使 draft/preview 也能按 slug 访问，
 * 是否出页由 getStaticPaths（消费 PRODUCT_SLUGS_QUERY）决定。
 */
export const PRODUCT_BY_SLUG_QUERY = `*[_type == "product" && slug.current == $slug][0] ${PRODUCT_PROJECTION}`;

/**
 * 构造「按 Collection slug 取其下已发布产品」的 GROQ。
 * 纯字符串构造，便于单测；参数 `$collectionSlug` 由调用方以 params 传入，避免注入。
 */
export function buildProductsByCollectionQuery(): string {
  return `*[${PUBLISHED_PRODUCT_FILTER} && collection->slug.current == $collectionSlug] | ${PRODUCT_ORDERING} ${PRODUCT_SUMMARY_PROJECTION}`;
}

/**
 * 构造「按 Category slug 取其下已发布产品」的 GROQ。
 * 参数 `$categorySlug` 由调用方以 params 传入，避免注入。
 */
export function buildProductsByCategoryQuery(): string {
  return `*[${PUBLISHED_PRODUCT_FILTER} && category->slug.current == $categorySlug] | ${PRODUCT_ORDERING} ${PRODUCT_SUMMARY_PROJECTION}`;
}

/** 取全部已发布产品的 slug（build 时给 getStaticPaths 用）。 */
export async function allProductSlugs(): Promise<string[]> {
  const rows =
    await getSanityClient().fetch<{ slug: string }[]>(PRODUCT_SLUGS_QUERY);
  return rows.map((row) => row.slug);
}

/** 按 slug 取单个产品（详情页）；找不到返回 null。 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  return getSanityClient().fetch<Product | null>(PRODUCT_BY_SLUG_QUERY, {
    slug,
  });
}

/** 取某 Collection（按 slug）下的全部已发布产品。 */
export async function getProductsByCollection(
  collectionSlug: string
): Promise<ProductSummary[]> {
  return getSanityClient().fetch<ProductSummary[]>(
    buildProductsByCollectionQuery(),
    { collectionSlug }
  );
}

/** 取某 Category（按 slug）下的全部已发布产品。 */
export async function getProductsByCategory(
  categorySlug: string
): Promise<ProductSummary[]> {
  return getSanityClient().fetch<ProductSummary[]>(
    buildProductsByCategoryQuery(),
    { categorySlug }
  );
}
