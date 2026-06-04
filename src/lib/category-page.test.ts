import { describe, it, expect } from "vitest";
import {
  CATEGORY_LANDINGS_QUERY,
  buildCategoryProductsQuery,
  normaliseCategoryLanding,
  toStaticPaths,
  buildCategoryBreadcrumbs,
  buildCategorySeo,
  type CategoryLanding,
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
});
