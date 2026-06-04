/**
 * 分类法种子数据 —— Category（3）+ Collection（9）的单一真实来源。
 *
 * 这是纯静态数据模块（无网络、无 Sanity 依赖），同时供：
 *   1. 种子脚本 `studio/scripts/seedTaxonomy.ts`（写入 production dataset）；
 *   2. 单元测试 `taxonomy-seed.test.ts`（断言形状/归属/数量正确）。
 *
 * 术语见 CONTEXT.md：Category（材质族，3）/ Collection（品牌系列，9）/
 * Signature Collection（招牌系列，4，有营销落地页）。
 *
 * ⚠️ legacy slug 故意保留 Wix 历史值，可能与展示名不符（见 ADR-0001）：
 *   - solid-flooring → 展示 Laminate
 *   - sustainable-flooring → 展示 Hybrid
 *   不要「顺手修正」。改动需走 Phase 2 + 301 + GSC 评估。
 *
 * _id 采用确定性命名（category.* / collection.*），配合 createOrReplace
 * 保证种子可重复执行（idempotent）。
 */

/** Category 文档键（用于关联 Collection.category 引用）。 */
export type CategoryKey = "engineered" | "laminate" | "hybrid";

/** 种子用 Category（顶层材质族）。 */
export interface SeedCategory {
  /** 确定性 _id，如 "category.engineered"。 */
  _id: string;
  /** 关联键，Collection 通过它指向所属 Category。 */
  key: CategoryKey;
  /** 展示名，如 "Laminate Flooring"。 */
  title: string;
  /** URL slug（沿用 Wix 历史值，见 ADR-0001）。 */
  slug: string;
  /** 旧 Wix 路径，平迁保留链接 / 生成 redirect 用。 */
  legacyPath: string;
  /** 导航 / 列表排序，越小越前。 */
  sortOrder: number;
}

/** 种子用 Collection（品牌系列）。 */
export interface SeedCollection {
  /** 确定性 _id，如 "collection.bushland"。 */
  _id: string;
  /** 展示名，如 "Bushland"。 */
  title: string;
  /** URL slug（沿用 Wix 历史值，见 ADR-0001）。 */
  slug: string;
  /** 所属 Category 的关联键。 */
  categoryKey: CategoryKey;
  /** 是否为招牌系列（有独立营销落地页 /<slug>）。 */
  isSignature: boolean;
  /** store 视图路径 /category/<slug>（招牌系列另有 /<slug>，由 slug 推导）。 */
  legacyPath: string;
  /** 侧栏 / 列表排序，越小越前。 */
  sortOrder: number;
}

/**
 * 三个 Category。slug 故意保留 Wix 历史值——其中两个与展示名不符（ADR-0001）：
 * solid-flooring=Laminate、sustainable-flooring=Hybrid。
 */
export const SEED_CATEGORIES: readonly SeedCategory[] = [
  {
    _id: "category.engineered",
    key: "engineered",
    title: "Engineered Flooring",
    slug: "engineered-flooring",
    legacyPath: "/category/engineered-flooring",
    sortOrder: 1,
  },
  {
    _id: "category.laminate",
    key: "laminate",
    title: "Laminate Flooring",
    // ⚠️ slug 与展示名不符——故意保留（ADR-0001）
    slug: "solid-flooring",
    legacyPath: "/category/solid-flooring",
    sortOrder: 2,
  },
  {
    _id: "category.hybrid",
    key: "hybrid",
    title: "Hybrid Flooring",
    // ⚠️ slug 与展示名不符——故意保留（ADR-0001）
    slug: "sustainable-flooring",
    legacyPath: "/category/sustainable-flooring",
    sortOrder: 3,
  },
] as const;

/**
 * 九个 Collection。isSignature=true 仅 Engineered 下的四个招牌系列
 * （PureGrain / Bushland / Manor / Bellavale）。
 * legacyPath 统一为 /category/<slug>；招牌系列另有营销落地页 /<slug>（由 slug 推导）。
 */
export const SEED_COLLECTIONS: readonly SeedCollection[] = [
  // Engineered —— 4 个招牌系列
  {
    _id: "collection.puregrain",
    title: "PureGrain",
    slug: "puregrain",
    categoryKey: "engineered",
    isSignature: true,
    legacyPath: "/category/puregrain",
    sortOrder: 1,
  },
  {
    _id: "collection.bushland",
    title: "Bushland",
    slug: "bushland",
    categoryKey: "engineered",
    isSignature: true,
    legacyPath: "/category/bushland",
    sortOrder: 2,
  },
  {
    _id: "collection.manor",
    title: "Manor",
    slug: "manor",
    categoryKey: "engineered",
    isSignature: true,
    legacyPath: "/category/manor",
    sortOrder: 3,
  },
  {
    _id: "collection.bellavale",
    title: "Bellavale",
    slug: "bellavale",
    categoryKey: "engineered",
    isSignature: true,
    legacyPath: "/category/bellavale",
    sortOrder: 4,
  },
  // Laminate
  {
    _id: "collection.aquaglow-72hr",
    title: "AquaGlow 72hr",
    slug: "aquaglow-72hr",
    categoryKey: "laminate",
    isSignature: false,
    legacyPath: "/category/aquaglow-72hr",
    sortOrder: 5,
  },
  {
    _id: "collection.mtf-24hr",
    title: "MTF 24hr Water Resistant",
    slug: "mtf-24hr-water-resistant",
    categoryKey: "laminate",
    isSignature: false,
    legacyPath: "/category/mtf-24hr-water-resistant",
    sortOrder: 6,
  },
  {
    _id: "collection.hydrocore",
    title: "HydroCore",
    slug: "hydrocore",
    categoryKey: "laminate",
    isSignature: false,
    legacyPath: "/category/hydrocore",
    sortOrder: 7,
  },
  // Hybrid
  {
    _id: "collection.duro-plus",
    title: "Duro Plus",
    slug: "duro-plus",
    categoryKey: "hybrid",
    isSignature: false,
    legacyPath: "/category/duro-plus",
    sortOrder: 8,
  },
  {
    _id: "collection.guardian",
    title: "Guardian",
    slug: "guardian",
    categoryKey: "hybrid",
    isSignature: false,
    legacyPath: "/category/guardian",
    sortOrder: 9,
  },
] as const;

/** Sanity 文档形状：productCategory（种子写入用）。 */
export interface ProductCategoryDoc {
  _id: string;
  _type: "productCategory";
  title: string;
  slug: { _type: "slug"; current: string };
  legacyPath: string;
  sortOrder: number;
}

/** Sanity 文档形状：productCollection（种子写入用）。 */
export interface ProductCollectionDoc {
  _id: string;
  _type: "productCollection";
  title: string;
  slug: { _type: "slug"; current: string };
  category: { _type: "reference"; _ref: string };
  isSignature: boolean;
  legacyPath: string;
  sortOrder: number;
}

/** 由 CategoryKey 推导确定性 Category _id。 */
export function categoryIdForKey(key: CategoryKey): string {
  return `category.${key}`;
}

/** 把种子 Category 映射为可写入 Sanity 的 productCategory 文档。 */
export function toCategoryDoc(seed: SeedCategory): ProductCategoryDoc {
  return {
    _id: seed._id,
    _type: "productCategory",
    title: seed.title,
    slug: { _type: "slug", current: seed.slug },
    legacyPath: seed.legacyPath,
    sortOrder: seed.sortOrder,
  };
}

/**
 * 把种子 Collection 映射为可写入 Sanity 的 productCollection 文档。
 * category 引用通过 categoryKey 推导出确定性 _ref。
 */
export function toCollectionDoc(seed: SeedCollection): ProductCollectionDoc {
  return {
    _id: seed._id,
    _type: "productCollection",
    title: seed.title,
    slug: { _type: "slug", current: seed.slug },
    category: {
      _type: "reference",
      _ref: categoryIdForKey(seed.categoryKey),
    },
    isSignature: seed.isSignature,
    legacyPath: seed.legacyPath,
    sortOrder: seed.sortOrder,
  };
}

/** 全部种子文档（Category 在前，Collection 在后，便于引用先建）。 */
export function buildSeedDocuments(): Array<
  ProductCategoryDoc | ProductCollectionDoc
> {
  return [
    ...SEED_CATEGORIES.map(toCategoryDoc),
    ...SEED_COLLECTIONS.map(toCollectionDoc),
  ];
}
