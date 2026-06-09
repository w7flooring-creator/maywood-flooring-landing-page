/**
 * 分类页 /category/[slug] store 视图的数据与纯逻辑层。
 *
 * 拆分原则同 taxonomy.ts / collection-landing.ts：
 *  - GROQ 字符串、getStaticPaths→paths 映射、面包屑构造、SEO 输入构造、归一化
 *    都是纯函数/常量（可单测、不触网）；
 *  - 只有 `get*` 函数才真正用 getSanityClient() 发请求。
 *
 * 为什么不直接用 taxonomy.ts 的 getCategories()：
 *  分类页需要 Category 的 description / heroImage / seo 字段（intro、hero、SEO），
 *  而 taxonomy.ts 的 Category 投影只取导航/路由所需的精简字段。这里给分类页一份
 *  更全的投影（CategoryLanding），与 collection-landing.ts 的落地页投影同构。
 *  getStaticPaths 因此每条 path 都带齐页面 props，无需在页面里二次取数。
 *
 * 「内容尚未灌入」是常态：description / heroImage 由编辑后续在 Studio 填；
 * product 文档 Phase 1 未灌入 → 产品网格恒空。本模块只负责把**存在的字段**
 * 安全投影出来，缺字段一律给 null，由页面优雅降级，绝不编造文案。
 *
 * ⚠️ legacy slug 故意保留 Wix 历史值，可能与展示名不符（见 ADR-0001）：
 *   solid-flooring → 展示 Laminate；sustainable-flooring → 展示 Hybrid。
 *   intro 文案以 Sanity description 为准（编辑可改），不在代码里硬编码材质措辞。
 *
 * canonical 指向自身 /category/<slug>：分类是 store 视图，没有独立营销落地页
 * （招牌系列才有 /<slug> 营销落地页，那是 collection-landing.ts 的情形）。
 *
 * 术语见 CONTEXT.md；URL/canonical 策略见 ADR-0001。
 */
import { getSanityClient } from "@/lib/sanity";
import type { BreadcrumbItem, SeoInput } from "@/lib/seo";

/** 分类页 hero 主图（投影自 heroImage.asset->url + alt），无图时整体为 null。 */
export interface CategoryHeroImage {
  url: string;
  alt: string | null;
}

/** 分类页消费的 Category 形状（GROQ 投影结果，比 taxonomy.ts 的 Category 更全）。 */
export interface CategoryLanding {
  _id: string;
  title: string;
  slug: string;
  /** 分类介绍（编辑未填时为 null —— 页面不渲染 intro 文字，不编造材质措辞）。 */
  description: string | null;
  /** Hero 主图（未上传时为 null —— 页面回落到无图的 muted hero）。 */
  heroImage: CategoryHeroImage | null;
  /** 编辑在 seo 对象里手填的 metaTitle，缺省 null（页面回落到 title）。 */
  seoTitle: string | null;
  /** 编辑在 seo 对象里手填的 metaDescription，缺省 null。 */
  seoDescription: string | null;
}

/** Category 投影：解平 slug、解引用 heroImage 资产、摘出 seo 子字段。 */
const CATEGORY_LANDING_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  description,
  "heroImage": heroImage{ "url": asset->url, alt },
  "seoTitle": seo.metaTitle,
  "seoDescription": seo.metaDescription
}`;

/** 全部 Category（分类页 getStaticPaths 用），按 sortOrder 升序。 */
export const CATEGORY_LANDINGS_QUERY = `*[_type == "productCategory"] | order(sortOrder asc) ${CATEGORY_LANDING_PROJECTION}`;

/**
 * 分类页产品网格用的产品摘要：卡片所需最小字段 + **已解析的图片 url**。
 *
 * 为什么在数据层解 url（而非传 assetRef 给卡片）：项目未装 @sanity/image-url，
 * 沿用 collection-landing.ts 的做法——在 GROQ 里 `mainImage.asset->url` 直接解出
 * 可用 url，卡片只消费 url（与 CollectionRelatedProducts 同构）。
 */
export interface CategoryProduct {
  _id: string;
  title: string;
  slug: string;
  /** 已解析的主图 url（编辑未传图时为 null —— 卡片回落到占位，不破版）。 */
  imageUrl: string | null;
}

/**
 * 构造「按 Category slug 取其下已发布产品（含解析图 url）」的 GROQ。
 * product 文档 Phase 1 未灌入 → 现阶段恒返回空数组；此查询面向产品上线后预留。
 * 用 $categorySlug 参数传入，避免注入；只出已发布、有 slug 的产品，按标题升序。
 */
export function buildCategoryProductsQuery(): string {
  return `*[_type == "product" && status == "published" && defined(slug.current) && category->slug.current == $categorySlug] | order(title asc){
    _id,
    title,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url
  }`;
}

/** heroImage 投影可能返回 url 为空的对象——归一化成「有 url 才算有图」。 */
function normaliseHeroImage(raw: unknown): CategoryHeroImage | null {
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

/**
 * 归一化一条 Category 投影：所有「可能缺」的字段统一收敛为 null，
 * 让页面只需判空，不必关心 GROQ 返回的是 undefined / "" / 缺键。
 */
export function normaliseCategoryLanding(
  raw: Record<string, unknown>
): CategoryLanding {
  return {
    _id: String(raw._id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    description: emptyToNull(raw.description),
    heroImage: normaliseHeroImage(raw.heroImage),
    seoTitle: emptyToNull(raw.seoTitle),
    seoDescription: emptyToNull(raw.seoDescription),
  };
}

/**
 * 由 Category 列表生成 getStaticPaths 的返回数组。
 * 纯映射（不触网），便于单测：每个 slug → { params: { slug }, props: { category } }。
 * 过滤掉缺 slug 的脏数据，避免生成无效路由。
 */
export function toStaticPaths(categories: CategoryLanding[]): Array<{
  params: { slug: string };
  props: { category: CategoryLanding };
}> {
  return categories
    .filter((c) => c.slug.length > 0)
    .map((category) => ({
      params: { slug: category.slug },
      props: { category },
    }));
}

/**
 * 分类页面包屑：Home > {Category}。
 * 末项指向自身 /category/<slug>（与 canonical 一致）。
 */
export function buildCategoryBreadcrumbs(
  category: CategoryLanding
): BreadcrumbItem[] {
  return [
    { name: "Home", url: "/" },
    { name: category.title, url: `/category/${category.slug}` },
  ];
}

/**
 * 分类页 SEO 输入。
 * - canonical 指向自身 /category/<slug>：分类 store 视图是主版本，无独立营销落地页。
 * - title/description 优先用编辑填的 seo 字段，否则从分类名生成一句符合事实的回落描述
 *   （不编造营销长文；尤其不写错材质——material 措辞以 Sanity description 为准）。
 */
export function buildCategorySeo(category: CategoryLanding): SeoInput {
  const path = `/category/${category.slug}`;
  const title = category.seoTitle ?? category.title;
  const description =
    category.seoDescription ??
    category.description ??
    `${category.title} from Maywood Flooring — browse our range, supplied to trade, wholesale and homeowners across Melbourne and Victoria.`;
  return {
    title,
    description,
    path,
    canonical: path,
  };
}

/** 取全部 Category（分类页 build 时调用），已归一化。 */
export async function getCategoryLandings(): Promise<CategoryLanding[]> {
  const raw = await getSanityClient().fetch<Record<string, unknown>[]>(
    CATEGORY_LANDINGS_QUERY
  );
  return (raw ?? []).map(normaliseCategoryLanding);
}

/**
 * 取某 Category（按 slug）下的已发布产品（含解析图 url），供产品网格 + 计数。
 * Phase 1 product 未灌入 → 恒返回空数组；页面据此渲染 0 计数 + 空态网格。
 */
export async function getCategoryProducts(
  categorySlug: string
): Promise<CategoryProduct[]> {
  const result = await getSanityClient().fetch<CategoryProduct[]>(
    buildCategoryProductsQuery(),
    { categorySlug }
  );
  return result ?? [];
}

/**
 * 构造「跨分类精选产品」GROQ（About 页「Explore Our Products」轮播用）。
 * 只取已发布、有 slug 且**有主图**的产品，按标题升序取前 limit 个。
 * limit 是受控整数（调用方常量，非用户输入），直接内插安全。
 */
export function buildFeaturedProductsQuery(limit: number): string {
  const n = Math.max(1, Math.floor(limit));
  return `*[_type == "product" && status == "published" && defined(slug.current) && defined(mainImage.asset)] | order(title asc) [0...${n}]{
    _id,
    title,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url
  }`;
}

/**
 * 取一组跨分类精选产品（含解析图 url）。Phase 1 product 未灌入 → 恒返回空数组，
 * 调用方据此优雅隐藏轮播。生产走 Sanity CDN（图片在 island 内经 sanityImageUrl 优化）。
 */
export async function getFeaturedProducts(
  limit = 8
): Promise<CategoryProduct[]> {
  const result = await getSanityClient().fetch<CategoryProduct[]>(
    buildFeaturedProductsQuery(limit)
  );
  return result ?? [];
}
