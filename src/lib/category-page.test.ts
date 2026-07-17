import { describe, it, expect } from "vitest";
import {
  CATEGORY_LANDINGS_QUERY,
  COLLECTION_STORES_QUERY,
  buildCategoryProductsQuery,
  buildCollectionStoreProductsQuery,
  normaliseCategoryLanding,
  normaliseCollectionStoreView,
  toStaticPaths,
  toStorePaths,
  getStoreSidebarCategorySlug,
  buildCategoryBreadcrumbs,
  buildCategorySeo,
  buildStoreBreadcrumbs,
  buildStoreSeo,
  type CategoryLanding,
  type CategoryStoreView,
} from "@/lib/category-page";

/**
 * 只测纯逻辑（不触网）：GROQ 构造、归一化、getStaticPaths 映射、面包屑、SEO。
 * 真实 Sanity 数据由 build 时拉取（本地匿名读返回空 → 0 页，属预期，见 ADR-0003）。
 * 误导 slug（solid-flooring=Laminate、sustainable-flooring=Hybrid）作为夹具断言保留。
 */

/** 夹具：内容齐全的 Engineered 分类（名实相符）。 */
const engineered: CategoryLanding = {
  _id: "category.engineered",
  title: "Engineered Flooring",
  slug: "engineered-flooring",
  description: "Premium engineered timber.\n\nReal oak veneer.",
  heroImage: { url: "https://cdn.sanity.io/e.jpg", alt: "Engineered floor" },
  seoTitle: "Engineered Timber Flooring Melbourne",
  seoDescription: "Engineered flooring meta.",
};

/** 夹具：误导 slug 的 Laminate 分类（slug=solid-flooring，内容全空）。 */
const laminate: CategoryLanding = {
  _id: "category.laminate",
  title: "Laminate Flooring",
  slug: "solid-flooring",
  description: null,
  heroImage: null,
  seoTitle: null,
  seoDescription: null,
};

describe("CATEGORY_LANDINGS_QUERY —— 取全部 Category 并投影富字段", () => {
  it("过滤 productCategory、按 sortOrder 升序、解平 slug", () => {
    expect(CATEGORY_LANDINGS_QUERY).toContain('_type == "productCategory"');
    expect(CATEGORY_LANDINGS_QUERY).toContain("order(sortOrder asc)");
    expect(CATEGORY_LANDINGS_QUERY).toContain('"slug": slug.current');
  });

  it("投影 description / heroImage 资产 url / seo 子字段", () => {
    expect(CATEGORY_LANDINGS_QUERY).toContain("description");
    expect(CATEGORY_LANDINGS_QUERY).toContain('"url": asset->url');
    expect(CATEGORY_LANDINGS_QUERY).toContain('"seoTitle": seo.metaTitle');
    expect(CATEGORY_LANDINGS_QUERY).toContain(
      '"seoDescription": seo.metaDescription'
    );
  });
});

describe("buildCategoryProductsQuery —— 按 Category 取已发布产品（含解析图 url）", () => {
  it("过滤已发布产品、按 Category slug、解出 mainImage url", () => {
    const q = buildCategoryProductsQuery();
    expect(q).toContain('_type == "product"');
    expect(q).toContain('status == "published"');
    expect(q).toContain("defined(slug.current)");
    expect(q).toContain("category->slug.current == $categorySlug");
    expect(q).toContain('"imageUrl": mainImage.asset->url');
    expect(q).toContain("order(title asc)");
  });

  it("用 $categorySlug 参数（防注入），不把具体值拼进字符串", () => {
    const q = buildCategoryProductsQuery();
    expect(q).not.toMatch(/category->slug\.current == "[^$]/);
  });

  it("归属判定为主分类 ∪ extraCategories（Wix 多分类归属，#59-#22）", () => {
    const q = buildCategoryProductsQuery();
    expect(q).toContain("$categorySlug in extraCategories[]->slug.current");
    // 两个条件是「或」关系，包在同一组括号里
    expect(q).toMatch(
      /\(category->slug\.current == \$categorySlug \|\| \$categorySlug in extraCategories\[\]->slug\.current\)/
    );
  });
});

describe("normaliseCategoryLanding —— 缺字段收敛为 null，绝不编造内容", () => {
  it("缺 description / heroImage / seo 时全部为 null", () => {
    const result = normaliseCategoryLanding({
      _id: "category.laminate",
      title: "Laminate Flooring",
      slug: "solid-flooring",
    });
    expect(result.description).toBeNull();
    expect(result.heroImage).toBeNull();
    expect(result.seoTitle).toBeNull();
    expect(result.seoDescription).toBeNull();
  });

  it("空字符串与全空白字段一律归一化为 null", () => {
    const result = normaliseCategoryLanding({
      _id: "x",
      title: "X",
      slug: "x",
      description: "   ",
      seoTitle: "",
      seoDescription: "\n\t",
    });
    expect(result.description).toBeNull();
    expect(result.seoTitle).toBeNull();
    expect(result.seoDescription).toBeNull();
  });

  it("heroImage 缺 url（资产未解出）时整体为 null", () => {
    const result = normaliseCategoryLanding({
      _id: "x",
      title: "X",
      slug: "x",
      heroImage: { url: null, alt: "ignored" },
    });
    expect(result.heroImage).toBeNull();
  });

  it("heroImage 有 url、无 alt 时保留 url，alt 为 null", () => {
    const result = normaliseCategoryLanding({
      _id: "x",
      title: "X",
      slug: "x",
      heroImage: { url: "https://cdn/x.jpg" },
    });
    expect(result.heroImage).toEqual({ url: "https://cdn/x.jpg", alt: null });
  });

  it("内容齐全时原样保留并 trim", () => {
    const result = normaliseCategoryLanding({
      _id: "category.engineered",
      title: "Engineered Flooring",
      slug: "engineered-flooring",
      description: "  Real oak veneer.  ",
      heroImage: { url: "https://cdn/e.jpg", alt: "floor" },
      seoTitle: "Engineered",
      seoDescription: "meta",
    });
    expect(result.description).toBe("Real oak veneer.");
    expect(result.heroImage).toEqual({
      url: "https://cdn/e.jpg",
      alt: "floor",
    });
    expect(result.seoTitle).toBe("Engineered");
  });
});

describe("toStaticPaths —— 三个 Category（含误导 slug）全映射", () => {
  it("每个分类 → { params.slug, props.category }", () => {
    const paths = toStaticPaths([engineered, laminate]);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toEqual({
      params: { slug: "engineered-flooring" },
      props: { category: engineered },
    });
  });

  it("保留误导 slug（ADR-0001）：Laminate 的 slug 仍是 solid-flooring", () => {
    const paths = toStaticPaths([laminate]);
    expect(paths[0].params.slug).toBe("solid-flooring");
    expect(paths[0].props.category.title).toBe("Laminate Flooring");
  });

  it("过滤掉缺 slug 的脏数据（不生成无效路由）", () => {
    const paths = toStaticPaths([engineered, { ...laminate, slug: "" }]);
    expect(paths).toHaveLength(1);
    expect(paths[0].params.slug).toBe("engineered-flooring");
  });

  it("空输入 → 空数组（dataset 匿名读为空时 build 不报错）", () => {
    expect(toStaticPaths([])).toEqual([]);
  });
});

describe("buildCategoryBreadcrumbs —— Home > {Category}", () => {
  it("两项，末项指向自身 /category/<slug>", () => {
    const crumbs = buildCategoryBreadcrumbs(engineered);
    expect(crumbs).toEqual([
      { name: "Home", url: "/" },
      { name: "Engineered Flooring", url: "/category/engineered-flooring" },
    ]);
  });

  it("误导 slug 分类面包屑用展示名、误导 slug 的路径", () => {
    const crumbs = buildCategoryBreadcrumbs(laminate);
    expect(crumbs[1]).toEqual({
      name: "Laminate Flooring",
      url: "/category/solid-flooring",
    });
  });
});

describe("buildCategorySeo —— canonical 指向自身 /category/<slug>", () => {
  it("canonical 与 path 均为 /category/<slug>", () => {
    const seo = buildCategorySeo(engineered);
    expect(seo.path).toBe("/category/engineered-flooring");
    expect(seo.canonical).toBe("/category/engineered-flooring");
  });

  it("优先用编辑填的 seoTitle / seoDescription", () => {
    const seo = buildCategorySeo(engineered);
    expect(seo.title).toBe("Engineered Timber Flooring Melbourne");
    expect(seo.description).toBe("Engineered flooring meta.");
  });

  it("无 seo 字段时回落到 title 与一句符合事实的描述（不编造营销长文）", () => {
    const seo = buildCategorySeo(laminate);
    expect(seo.title).toBe("Laminate Flooring");
    expect(seo.description).toContain("Laminate Flooring");
    expect(seo.description).toContain("Maywood Flooring");
  });

  it("有 description、无 seoDescription 时用 description 作 meta", () => {
    const seo = buildCategorySeo({
      ...laminate,
      description: "A hard-wearing laminate range.",
    });
    expect(seo.description).toBe("A hard-wearing laminate range.");
  });

  it("忽略过短的占位 seoDescription，改用完整分类描述", () => {
    const seo = buildCategorySeo({
      ...laminate,
      description: "Water-resistant laminate flooring for Melbourne homes.",
      seoDescription: "Maywood",
    });
    expect(seo.description).toBe(
      "Water-resistant laminate flooring for Melbourne homes."
    );
  });

  it("seoDescription 与 description 都是过短占位时，改用完整回落文案", () => {
    const seo = buildCategorySeo({
      ...laminate,
      description: "Maywood",
      seoDescription: "Maywood",
    });
    expect(seo.description).not.toBe("Maywood");
    expect(seo.description).toContain("Laminate Flooring");
    expect(seo.description).toContain("Maywood Flooring");
  });
});

/* ─────────────── Collection store 视图（/category/<collection>） ─────────────── */

/** 夹具：招牌 Collection（有 /<slug> 营销落地页 → canonical 反指那里）。 */
const puregrain: CategoryStoreView = {
  _id: "collection.puregrain",
  title: "Puregrain",
  slug: "puregrain",
  description: "The purest expression of timber.",
  heroImage: { url: "https://cdn.sanity.io/p.jpg", alt: "Puregrain floor" },
  seoTitle: null,
  seoDescription: null,
  kind: "collection",
  parentCategory: { title: "Engineered Flooring", slug: "engineered-flooring" },
  isSignature: true,
};

/** 夹具：非招牌 Collection（无营销落地页 → canonical 指自身 store 视图）。 */
const guardian: CategoryStoreView = {
  _id: "collection.guardian",
  title: "Guardian",
  slug: "guardian",
  description: null,
  heroImage: null,
  seoTitle: null,
  seoDescription: null,
  kind: "collection",
  parentCategory: {
    title: "Hybrid Flooring",
    slug: "sustainable-flooring",
  },
  isSignature: false,
};

/** 夹具：Category 包成 store 视图（kind="category"，无父、非招牌）。 */
const engineeredStore: CategoryStoreView = {
  ...engineered,
  kind: "category",
  parentCategory: null,
  isSignature: false,
};

describe("COLLECTION_STORES_QUERY —— 取全部 Collection 并投影 store 富字段", () => {
  it("过滤 productCollection、按 sortOrder 升序、解平 slug", () => {
    expect(COLLECTION_STORES_QUERY).toContain('_type == "productCollection"');
    expect(COLLECTION_STORES_QUERY).toContain("order(sortOrder asc)");
    expect(COLLECTION_STORES_QUERY).toContain('"slug": slug.current');
  });

  it("投影 isSignature 与解引用的父 Category 摘要（canonical/面包屑/侧栏所需）", () => {
    expect(COLLECTION_STORES_QUERY).toContain("isSignature");
    expect(COLLECTION_STORES_QUERY).toContain(
      '"parentCategory": category->{ title, "slug": slug.current }'
    );
  });
});

describe("buildCollectionStoreProductsQuery —— 按 Collection 取已发布产品", () => {
  it("按单一 collection 引用过滤（无 extraCollections 并集）、解出 mainImage url", () => {
    const q = buildCollectionStoreProductsQuery();
    expect(q).toContain('_type == "product"');
    expect(q).toContain('status == "published"');
    expect(q).toContain("collection->slug.current == $collectionSlug");
    expect(q).not.toContain("extraCollections");
    expect(q).toContain('"imageUrl": mainImage.asset->url');
    expect(q).toContain("order(title asc)");
  });

  it("用 $collectionSlug 参数（防注入），不把具体值拼进字符串", () => {
    const q = buildCollectionStoreProductsQuery();
    expect(q).not.toMatch(/collection->slug\.current == "[^$]/);
  });
});

describe("normaliseCollectionStoreView —— kind/父分类/招牌位归一化", () => {
  it("标记 kind=collection、保留 isSignature、解出父 Category 摘要", () => {
    const v = normaliseCollectionStoreView({
      _id: "collection.puregrain",
      title: "Puregrain",
      slug: "puregrain",
      isSignature: true,
      parentCategory: {
        title: "Engineered Flooring",
        slug: "engineered-flooring",
      },
    });
    expect(v.kind).toBe("collection");
    expect(v.isSignature).toBe(true);
    expect(v.parentCategory).toEqual({
      title: "Engineered Flooring",
      slug: "engineered-flooring",
    });
  });

  it("缺 isSignature → false；缺/不完整父 Category → null", () => {
    const v = normaliseCollectionStoreView({
      _id: "x",
      title: "X",
      slug: "x",
      parentCategory: { title: "Only title, no slug" },
    });
    expect(v.isSignature).toBe(false);
    expect(v.parentCategory).toBeNull();
  });

  it("复用 normaliseCategoryLanding：缺内容字段收敛为 null", () => {
    const v = normaliseCollectionStoreView({ _id: "x", title: "X", slug: "x" });
    expect(v.description).toBeNull();
    expect(v.heroImage).toBeNull();
    expect(v.seoTitle).toBeNull();
  });
});

describe("toStorePaths —— Category + Collection 统一映射为 { params, props.view }", () => {
  it("每个 store 视图 → { params.slug, props.view }", () => {
    const paths = toStorePaths([engineeredStore, puregrain]);
    expect(paths).toHaveLength(2);
    expect(paths[1]).toEqual({
      params: { slug: "puregrain" },
      props: { view: puregrain },
    });
  });

  it("过滤掉缺 slug 的脏数据", () => {
    const paths = toStorePaths([puregrain, { ...guardian, slug: "" }]);
    expect(paths).toHaveLength(1);
    expect(paths[0].params.slug).toBe("puregrain");
  });
});

describe("getStoreSidebarCategorySlug —— 侧栏 Browse by 的归属 Category", () => {
  it("Category kind 用自身 slug", () => {
    expect(getStoreSidebarCategorySlug(engineeredStore)).toBe(
      "engineered-flooring"
    );
  });

  it("Collection kind 用父 Category slug（列兄弟系列）", () => {
    expect(getStoreSidebarCategorySlug(puregrain)).toBe("engineered-flooring");
    expect(getStoreSidebarCategorySlug(guardian)).toBe("sustainable-flooring");
  });

  it("Collection 无父 Category → 空串（侧栏不渲染）", () => {
    expect(
      getStoreSidebarCategorySlug({ ...puregrain, parentCategory: null })
    ).toBe("");
  });
});

describe("buildStoreBreadcrumbs —— Category 二级 / Collection 三级", () => {
  it("Category：Home > {Category}（同 buildCategoryBreadcrumbs）", () => {
    expect(buildStoreBreadcrumbs(engineeredStore)).toEqual(
      buildCategoryBreadcrumbs(engineered)
    );
  });

  it("Collection：Home > {父 Category} > {Collection}，父项链到 /category/<父 slug>", () => {
    expect(buildStoreBreadcrumbs(puregrain)).toEqual([
      { name: "Home", url: "/" },
      { name: "Engineered Flooring", url: "/category/engineered-flooring" },
      { name: "Puregrain", url: "/category/puregrain" },
    ]);
  });

  it("Collection 无父 Category → 降级为 Home > {Collection}", () => {
    const crumbs = buildStoreBreadcrumbs({
      ...puregrain,
      parentCategory: null,
    });
    expect(crumbs).toEqual([
      { name: "Home", url: "/" },
      { name: "Puregrain", url: "/category/puregrain" },
    ]);
  });
});

describe("buildStoreSeo —— 招牌 Collection canonical 反指 /<slug> 落地页", () => {
  it("path 恒为 /category/<slug>", () => {
    expect(buildStoreSeo(puregrain).path).toBe("/category/puregrain");
    expect(buildStoreSeo(guardian).path).toBe("/category/guardian");
  });

  it("招牌 Collection：canonical 指向营销落地页 /<slug>（近重复，见 ADR-0001）", () => {
    expect(buildStoreSeo(puregrain).canonical).toBe("/puregrain");
  });

  it("非招牌 Collection：无落地页 → canonical 指自身 /category/<slug>", () => {
    expect(buildStoreSeo(guardian).canonical).toBe("/category/guardian");
  });

  it("Category：canonical 指自身（同 buildCategorySeo）", () => {
    expect(buildStoreSeo(engineeredStore).canonical).toBe(
      buildCategorySeo(engineered).canonical
    );
  });

  it("Collection store 使用与营销落地页不同的 title / description", () => {
    const seo = buildStoreSeo(puregrain);
    expect(seo.title).toContain("Flooring Products");
    expect(seo.description).toContain("Browse Puregrain flooring products");
  });
});
