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
 * 用 $categorySlug 参数传入，避免注入；只出已发布、有 slug 的产品，按标题升序。
 *
 * 归属判定为「主分类 ∪ 附加分类」：Wix 允许产品同时挂多个分类（实测
 * blackbutt-2 / fertile-oak / spotted-gum-3 同时在 Laminate 与 Hybrid 页，
 * 见 #59-#22）。Sanity 模型保持单一主分类（面包屑/规范归属），用可选的
 * `extraCategories` 表达额外的店面视图归属。
 */
export function buildCategoryProductsQuery(): string {
  return `*[_type == "product" && status == "published" && defined(slug.current) && (category->slug.current == $categorySlug || $categorySlug in extraCategories[]->slug.current)] | order(title asc){
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

/* ─────────────── Collection store 视图（/category/<collection>） ───────────────
 *
 * Wix 把 9 个 Collection 也作为 store 分类暴露在 /category/<collection-slug>
 * （实测线上 sitemap + CategorySidebar 的 "Browse by" 链接都指向这里）。ADR-0001
 * 把 /category/ 列为 1:1 保留前缀，故这些 URL 必须**渲染**（不 301）。本段把
 * Category(3) 与 Collection(9) 统一成 CategoryStoreView，让 /category/[slug] 一条
 * 路由产出 12 页（缺这段时 Collection store 视图 404，且分类页侧栏链接全断）。
 *
 * 两类差异（kind 区分）：
 *  - 面包屑：Category → Home > {Category}；Collection → Home > {父 Category} > {Collection}。
 *  - 侧栏 "Browse by"：Category 列其下 Collection；Collection 列**同父 Category 的兄弟 Collection**。
 *  - canonical：招牌 Collection 另有 /<slug> 营销落地页且为主版本 → canonical 指 /<slug>
 *    （AGENTS.md：两者都留，store 视图 rel=canonical 指 /<collection>）；其余（Category、
 *    非招牌 Collection）canonical 指自身 /category/<slug>。
 */

/** store 视图种类：材质族 Category 或品牌系列 Collection。 */
export type StoreViewKind = "category" | "collection";

/** 父 Category 摘要（Collection store 视图的面包屑 + 侧栏归属用）。 */
export interface StoreParentCategory {
  title: string;
  slug: string;
}

/**
 * /category/[slug] 统一消费的「store 视图」形状：Category 与 Collection 同构，用 kind
 * 区分。复用 CategoryLanding 全部字段（title/description/heroImage/seo），另加 Collection
 * 专属的 parentCategory（面包屑/侧栏）与 isSignature（canonical 决策）。
 */
export interface CategoryStoreView extends CategoryLanding {
  kind: StoreViewKind;
  /** Collection 的父 Category；Category kind 恒为 null。 */
  parentCategory: StoreParentCategory | null;
  /** Collection 是否招牌系列（有 /<slug> 营销落地页 → canonical 指那里）；Category kind 恒 false。 */
  isSignature: boolean;
}

/** Collection store 投影：复用 Category 富字段 + isSignature + 解引用父 Category 摘要。 */
const COLLECTION_STORE_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  description,
  "heroImage": heroImage{ "url": asset->url, alt },
  "seoTitle": seo.metaTitle,
  "seoDescription": seo.metaDescription,
  isSignature,
  "parentCategory": category->{ title, "slug": slug.current }
}`;

/** 全部 Collection（store 视图 getStaticPaths 用），按 sortOrder 升序。 */
export const COLLECTION_STORES_QUERY = `*[_type == "productCollection"] | order(sortOrder asc) ${COLLECTION_STORE_PROJECTION}`;

/**
 * 构造「按 Collection slug 取其下已发布产品（含解析图 url）」的 GROQ。
 * 与 buildCategoryProductsQuery 同构，但归属为单一 collection 引用——product 无
 * extraCollections 字段（schema 仅 extraCategories），故不做并集。
 */
export function buildCollectionStoreProductsQuery(): string {
  return `*[_type == "product" && status == "published" && defined(slug.current) && collection->slug.current == $collectionSlug] | order(title asc){
    _id,
    title,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url
  }`;
}

/** 父 Category 投影归一化：缺 title/slug 任一即视为无父（null）。 */
function normaliseParentCategory(raw: unknown): StoreParentCategory | null {
  if (!raw || typeof raw !== "object") return null;
  const { title, slug } = raw as { title?: unknown; slug?: unknown };
  if (typeof title !== "string" || title.length === 0) return null;
  if (typeof slug !== "string" || slug.length === 0) return null;
  return { title, slug };
}

/** 归一化一条 Collection store 投影为 CategoryStoreView（kind="collection"）。 */
export function normaliseCollectionStoreView(
  raw: Record<string, unknown>
): CategoryStoreView {
  return {
    ...normaliseCategoryLanding(raw),
    kind: "collection",
    parentCategory: normaliseParentCategory(raw.parentCategory),
    isSignature: raw.isSignature === true,
  };
}

/** 把一条 Category 归一化结果包成 CategoryStoreView（kind="category"）。 */
function categoryToStoreView(category: CategoryLanding): CategoryStoreView {
  return {
    ...category,
    kind: "category",
    parentCategory: null,
    isSignature: false,
  };
}

/**
 * 取 /category/[slug] 的全部 store 视图：Category(3) + Collection(9) = 12。
 * 两查询并发拉取再合并归一化。Category 与 Collection 的 slug 在数据上互不冲突
 * （3 个材质 slug vs 9 个系列 slug），故可在同一动态路由共存。
 */
export async function getCategoryStoreViews(): Promise<CategoryStoreView[]> {
  const client = getSanityClient();
  const [cats, cols] = await Promise.all([
    client.fetch<Record<string, unknown>[]>(CATEGORY_LANDINGS_QUERY),
    client.fetch<Record<string, unknown>[]>(COLLECTION_STORES_QUERY),
  ]);
  return [
    ...(cats ?? []).map(normaliseCategoryLanding).map(categoryToStoreView),
    ...(cols ?? []).map(normaliseCollectionStoreView),
  ];
}

/**
 * 由 store 视图列表生成 getStaticPaths 数组。纯映射（不触网），便于单测：
 * 每个 → { params: { slug }, props: { view } }；过滤缺 slug 的脏数据。
 */
export function toStorePaths(views: CategoryStoreView[]): Array<{
  params: { slug: string };
  props: { view: CategoryStoreView };
}> {
  return views
    .filter((v) => v.slug.length > 0)
    .map((view) => ({ params: { slug: view.slug }, props: { view } }));
}

/**
 * 侧栏 "Browse by" 取哪个 Category 的 Collection 列表：
 * Category kind 用自身 slug；Collection kind 用父 Category slug（列兄弟系列）。
 * 无父时返回 ""（getCollectionsByCategory("") 取不到 → 侧栏整块不渲染）。
 */
export function getStoreSidebarCategorySlug(view: CategoryStoreView): string {
  if (view.kind === "collection") return view.parentCategory?.slug ?? "";
  return view.slug;
}

/** 取某 store 视图的产品（含解析图 url）：按 kind 选 Category / Collection 查询。 */
export async function getStoreProducts(
  view: CategoryStoreView
): Promise<CategoryProduct[]> {
  if (view.kind === "collection") {
    const result = await getSanityClient().fetch<CategoryProduct[]>(
      buildCollectionStoreProductsQuery(),
      { collectionSlug: view.slug }
    );
    return result ?? [];
  }
  return getCategoryProducts(view.slug);
}

/**
 * store 视图面包屑：
 *  - Category：Home > {Category}（复用 buildCategoryBreadcrumbs）。
 *  - Collection：Home > {父 Category} > {Collection}（父项链到 /category/<父 slug>）；
 *    无父 Category 时降级为 Home > {Collection}。
 */
export function buildStoreBreadcrumbs(
  view: CategoryStoreView
): BreadcrumbItem[] {
  if (view.kind === "collection" && view.parentCategory) {
    return [
      { name: "Home", url: "/" },
      {
        name: view.parentCategory.title,
        url: `/category/${view.parentCategory.slug}`,
      },
      { name: view.title, url: `/category/${view.slug}` },
    ];
  }
  return buildCategoryBreadcrumbs(view);
}

/**
 * store 视图 SEO：
 *  - path 恒为 /category/<slug>。
 *  - canonical：招牌 Collection → /<slug>（营销落地页为主版本，见 ADR-0001 / AGENTS.md）；
 *    Category 与非招牌 Collection → 自身 /category/<slug>。
 *  - title/description 复用 buildCategorySeo 的回落逻辑。
 */
export function buildStoreSeo(view: CategoryStoreView): SeoInput {
  const base = buildCategorySeo(view);
  if (view.kind === "collection" && view.isSignature) {
    return { ...base, canonical: `/${view.slug}` };
  }
  return base;
}
