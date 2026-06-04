import { describe, it, expect } from "vitest";
import {
  CATEGORIES_QUERY,
  COLLECTIONS_QUERY,
  SIGNATURE_COLLECTIONS_QUERY,
  buildCollectionsByCategoryQuery,
} from "@/lib/taxonomy";

/**
 * 只测纯 GROQ 构造（不触网）。真实数据由 studio 端独立验证（见 PR 描述的 live 校验）。
 */

describe("GROQ 查询字符串", () => {
  it("CATEGORIES_QUERY 选 productCategory，按 sortOrder 升序", () => {
    expect(CATEGORIES_QUERY).toContain('_type == "productCategory"');
    expect(CATEGORIES_QUERY).toContain("order(sortOrder asc)");
    // slug 解平为字符串
    expect(CATEGORIES_QUERY).toContain('"slug": slug.current');
  });

  it("COLLECTIONS_QUERY 选 productCollection 并解引用 category", () => {
    expect(COLLECTIONS_QUERY).toContain('_type == "productCollection"');
    expect(COLLECTIONS_QUERY).toContain("order(sortOrder asc)");
    // 解引用所属 Category 摘要
    expect(COLLECTIONS_QUERY).toContain("category->");
    expect(COLLECTIONS_QUERY).toContain("isSignature");
  });

  it("SIGNATURE_COLLECTIONS_QUERY 仅取 isSignature == true", () => {
    expect(SIGNATURE_COLLECTIONS_QUERY).toContain("isSignature == true");
    expect(SIGNATURE_COLLECTIONS_QUERY).toContain(
      '_type == "productCollection"',
    );
  });

  it("buildCollectionsByCategoryQuery 用 $categorySlug 参数（防注入）", () => {
    const q = buildCollectionsByCategoryQuery();
    expect(q).toContain("category->slug.current == $categorySlug");
    expect(q).toContain('_type == "productCollection"');
    // 不应把任何具体值插进字符串
    expect(q).not.toMatch(/category->slug\.current == "[^$]/);
  });
});
