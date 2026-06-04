import { describe, it, expect } from "vitest";
import {
  SEED_CATEGORIES,
  SEED_COLLECTIONS,
  type CategoryKey,
  categoryIdForKey,
  toCategoryDoc,
  toCollectionDoc,
  buildSeedDocuments,
} from "@/lib/taxonomy-seed";

const CATEGORY_KEYS: readonly CategoryKey[] = ["engineered", "laminate", "hybrid"];

describe("SEED_CATEGORIES — 三个材质族 Category", () => {
  it("恰好 3 个", () => {
    expect(SEED_CATEGORIES).toHaveLength(3);
  });

  it("_id 确定性、唯一，且为 category.<key>", () => {
    const ids = SEED_CATEGORIES.map((c) => c._id);
    expect(new Set(ids).size).toBe(3);
    for (const c of SEED_CATEGORIES) {
      expect(c._id).toBe(`category.${c.key}`);
    }
  });

  it("key 覆盖 engineered / laminate / hybrid（各一次）", () => {
    expect(SEED_CATEGORIES.map((c) => c.key).sort()).toEqual(
      [...CATEGORY_KEYS].sort(),
    );
  });

  it("展示名与 slug 精确匹配 ADR-0001 的故意误导映射", () => {
    const bySlug = Object.fromEntries(
      SEED_CATEGORIES.map((c) => [c.slug, c.title]),
    );
    // 名实相符
    expect(bySlug["engineered-flooring"]).toBe("Engineered Flooring");
    // ⚠️ slug 故意与展示名不符（见 ADR-0001）——锁死，防止「顺手修正」
    expect(bySlug["solid-flooring"]).toBe("Laminate Flooring");
    expect(bySlug["sustainable-flooring"]).toBe("Hybrid Flooring");
  });

  it("legacyPath 为 /category/<slug>", () => {
    for (const c of SEED_CATEGORIES) {
      expect(c.legacyPath).toBe(`/category/${c.slug}`);
    }
  });

  it("slug 唯一且为非空小写串", () => {
    const slugs = SEED_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(3);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("sortOrder 为 1/2/3（Engineered → Laminate → Hybrid）", () => {
    const byKey = Object.fromEntries(
      SEED_CATEGORIES.map((c) => [c.key, c.sortOrder]),
    );
    expect(byKey.engineered).toBe(1);
    expect(byKey.laminate).toBe(2);
    expect(byKey.hybrid).toBe(3);
  });
});

describe("SEED_COLLECTIONS — 九个品牌系列 Collection", () => {
  it("恰好 9 个", () => {
    expect(SEED_COLLECTIONS).toHaveLength(9);
  });

  it("_id 确定性、唯一，且为 collection.<...>", () => {
    const ids = SEED_COLLECTIONS.map((c) => c._id);
    expect(new Set(ids).size).toBe(9);
    for (const id of ids) {
      expect(id).toMatch(/^collection\./);
    }
  });

  it("每个 Collection 的 categoryKey ∈ 三个 Category", () => {
    for (const c of SEED_COLLECTIONS) {
      expect(CATEGORY_KEYS).toContain(c.categoryKey);
    }
  });

  it("恰好 4 个招牌系列（isSignature=true），全部属于 Engineered", () => {
    const signatures = SEED_COLLECTIONS.filter((c) => c.isSignature);
    expect(signatures).toHaveLength(4);
    for (const s of signatures) {
      expect(s.categoryKey).toBe("engineered");
    }
    expect(signatures.map((s) => s.slug).sort()).toEqual(
      ["bellavale", "bushland", "manor", "puregrain"].sort(),
    );
  });

  it("Engineered 下恰好这 4 个、且全部是招牌系列", () => {
    const engineered = SEED_COLLECTIONS.filter(
      (c) => c.categoryKey === "engineered",
    );
    expect(engineered).toHaveLength(4);
    expect(engineered.every((c) => c.isSignature)).toBe(true);
  });

  it("Laminate / Hybrid 下的系列都不是招牌系列", () => {
    const nonEngineered = SEED_COLLECTIONS.filter(
      (c) => c.categoryKey !== "engineered",
    );
    expect(nonEngineered.every((c) => c.isSignature === false)).toBe(true);
  });

  it("title / slug / categoryKey 与需求表逐行精确匹配", () => {
    const table: Record<
      string,
      { title: string; slug: string; categoryKey: CategoryKey; isSignature: boolean }
    > = {
      "collection.puregrain": {
        title: "PureGrain",
        slug: "puregrain",
        categoryKey: "engineered",
        isSignature: true,
      },
      "collection.bushland": {
        title: "Bushland",
        slug: "bushland",
        categoryKey: "engineered",
        isSignature: true,
      },
      "collection.manor": {
        title: "Manor",
        slug: "manor",
        categoryKey: "engineered",
        isSignature: true,
      },
      "collection.bellavale": {
        title: "Bellavale",
        slug: "bellavale",
        categoryKey: "engineered",
        isSignature: true,
      },
      "collection.aquaglow-72hr": {
        title: "AquaGlow 72hr",
        slug: "aquaglow-72hr",
        categoryKey: "laminate",
        isSignature: false,
      },
      "collection.mtf-24hr": {
        title: "MTF 24hr Water Resistant",
        slug: "mtf-24hr-water-resistant",
        categoryKey: "laminate",
        isSignature: false,
      },
      "collection.hydrocore": {
        title: "HydroCore",
        slug: "hydrocore",
        categoryKey: "laminate",
        isSignature: false,
      },
      "collection.duro-plus": {
        title: "Duro Plus",
        slug: "duro-plus",
        categoryKey: "hybrid",
        isSignature: false,
      },
      "collection.guardian": {
        title: "Guardian",
        slug: "guardian",
        categoryKey: "hybrid",
        isSignature: false,
      },
    };

    expect(Object.keys(table)).toHaveLength(9);
    const byId = Object.fromEntries(SEED_COLLECTIONS.map((c) => [c._id, c]));
    for (const [id, expected] of Object.entries(table)) {
      const actual = byId[id];
      expect(actual, `缺少种子 Collection ${id}`).toBeDefined();
      expect(actual.title).toBe(expected.title);
      expect(actual.slug).toBe(expected.slug);
      expect(actual.categoryKey).toBe(expected.categoryKey);
      expect(actual.isSignature).toBe(expected.isSignature);
    }
  });

  it("slug 全局唯一、非空小写串", () => {
    const slugs = SEED_COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(9);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("legacyPath 为 /category/<slug>", () => {
    for (const c of SEED_COLLECTIONS) {
      expect(c.legacyPath).toBe(`/category/${c.slug}`);
    }
  });

  it("sortOrder 在所有 Collection 间唯一", () => {
    const orders = SEED_COLLECTIONS.map((c) => c.sortOrder);
    expect(new Set(orders).size).toBe(9);
  });
});

describe("映射到 Sanity 文档形状", () => {
  it("categoryIdForKey 推导确定性 _id", () => {
    expect(categoryIdForKey("engineered")).toBe("category.engineered");
    expect(categoryIdForKey("laminate")).toBe("category.laminate");
    expect(categoryIdForKey("hybrid")).toBe("category.hybrid");
  });

  it("toCategoryDoc 产出 productCategory，slug 包成 {_type:'slug'}", () => {
    const doc = toCategoryDoc(SEED_CATEGORIES[1]); // Laminate
    expect(doc._type).toBe("productCategory");
    expect(doc._id).toBe("category.laminate");
    expect(doc.title).toBe("Laminate Flooring");
    expect(doc.slug).toEqual({ _type: "slug", current: "solid-flooring" });
    expect(doc.legacyPath).toBe("/category/solid-flooring");
  });

  it("toCollectionDoc 产出 productCollection，category 为指向所属 Category 的 reference", () => {
    const bushland = SEED_COLLECTIONS.find((c) => c._id === "collection.bushland")!;
    const doc = toCollectionDoc(bushland);
    expect(doc._type).toBe("productCollection");
    expect(doc.slug).toEqual({ _type: "slug", current: "bushland" });
    expect(doc.isSignature).toBe(true);
    expect(doc.category).toEqual({
      _type: "reference",
      _ref: "category.engineered",
    });
  });

  it("每个 Collection 文档的 category._ref 都指向一个真实存在的 Category _id", () => {
    const categoryIds = new Set(SEED_CATEGORIES.map((c) => c._id));
    for (const seed of SEED_COLLECTIONS) {
      const doc = toCollectionDoc(seed);
      expect(categoryIds.has(doc.category._ref)).toBe(true);
    }
  });
});

describe("buildSeedDocuments — 全量种子文档", () => {
  const docs = buildSeedDocuments();

  it("共 12 个文档（3 Category + 9 Collection）", () => {
    expect(docs).toHaveLength(12);
    expect(docs.filter((d) => d._type === "productCategory")).toHaveLength(3);
    expect(docs.filter((d) => d._type === "productCollection")).toHaveLength(9);
  });

  it("Category 排在 Collection 之前（引用先建）", () => {
    const firstCollectionIdx = docs.findIndex(
      (d) => d._type === "productCollection",
    );
    const lastCategoryIdx =
      docs.length -
      1 -
      [...docs].reverse().findIndex((d) => d._type === "productCategory");
    expect(lastCategoryIdx).toBeLessThan(firstCollectionIdx);
  });

  it("所有 _id 全局唯一（确定性 + 可重复执行的前提）", () => {
    const ids = docs.map((d) => d._id);
    expect(new Set(ids).size).toBe(docs.length);
  });
});
