import { describe, it, expect } from "vitest";
import {
  PRODUCT_DETAIL_SLUGS_QUERY,
  PRODUCT_DETAIL_BY_SLUG_QUERY,
  buildProductSpecItems,
  normaliseProductDetail,
  buildProductBreadcrumbs,
  buildProductSeo,
  buildProductJsonLd,
  toProductDetailPaths,
  productPath,
  type ProductDetail,
} from "@/lib/product-detail";

/**
 * 纯逻辑层单测（不触网）。覆盖：GROQ 构造、规格表「省略空值」、投影归一化、
 * 面包屑、SEO 输入、Product JSON-LD 形状、getStaticPaths 映射。
 * 真实数据由 studio 端独立校验；产品 Phase 1 未灌入 → 用 mock 数据验证形状。
 */

/** 构造一条最小完整的产品详情 mock，测试按需覆盖字段。 */
function mockProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    _id: "p1",
    title: "Blackbutt",
    slug: "blackbutt",
    shortDescription: null,
    category: { title: "Engineered Flooring", slug: "engineered-flooring" },
    collection: { title: "Bushland", slug: "bushland" },
    images: [],
    type: null,
    dimensions: null,
    packSize: null,
    packWeight: null,
    finish: null,
    surfaceCoating: null,
    bevel: null,
    profile: null,
    grade: null,
    environmentalRate: null,
    seoTitle: null,
    seoDescription: null,
    relatedProducts: [],
    ...overrides,
  };
}

describe("GROQ 查询字符串", () => {
  it("PRODUCT_DETAIL_SLUGS_QUERY 仅取 published 且有 slug 的产品", () => {
    expect(PRODUCT_DETAIL_SLUGS_QUERY).toContain('_type == "product"');
    expect(PRODUCT_DETAIL_SLUGS_QUERY).toContain('status == "published"');
    expect(PRODUCT_DETAIL_SLUGS_QUERY).toContain("defined(slug.current)");
    expect(PRODUCT_DETAIL_SLUGS_QUERY).toContain('"slug": slug.current');
  });

  it("PRODUCT_DETAIL_BY_SLUG_QUERY 用 $slug 参数（防注入）并解引用 + 解图 url", () => {
    expect(PRODUCT_DETAIL_BY_SLUG_QUERY).toContain("slug.current == $slug");
    expect(PRODUCT_DETAIL_BY_SLUG_QUERY).toContain("[0]");
    // 解引用 Category / Collection / relatedProducts
    expect(PRODUCT_DETAIL_BY_SLUG_QUERY).toContain("category->");
    expect(PRODUCT_DETAIL_BY_SLUG_QUERY).toContain("collection->");
    expect(PRODUCT_DETAIL_BY_SLUG_QUERY).toContain("relatedProducts[]->");
    // 图片解成可渲染 url（图廊用），非 asset._ref
    expect(PRODUCT_DETAIL_BY_SLUG_QUERY).toContain("asset->url");
    // 不应把任何具体值插进字符串
    expect(PRODUCT_DETAIL_BY_SLUG_QUERY).not.toMatch(/slug\.current == "[^$]/);
  });

  it("PRODUCT_DETAIL_BY_SLUG_QUERY 含九个规格字段", () => {
    for (const f of [
      "type",
      "dimensions",
      "packSize",
      "packWeight",
      "finish",
      "bevel",
      "profile",
      "grade",
      "environmentalRate",
    ]) {
      expect(PRODUCT_DETAIL_BY_SLUG_QUERY).toContain(f);
    }
  });
});

describe("buildProductSpecItems —— 省略空值、保持 AGENTS 顺序", () => {
  it("只输出有值的规格行，并按 AGENTS.md 顺序", () => {
    const items = buildProductSpecItems(
      mockProduct({
        type: "Engineered Oak",
        dimensions: "1900 × 190 × 15mm",
        // packSize / packWeight 留空 → 不出现
        finish: "Matt UV Lacquer",
        grade: "Natural",
      })
    );
    expect(items.map((i) => i.label)).toEqual([
      "Type",
      "Dimension",
      "Finish",
      "Grade",
    ]);
    expect(items[0]).toEqual({ label: "Type", value: "Engineered Oak" });
  });

  it("全空时返回空数组（页面据此隐藏规格表）", () => {
    expect(buildProductSpecItems(mockProduct())).toEqual([]);
  });

  it("空白字符串视为空值（trim 后丢弃）", () => {
    const items = buildProductSpecItems(mockProduct({ finish: "   " }));
    expect(items).toEqual([]);
  });
});

describe("normaliseProductDetail —— 投影归一化", () => {
  it("主图 + gallery 合并为有序图集（主图在前），丢弃无 url 的图", () => {
    const product = normaliseProductDetail({
      _id: "p1",
      title: "Blackbutt",
      slug: "blackbutt",
      mainImage: { url: "https://cdn/main.jpg", alt: "Main" },
      gallery: [
        { url: "https://cdn/g1.jpg", alt: "G1" },
        { url: "", alt: "broken" }, // 无 url → 丢弃
        { url: "https://cdn/g2.jpg", alt: null },
      ],
    });
    expect(product.images.map((i) => i.url)).toEqual([
      "https://cdn/main.jpg",
      "https://cdn/g1.jpg",
      "https://cdn/g2.jpg",
    ]);
    expect(product.images[0].alt).toBe("Main");
  });

  it("无主图时图集仅含 gallery；全无图时为空数组", () => {
    const onlyGallery = normaliseProductDetail({
      title: "X",
      slug: "x",
      gallery: [{ url: "https://cdn/g.jpg", alt: "G" }],
    });
    expect(onlyGallery.images).toHaveLength(1);

    const noImages = normaliseProductDetail({ title: "Y", slug: "y" });
    expect(noImages.images).toEqual([]);
  });

  it("空字符串字段收敛为 null；relatedProducts 丢弃脏数据", () => {
    const product = normaliseProductDetail({
      title: "Z",
      slug: "z",
      shortDescription: "  ",
      type: "",
      relatedProducts: [
        { title: "Spotted Gum", slug: "spotted-gum" },
        { title: "", slug: "broken" }, // 丢弃
        { slug: "no-title" }, // 丢弃
      ],
    });
    expect(product.shortDescription).toBeNull();
    expect(product.type).toBeNull();
    expect(product.relatedProducts).toEqual([
      { title: "Spotted Gum", slug: "spotted-gum" },
    ]);
  });
});

describe("buildProductBreadcrumbs", () => {
  it("Home > All Products > {Product}，末项指向产品自身", () => {
    const crumbs = buildProductBreadcrumbs({
      title: "Blackbutt",
      slug: "blackbutt",
    });
    expect(crumbs).toEqual([
      { name: "Home", url: "/" },
      { name: "All Products", url: "/category/engineered-flooring" },
      { name: "Blackbutt", url: "/product-page/blackbutt" },
    ]);
  });
});

describe("buildProductSeo", () => {
  it("canonical 指向自身，type=product，回落描述包含产品上下文", () => {
    const seo = buildProductSeo(
      mockProduct({ shortDescription: "Warm Australian hardwood." })
    );
    expect(seo.path).toBe("/product-page/blackbutt");
    expect(seo.canonical).toBe("/product-page/blackbutt");
    expect(seo.type).toBe("product");
    expect(seo.description).toContain("Blackbutt");
    expect(seo.description).toContain("Bushland");
    expect(seo.description).toContain("Warm Australian hardwood.");
  });

  it("优先用编辑填的 seo 字段；无图无描述时给克制回落", () => {
    const withSeo = buildProductSeo(
      mockProduct({ seoTitle: "Custom Title", seoDescription: "Custom desc." })
    );
    expect(withSeo.title).toBe("Custom Title");
    expect(withSeo.description).toBe("Custom desc.");

    const fallback = buildProductSeo(mockProduct());
    expect(fallback.description).toContain("Engineered Flooring");
    expect(fallback.description).toContain("Maywood Flooring");
  });

  it("同名产品的回落 title / description 带 Collection 与 Type，避免 SEO 重复", () => {
    const seo = buildProductSeo(
      mockProduct({
        title: "Spotted Gum",
        collection: { title: "HydroCore", slug: "hydrocore" },
        type: "SPC Hybrid Flooring",
        shortDescription: "SPC Hybrid Flooring",
      })
    );
    expect(seo.title).toBe("Spotted Gum — HydroCore — SPC Hybrid Flooring");
    expect(seo.description).toContain("Spotted Gum");
    expect(seo.description).toContain("HydroCore");
    expect(seo.description).toContain("SPC Hybrid Flooring");
  });
});

describe("buildProductJsonLd", () => {
  it("输出 Product schema：绝对 url、brand、分类、图片数组", () => {
    const ld = buildProductJsonLd(
      mockProduct({
        shortDescription: "Warm hardwood.",
        images: [
          { url: "https://cdn/a.jpg", alt: "a" },
          { url: "https://cdn/b.jpg", alt: "b" },
        ],
      })
    );
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Blackbutt");
    expect(ld.url).toBe(
      "https://www.maywoodflooring.com.au/product-page/blackbutt"
    );
    expect(ld["@id"]).toBe(
      "https://www.maywoodflooring.com.au/product-page/blackbutt#product"
    );
    expect(ld.brand).toEqual({
      "@type": "Organization",
      "@id": "https://www.maywoodflooring.com.au/#business",
      name: "Maywood Flooring",
    });
    expect(ld.category).toBe("Engineered Flooring");
    expect(ld.image).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"]);
    expect(ld.description).toBe("Warm hardwood.");
  });

  it("缺图片/描述时整字段省略（不放空串 / 空数组）", () => {
    const ld = buildProductJsonLd(mockProduct());
    expect("image" in ld).toBe(false);
    expect("description" in ld).toBe(false);
    // 仍含必备字段
    expect(ld.name).toBe("Blackbutt");
    expect(ld.brand.name).toBe("Maywood Flooring");
    expect("offers" in ld).toBe(false);
    expect("aggregateRating" in ld).toBe(false);
    expect("review" in ld).toBe(false);
  });
});

describe("toProductDetailPaths", () => {
  it("slug 列表映射为 params；过滤空 slug", () => {
    expect(toProductDetailPaths(["blackbutt", "", "spotted-gum"])).toEqual([
      { params: { slug: "blackbutt" } },
      { params: { slug: "spotted-gum" } },
    ]);
  });

  it("空列表（Phase 1 产品未灌入）→ 0 路径（符合预期）", () => {
    expect(toProductDetailPaths([])).toEqual([]);
  });
});

describe("productPath", () => {
  it("拼成 /product-page/<slug>", () => {
    expect(productPath("blackbutt")).toBe("/product-page/blackbutt");
  });
});
