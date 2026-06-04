/**
 * 分类法查询层 —— 页面在 build 时从 Sanity 拉取 Category / Collection。
 *
 * GROQ 查询字符串拆成纯函数/常量（可单测，不触网）；带 `get*` 前缀的函数
 * 才真正用 `getSanityClient()` 发请求。页面只消费 `get*` 函数，不要在页面里
 * 硬编码分类法（硬编码只允许出现在种子模块 taxonomy-seed.ts）。
 *
 * 术语见 CONTEXT.md；URL 策略见 ADR-0001。
 */
import { getSanityClient } from "@/lib/sanity";

/** 前端消费的 Category 形状（GROQ 投影结果）。 */
export interface Category {
  _id: string;
  title: string;
  slug: string;
  legacyPath: string | null;
  sortOrder: number | null;
}

/** 前端消费的 Collection 形状（GROQ 投影结果，含归属 Category 摘要）。 */
export interface Collection {
  _id: string;
  title: string;
  slug: string;
  legacyPath: string | null;
  isSignature: boolean;
  sortOrder: number | null;
  /** 归属 Category 的摘要（解引用），无引用时为 null。 */
  category: { _id: string; title: string; slug: string } | null;
}

/** Category 投影字段（slug 解平为字符串）。 */
const CATEGORY_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  legacyPath,
  sortOrder
}`;

/** Collection 投影字段（解引用 category 为摘要）。 */
const COLLECTION_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  legacyPath,
  isSignature,
  sortOrder,
  "category": category->{ _id, title, "slug": slug.current }
}`;

/** 全部 Category，按 sortOrder 升序。 */
export const CATEGORIES_QUERY = `*[_type == "productCategory"] | order(sortOrder asc) ${CATEGORY_PROJECTION}`;

/** 全部 Collection，按 sortOrder 升序。 */
export const COLLECTIONS_QUERY = `*[_type == "productCollection"] | order(sortOrder asc) ${COLLECTION_PROJECTION}`;

/** 仅招牌系列（isSignature == true），按 sortOrder 升序。 */
export const SIGNATURE_COLLECTIONS_QUERY = `*[_type == "productCollection" && isSignature == true] | order(sortOrder asc) ${COLLECTION_PROJECTION}`;

/**
 * 构造「按 Category slug 取其下 Collection」的 GROQ。
 * 纯字符串构造，便于单测；参数 `$categorySlug` 由调用方以 params 传入，避免注入。
 */
export function buildCollectionsByCategoryQuery(): string {
  return `*[_type == "productCollection" && category->slug.current == $categorySlug] | order(sortOrder asc) ${COLLECTION_PROJECTION}`;
}

/** 取全部 Category（build 时调用）。 */
export async function getCategories(): Promise<Category[]> {
  return getSanityClient().fetch<Category[]>(CATEGORIES_QUERY);
}

/** 取全部 Collection（build 时调用）。 */
export async function getCollections(): Promise<Collection[]> {
  return getSanityClient().fetch<Collection[]>(COLLECTIONS_QUERY);
}

/** 取全部招牌系列（首页 / 主导航重点推广用）。 */
export async function getSignatureCollections(): Promise<Collection[]> {
  return getSanityClient().fetch<Collection[]>(SIGNATURE_COLLECTIONS_QUERY);
}

/** 取某 Category（按 slug）下的全部 Collection。 */
export async function getCollectionsByCategory(
  categorySlug: string
): Promise<Collection[]> {
  return getSanityClient().fetch<Collection[]>(
    buildCollectionsByCategoryQuery(),
    { categorySlug }
  );
}
