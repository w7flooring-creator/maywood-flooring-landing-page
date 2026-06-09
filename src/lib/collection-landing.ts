/**
 * Signature Collection 营销落地页 /[slug] 的数据与纯逻辑层。
 *
 * 拆分原则同 taxonomy.ts：
 *  - GROQ 字符串、getStaticPaths→paths 映射、面包屑构造、SEO 输入构造
 *    都是纯函数/常量（可单测、不触网）；
 *  - 只有 `get*` 函数才真正用 getSanityClient() 发请求。
 *
 * 落地页只渲染**招牌系列**（isSignature == true）的 4 个 slug
 * （puregrain / bushland / manor / bellavale）。返回这 4 个 slug 保证
 * [slug].astro 不会遮蔽 about-us / contact 等显式页面。
 *
 * 「内容尚未灌入」是常态（编辑后续在 Studio 填 description/heroImage/products）：
 * 本模块只负责把**存在的字段**安全地投影出来；缺字段一律给 null，由页面优雅降级，
 * 绝不编造文案。术语见 CONTEXT.md；URL/canonical 策略见 ADR-0001。
 */
import { getSanityClient } from "@/lib/sanity";
import type { BreadcrumbItem, SeoInput } from "@/lib/seo";

/** 落地页 hero 主图（投影自 heroImage.asset->url + alt），无图时整体为 null。 */
export interface CollectionHeroImage {
  url: string;
  alt: string | null;
}

/** 落地页消费的招牌系列形状（GROQ 投影结果）。 */
export interface SignatureCollectionLanding {
  _id: string;
  title: string;
  slug: string;
  /** 一句话品牌标语（落地页 hero 副标题）；编辑未填时为 null。 */
  tagline: string | null;
  /** 系列描述（编辑未填时为 null —— 页面不渲染该区块，不编造文案）。 */
  description: string | null;
  /** Hero 主图（未上传时为 null —— 页面回落到无图的克制 hero）。 */
  heroImage: CollectionHeroImage | null;
  /** 编辑在 seo 对象里手填的 metaTitle，缺省 null（页面回落到 title）。 */
  seoTitle: string | null;
  /** 编辑在 seo 对象里手填的 metaDescription，缺省 null。 */
  seoDescription: string | null;
}

/**
 * 关联产品形状。product 文档类型尚未建模（见 studio/schemaTypes），
 * 故 Phase 1 关联产品恒为空；此接口与查询为后续 #(product) 预留落点。
 */
export interface RelatedProduct {
  _id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
}

/** 招牌系列投影：解平 slug、解引用 heroImage 资产、摘出 seo 子字段。 */
const SIGNATURE_LANDING_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  tagline,
  description,
  "heroImage": heroImage{ "url": asset->url, alt },
  "seoTitle": seo.metaTitle,
  "seoDescription": seo.metaDescription
}`;

/** 全部招牌系列（落地页 getStaticPaths 用），按 sortOrder 升序。 */
export const SIGNATURE_LANDINGS_QUERY = `*[_type == "productCollection" && isSignature == true] | order(sortOrder asc) ${SIGNATURE_LANDING_PROJECTION}`;

/**
 * 构造「某招牌系列下的关联产品」GROQ。
 * product 文档尚未建模 —— 该查询面向 product 上线后的 `collection` 引用预留；
 * 现阶段执行结果恒为空数组（dataset 无 product 文档）。
 * 用 $collectionId 参数传入，避免注入。
 */
export function buildRelatedProductsQuery(): string {
  return `*[_type == "product" && collection._ref == $collectionId] | order(sortOrder asc, title asc){
    _id,
    title,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url
  }`;
}

/** heroImage 投影可能返回 url 为空的对象——归一化成「有 url 才算有图」。 */
function normaliseHeroImage(raw: unknown): CollectionHeroImage | null {
  if (!raw || typeof raw !== "object") return null;
  const { url, alt } = raw as { url?: unknown; alt?: unknown };
  if (typeof url !== "string" || url.length === 0) return null;
  return { url, alt: typeof alt === "string" && alt.length > 0 ? alt : null };
}

/** 把空字符串归一化为 null（编辑留空字段在 GROQ 里可能回 "" 或缺省）。 */
function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 归一化一条招牌系列投影：所有「可能缺」的字段统一收敛为 null，
 * 让页面只需判空，不必关心 GROQ 返回的是 undefined / "" / 缺键。
 */
export function normaliseSignatureLanding(
  raw: Record<string, unknown>
): SignatureCollectionLanding {
  return {
    _id: String(raw._id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    tagline: emptyToNull(raw.tagline),
    description: emptyToNull(raw.description),
    heroImage: normaliseHeroImage(raw.heroImage),
    seoTitle: emptyToNull(raw.seoTitle),
    seoDescription: emptyToNull(raw.seoDescription),
  };
}

/**
 * 由招牌系列列表生成 getStaticPaths 的返回数组。
 * 纯映射（不触网），便于单测：每个 slug → { params: { slug }, props: { collection } }。
 * 只返回招牌系列 → 不会遮蔽 about-us / contact 等显式 .astro 页面。
 */
export function toStaticPaths(
  collections: SignatureCollectionLanding[]
): Array<{
  params: { slug: string };
  props: { collection: SignatureCollectionLanding };
}> {
  return collections
    .filter((c) => c.slug.length > 0)
    .map((collection) => ({
      params: { slug: collection.slug },
      props: { collection },
    }));
}

/**
 * 落地页面包屑：Home > {Collection}。
 * 末项指向自身 /<slug>（与 canonical 一致，见下）。
 */
export function buildLandingBreadcrumbs(
  collection: SignatureCollectionLanding
): BreadcrumbItem[] {
  return [
    { name: "Home", url: "/" },
    { name: collection.title, url: `/${collection.slug}` },
  ];
}

/**
 * 落地页 SEO 输入。
 * - canonical 显式指向自身 /<slug>：营销落地页是主版本，未来 /category/<slug>
 *   store 视图 canonical 反指这里（见 ADR-0001）。
 * - title/description 优先用编辑填的 seo 字段，否则从系列名生成克制的回落值
 *   （不编造营销长文，只给搜索引擎一句符合事实的描述）。
 */
export function buildLandingSeo(
  collection: SignatureCollectionLanding
): SeoInput {
  const path = `/${collection.slug}`;
  const title = collection.seoTitle ?? collection.title;
  const description =
    collection.seoDescription ??
    collection.description ??
    `${collection.title} — a signature engineered timber flooring collection from Maywood Flooring, Melbourne.`;
  return {
    title,
    description,
    path,
    canonical: path,
  };
}

/** 取全部招牌系列（落地页 build 时调用），已归一化。 */
export async function getSignatureLandings(): Promise<
  SignatureCollectionLanding[]
> {
  const raw = await getSanityClient().fetch<Record<string, unknown>[]>(
    SIGNATURE_LANDINGS_QUERY
  );
  return (raw ?? []).map(normaliseSignatureLanding);
}

/**
 * 取某招牌系列的关联产品（build 时调用）。
 * Phase 1 product 未建模 → 恒返回空数组；页面据此优雅隐藏关联产品区块。
 */
export async function getRelatedProducts(
  collectionId: string
): Promise<RelatedProduct[]> {
  const result = await getSanityClient().fetch<RelatedProduct[]>(
    buildRelatedProductsQuery(),
    { collectionId }
  );
  return result ?? [];
}
