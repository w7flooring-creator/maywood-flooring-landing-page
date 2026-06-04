import { describe, it, expect } from "vitest";
import {
  PRODUCT_SLUGS_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  buildProductsByCollectionQuery,
  buildProductsByCategoryQuery,
} from "@/lib/products";

/**
 * 只测纯 GROQ 构造（不触网）。真实数据由 studio 端独立验证
 * （见 PR 描述的 schema validate 校验）。
 */

describe("GROQ 查询字符串", () => {
  it("PRODUCT_SLUGS_QUERY 仅取 published 产品的 slug（供 getStaticPaths）", () => {
    expect(PRODUCT_SLUGS_QUERY).toContain('_type == "product"');
    expect(PRODUCT_SLUGS_QUERY).toContain('"slug": slug.current');
    // 列表/路由只对已发布产品出页；draft/archived 不出
    expect(PRODUCT_SLUGS_QUERY).toContain('status == "published"');
    // 仅取存在 slug 的文档，避免 null slug 进路由
    expect(PRODUCT_SLUGS_QUERY).toContain("defined(slug.current)");
  });

  it("PRODUCT_BY_SLUG_QUERY 用 $slug 参数（防注入）并解引用分类法", () => {
    expect(PRODUCT_BY_SLUG_QUERY).toContain('_type == "product"');
    expect(PRODUCT_BY_SLUG_QUERY).toContain("slug.current == $slug");
    // 详情页取单个文档
    expect(PRODUCT_BY_SLUG_QUERY).toContain("[0]");
    // 解引用所属 Category / Collection 摘要
    expect(PRODUCT_BY_SLUG_QUERY).toContain("category->");
    expect(PRODUCT_BY_SLUG_QUERY).toContain("collection->");
    // 不应把任何具体值插进字符串
    expect(PRODUCT_BY_SLUG_QUERY).not.toMatch(/slug\.current == "[^$]/);
  });

  it("PRODUCT_BY_SLUG_QUERY 含产品详情页的九个规格字段", () => {
    // AGENTS.md「产品详情」规格列表：Type / Dimension / Pack Size / Pack Weight /
    // Finish / Bevel / Profile / Grade / Environmental Rate
    for (const specField of [
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
      expect(PRODUCT_BY_SLUG_QUERY).toContain(specField);
    }
  });

  it("PRODUCT_BY_SLUG_QUERY 解引用 relatedProducts 为轻量摘要", () => {
    expect(PRODUCT_BY_SLUG_QUERY).toContain("relatedProducts[]->");
  });

  it("buildProductsByCollectionQuery 用 $collectionSlug 参数（防注入）", () => {
    const q = buildProductsByCollectionQuery();
    expect(q).toContain("collection->slug.current == $collectionSlug");
    expect(q).toContain('_type == "product"');
    expect(q).toContain('status == "published"');
    // 列表项排序稳定
    expect(q).toContain("order(");
    // 不应把任何具体值插进字符串
    expect(q).not.toMatch(/collection->slug\.current == "[^$]/);
  });

  it("buildProductsByCategoryQuery 用 $categorySlug 参数（防注入）", () => {
    const q = buildProductsByCategoryQuery();
    expect(q).toContain("category->slug.current == $categorySlug");
    expect(q).toContain('_type == "product"');
    expect(q).toContain('status == "published"');
    expect(q).toContain("order(");
    // 不应把任何具体值插进字符串
    expect(q).not.toMatch(/category->slug\.current == "[^$]/);
  });
});
