/**
 * 产品详情页 /product-page/[slug] 的数据与纯逻辑层（issue #13）。
 *
 * 拆分原则同 collection-landing.ts / taxonomy.ts：
 *  - GROQ 字符串、getStaticPaths→paths 映射、规格表构造、面包屑、SEO 输入、
 *    Product/BreadcrumbList JSON-LD 全是纯函数/常量（可单测、不触网）；
 *  - 只有 `get*` 函数才真正用 getSanityClient() 发请求。
 *
 * 为什么这里另起一份投影、而不复用 products.ts：
 *  - 图廊（Embla island + lightbox）需要**可直接渲染的图片 URL**。本仓库未装
 *    `@sanity/image-url`，已有的 collection-landing.ts 走 `asset->url` 直出 URL，
 *    本模块沿用同一约定（products.ts 投影的是 `asset._ref`，无法直接成 URL）。
 *  - 不改 products.ts，避免与 #12（分类/列表，ProductCard）跨 PR 文件冲突。
 *
 * 「产品尚未灌入」是 Phase 1 常态（#10 待办 → allProductSlugs() 恒空 → 本地 0
 * 产品页，符合预期）。本模块对空字段一律收敛为 null，由页面/组件优雅降级。
 *
 * 术语见 CONTEXT.md（Category / Collection / Product）；规格字段顺序与 SEO 见 AGENTS.md。
 */
import { getSanityClient } from "@/lib/sanity";
import type { BreadcrumbItem, SeoInput } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";

/** 一张可直接渲染的产品图（已解引用 asset->url）。无 url 视为无图。 */
export interface ProductDetailImage {
  url: string;
  alt: string | null;
}

/** 解引用后的 Category / Collection 摘要（取名 + slug）。 */
export interface ProductTaxonomyRef {
  title: string;
  slug: string;
}

/** 相关产品摘要（RelatedProducts 用最小字段，自包含、不依赖共享 ProductCard）。 */
export interface RelatedProductSummary {
  title: string;
  slug: string;
}

/** 详情页消费的完整产品视图模型（GROQ 投影 + 归一化结果）。 */
export interface ProductDetail {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  category: ProductTaxonomyRef | null;
  collection: ProductTaxonomyRef | null;
  /** 主图 + gallery 合并后的有序图集（首张通常是主图）。空数组表示无图。 */
  images: ProductDetailImage[];
  // —— 产品详情页规格表九个字段（AGENTS.md「产品详情」，按表中顺序）——
  type: string | null;
  dimensions: string | null;
  packSize: string | null;
  packWeight: string | null;
  finish: string | null;
  bevel: string | null;
  profile: string | null;
  grade: string | null;
  environmentalRate: string | null;
  /** 编辑在 seo 对象里手填的 metaTitle / metaDescription，缺省 null。 */
  seoTitle: string | null;
  seoDescription: string | null;
  /** 相关产品（解引用为摘要）。无关联时为空数组。 */
  relatedProducts: RelatedProductSummary[];
}

/** 单个 image 字段投影：解引用 asset->url + alt。 */
const IMAGE_PROJECTION = `{ "url": asset->url, alt }`;

/**
 * 产品详情投影：解引用 Category / Collection / relatedProducts，
 * 并把 mainImage / gallery 解成可直接渲染的 url（供 Embla 图廊）。
 */
const PRODUCT_DETAIL_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  "category": category->{ title, "slug": slug.current },
  "collection": collection->{ title, "slug": slug.current },
  "mainImage": mainImage ${IMAGE_PROJECTION},
  "gallery": gallery[] ${IMAGE_PROJECTION},
  type,
  dimensions,
  packSize,
  packWeight,
  finish,
  bevel,
  profile,
  grade,
  environmentalRate,
  "seoTitle": seo.metaTitle,
  "seoDescription": seo.metaDescription,
  "relatedProducts": relatedProducts[]->{ title, "slug": slug.current }
}`;

/** 已发布产品的过滤条件（路由只出已发布、且有 slug 的产品）。 */
const PUBLISHED_PRODUCT_FILTER = `_type == "product" && status == "published" && defined(slug.current)`;

/** 全部已发布产品的 slug（供 getStaticPaths）。 */
export const PRODUCT_DETAIL_SLUGS_QUERY = `*[${PUBLISHED_PRODUCT_FILTER}]{ "slug": slug.current }`;

/**
 * 按 slug 取单个产品详情。用 `$slug` 参数传值，避免把外部 slug 拼进 GROQ（防注入）。
 * 不在此过滤 status —— 出页与否由 getStaticPaths（消费上面的 slugs 查询）决定。
 */
export const PRODUCT_DETAIL_BY_SLUG_QUERY = `*[_type == "product" && slug.current == $slug][0] ${PRODUCT_DETAIL_PROJECTION}`;

/** 规格表一行：展示用 label + 值。值为空的行不应进入此列表（见 buildProductSpecItems）。 */
export interface ProductSpecItem {
  label: string;
  value: string;
}

/**
 * 规格表字段定义（AGENTS.md「产品详情」九个字段，按表中顺序）。
 * label 用面向访客的英文（澳洲拼写），与线上规格表一致。
 */
const SPEC_FIELDS: ReadonlyArray<{
  key: keyof Pick<
    ProductDetail,
    | "type"
    | "dimensions"
    | "packSize"
    | "packWeight"
    | "finish"
    | "bevel"
    | "profile"
    | "grade"
    | "environmentalRate"
  >;
  label: string;
}> = [
  { key: "type", label: "Type" },
  { key: "dimensions", label: "Dimension" },
  { key: "packSize", label: "Pack Size" },
  { key: "packWeight", label: "Pack Weight" },
  { key: "finish", label: "Finish" },
  { key: "bevel", label: "Bevel" },
  { key: "profile", label: "Profile" },
  { key: "grade", label: "Grade" },
  { key: "environmentalRate", label: "Environmental Rate" },
];

/**
 * 从产品构造规格表行：按 AGENTS.md 顺序，**省略空值行**（编辑没填的规格不显示，
 * 不输出占位 “—”）。纯函数，便于单测。
 */
export function buildProductSpecItems(
  product: Pick<ProductDetail, (typeof SPEC_FIELDS)[number]["key"]>
): ProductSpecItem[] {
  const items: ProductSpecItem[] = [];
  for (const field of SPEC_FIELDS) {
    const raw = product[field.key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value.length > 0) items.push({ label: field.label, value });
  }
  return items;
}

/** 把空字符串/非字符串归一化为 null。 */
function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** image 投影可能返回 url 为空——归一化成「有 url 才算有图」。 */
function normaliseImage(raw: unknown): ProductDetailImage | null {
  if (!raw || typeof raw !== "object") return null;
  const { url, alt } = raw as { url?: unknown; alt?: unknown };
  if (typeof url !== "string" || url.length === 0) return null;
  return { url, alt: emptyToNull(alt) };
}

/** 解引用的 taxonomy 摘要归一化（缺 title/slug 视为无引用）。 */
function normaliseTaxonomyRef(raw: unknown): ProductTaxonomyRef | null {
  if (!raw || typeof raw !== "object") return null;
  const { title, slug } = raw as { title?: unknown; slug?: unknown };
  if (typeof title !== "string" || typeof slug !== "string") return null;
  if (title.length === 0 || slug.length === 0) return null;
  return { title, slug };
}

/** relatedProducts 投影归一化：丢弃缺 title/slug 的脏数据。 */
function normaliseRelatedProducts(raw: unknown): RelatedProductSummary[] {
  if (!Array.isArray(raw)) return [];
  const result: RelatedProductSummary[] = [];
  for (const entry of raw) {
    const ref = normaliseTaxonomyRef(entry);
    if (ref) result.push({ title: ref.title, slug: ref.slug });
  }
  return result;
}

/**
 * 归一化一条产品详情投影：主图 + gallery 合并为有序、去空的图集；
 * 所有「可能缺」的字段统一收敛为 null / 空数组，让页面只需判空。
 */
export function normaliseProductDetail(
  raw: Record<string, unknown>
): ProductDetail {
  const mainImage = normaliseImage(raw.mainImage);
  const galleryRaw = Array.isArray(raw.gallery) ? raw.gallery : [];
  const gallery = galleryRaw
    .map(normaliseImage)
    .filter((img): img is ProductDetailImage => img !== null);
  const images = mainImage ? [mainImage, ...gallery] : gallery;

  return {
    _id: String(raw._id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    shortDescription: emptyToNull(raw.shortDescription),
    category: normaliseTaxonomyRef(raw.category),
    collection: normaliseTaxonomyRef(raw.collection),
    images,
    type: emptyToNull(raw.type),
    dimensions: emptyToNull(raw.dimensions),
    packSize: emptyToNull(raw.packSize),
    packWeight: emptyToNull(raw.packWeight),
    finish: emptyToNull(raw.finish),
    bevel: emptyToNull(raw.bevel),
    profile: emptyToNull(raw.profile),
    grade: emptyToNull(raw.grade),
    environmentalRate: emptyToNull(raw.environmentalRate),
    seoTitle: emptyToNull(raw.seoTitle),
    seoDescription: emptyToNull(raw.seoDescription),
    relatedProducts: normaliseRelatedProducts(raw.relatedProducts),
  };
}

/** 产品详情页 canonical / og:url 路径。 */
export function productPath(slug: string): string {
  return `/product-page/${slug}`;
}

/**
 * 详情页面包屑：Home > All Products > {Product}。
 * 「All Products」指向 Products 导航落点（engineered Category store 视图，
 * 与 PRIMARY_NAV 一致，见 ADR-0001 保留 legacy slug）；末项为当前产品。
 */
export function buildProductBreadcrumbs(
  product: Pick<ProductDetail, "title" | "slug">
): BreadcrumbItem[] {
  return [
    { name: "Home", url: "/" },
    { name: "All Products", url: "/category/engineered-flooring" },
    { name: product.title, url: productPath(product.slug) },
  ];
}

/**
 * 详情页 SEO 输入。
 * - canonical 指向自身 /product-page/<slug>（产品页是唯一主版本）。
 * - title/description 优先用编辑填的 seo 字段，否则回落到产品名 / shortDescription，
 *   再不行给一句符合事实的克制描述（不编造营销长文）。
 * - type=product，供 og:type。
 */
export function buildProductSeo(product: ProductDetail): SeoInput {
  const path = productPath(product.slug);
  const title = product.seoTitle ?? product.title;
  const description =
    product.seoDescription ??
    product.shortDescription ??
    `${product.title} — ${product.category?.title ?? "premium"} flooring from Maywood Flooring, Melbourne.`;
  return {
    title,
    description,
    path,
    canonical: path,
    type: "product",
    image: product.images[0]?.url,
  };
}

/** schema.org Product JSON-LD（详情页专属，叠加在站点级 LocalBusiness 之上）。 */
export interface ProductJsonLd {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  url: string;
  description?: string;
  image?: string[];
  category?: string;
  brand: { "@type": "Brand"; name: string };
}

/**
 * 构造产品页 Product 结构化数据（AGENTS.md「结构化数据：产品页 Product」）。
 * 只输出有值的字段；图片 / 描述 / 分类缺省时整字段省略，不放空串。
 */
export function buildProductJsonLd(product: ProductDetail): ProductJsonLd {
  const url = absoluteUrl(productPath(product.slug));
  const description =
    product.seoDescription ?? product.shortDescription ?? undefined;
  const images = product.images.map((img) => img.url);

  const jsonLd: ProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url,
    brand: { "@type": "Brand", name: SITE.name },
  };
  if (description) jsonLd.description = description;
  if (images.length > 0) jsonLd.image = images;
  if (product.category) jsonLd.category = product.category.title;
  return jsonLd;
}

/**
 * 由 slug 列表生成 getStaticPaths 返回数组（纯映射，便于单测）。
 * Phase 1 产品未灌入 → 入参恒空 → 0 产品页（符合预期，#10 待办）。
 */
export function toProductDetailPaths(
  slugs: string[]
): Array<{ params: { slug: string } }> {
  return slugs
    .filter((slug) => slug.length > 0)
    .map((slug) => ({ params: { slug } }));
}

/** 取全部已发布产品的 slug（build 时给 getStaticPaths 用）。 */
export async function getProductDetailSlugs(): Promise<string[]> {
  const rows = await getSanityClient().fetch<{ slug: string }[]>(
    PRODUCT_DETAIL_SLUGS_QUERY
  );
  return (rows ?? []).map((row) => row.slug).filter(Boolean);
}

/** 按 slug 取单个产品详情（已归一化）；找不到返回 null。 */
export async function getProductDetailBySlug(
  slug: string
): Promise<ProductDetail | null> {
  const raw = await getSanityClient().fetch<Record<string, unknown> | null>(
    PRODUCT_DETAIL_BY_SLUG_QUERY,
    { slug }
  );
  return raw ? normaliseProductDetail(raw) : null;
}
