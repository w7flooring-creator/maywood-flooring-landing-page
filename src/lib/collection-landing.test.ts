import { describe, it, expect } from "vitest";
import {
  SIGNATURE_LANDINGS_QUERY,
  buildRelatedProductsQuery,
  normaliseSignatureLanding,
  toStaticPaths,
  buildLandingBreadcrumbs,
  buildLandingSeo,
  type SignatureCollectionLanding,
} from "@/lib/collection-landing";

/**
 * 只测纯逻辑（不触网）：GROQ 构造、归一化、getStaticPaths 映射、面包屑、SEO。
 * 真实 Sanity 数据由 build 时拉取并在 PR 描述说明（live dataset 当前为空，区块优雅降级）。
 */

/** 测试夹具：一条「内容齐全」的招牌系列。 */
const fullLanding: SignatureCollectionLanding = {
  _id: "collection.bushland",
  title: "Bushland",
  slug: "bushland",
  tagline: "The Essence of the Australian Landscape",
  description: "Para one.\n\nPara two.",
  heroImage: { url: "https://cdn.sanity.io/x.jpg", alt: "Bushland floor" },
  seoTitle: "Bushland Engineered Timber",
  seoDescription: "Bushland collection meta.",
};

/** 测试夹具：一条「内容全空」的招牌系列（编辑尚未灌入）。 */
const emptyLanding: SignatureCollectionLanding = {
  _id: "collection.manor",
  title: "Manor",
  slug: "manor",
  tagline: null,
  description: null,
  heroImage: null,
  seoTitle: null,
  seoDescription: null,
};

describe("GROQ 构造", () => {
  it("SIGNATURE_LANDINGS_QUERY 仅取 isSignature 并解平 slug / 解引用 heroImage", () => {
    expect(SIGNATURE_LANDINGS_QUERY).toContain("isSignature == true");
    expect(SIGNATURE_LANDINGS_QUERY).toContain('_type == "productCollection"');
    expect(SIGNATURE_LANDINGS_QUERY).toContain("order(sortOrder asc)");
    expect(SIGNATURE_LANDINGS_QUERY).toContain('"slug": slug.current');
    // heroImage 解引用资产 url
    expect(SIGNATURE_LANDINGS_QUERY).toContain('"url": asset->url');
  });

  it("buildRelatedProductsQuery 用 $collectionId 参数（防注入）", () => {
    const q = buildRelatedProductsQuery();
    expect(q).toContain('_type == "product"');
    expect(q).toContain("collection._ref == $collectionId");
    // 不应把任何具体值插进字符串
    expect(q).not.toMatch(/collection\._ref == "[^$]/);
  });
});

describe("normaliseSignatureLanding —— 缺字段收敛为 null，绝不编造内容", () => {
  it("缺 description / heroImage / seo 时全部为 null", () => {
    const result = normaliseSignatureLanding({
      _id: "collection.manor",
      title: "Manor",
      slug: "manor",
    });
    expect(result.description).toBeNull();
    expect(result.heroImage).toBeNull();
    expect(result.seoTitle).toBeNull();
    expect(result.seoDescription).toBeNull();
  });

  it("空字符串与全空白字段一律归一化为 null", () => {
    const result = normaliseSignatureLanding({
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
    const result = normaliseSignatureLanding({
      _id: "x",
      title: "X",
      slug: "x",
      heroImage: { url: null, alt: "ignored" },
    });
    expect(result.heroImage).toBeNull();
  });

  it("heroImage 有 url、无 alt 时保留 url，alt 为 null", () => {
    const result = normaliseSignatureLanding({
      _id: "x",
      title: "X",
      slug: "x",
      heroImage: { url: "https://cdn/x.jpg" },
    });
    expect(result.heroImage).toEqual({ url: "https://cdn/x.jpg", alt: null });
  });

  it("内容齐全时原样保留并 trim", () => {
    const result = normaliseSignatureLanding({
      _id: "collection.bushland",
      title: "Bushland",
      slug: "bushland",
      description: "  Lovely grain.  ",
      heroImage: { url: "https://cdn/b.jpg", alt: "floor" },
      seoTitle: "Bushland",
      seoDescription: "meta",
    });
    expect(result.description).toBe("Lovely grain.");
    expect(result.heroImage).toEqual({
      url: "https://cdn/b.jpg",
      alt: "floor",
    });
    expect(result.seoTitle).toBe("Bushland");
  });
});

describe("toStaticPaths —— 只映射有 slug 的招牌系列", () => {
  it("每个系列 → { params.slug, props.collection }", () => {
    const paths = toStaticPaths([fullLanding, emptyLanding]);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toEqual({
      params: { slug: "bushland" },
      props: { collection: fullLanding },
    });
    expect(paths.map((p) => p.params.slug)).toEqual(["bushland", "manor"]);
  });

  it("过滤掉缺 slug 的脏数据（不生成无效路由）", () => {
    const paths = toStaticPaths([fullLanding, { ...emptyLanding, slug: "" }]);
    expect(paths).toHaveLength(1);
    expect(paths[0].params.slug).toBe("bushland");
  });

  it("空输入 → 空数组（dataset 未灌入时 build 不报错）", () => {
    expect(toStaticPaths([])).toEqual([]);
  });
});

describe("buildLandingBreadcrumbs —— Home > {Collection}", () => {
  it("两项，末项指向自身 /<slug>", () => {
    const crumbs = buildLandingBreadcrumbs(fullLanding);
    expect(crumbs).toEqual([
      { name: "Home", url: "/" },
      { name: "Bushland", url: "/bushland" },
    ]);
  });
});

describe("buildLandingSeo —— canonical 指向自身（ADR-0001）", () => {
  it("canonical 与 path 均为 /<slug>", () => {
    const seo = buildLandingSeo(fullLanding);
    expect(seo.path).toBe("/bushland");
    expect(seo.canonical).toBe("/bushland");
  });

  it("优先用编辑填的 seoTitle / seoDescription", () => {
    const seo = buildLandingSeo(fullLanding);
    expect(seo.title).toBe("Bushland Engineered Timber");
    expect(seo.description).toBe("Bushland collection meta.");
  });

  it("无 seo 字段时回落到 title 与一句符合事实的描述（不编造营销长文）", () => {
    const seo = buildLandingSeo(emptyLanding);
    expect(seo.title).toBe("Manor");
    expect(seo.description).toContain("Manor");
    expect(seo.description).toContain("Maywood Flooring");
  });

  it("有 description、无 seoDescription 时用 description 作 meta", () => {
    const seo = buildLandingSeo({
      ...emptyLanding,
      description: "A warm engineered range.",
    });
    expect(seo.description).toBe("A warm engineered range.");
  });
});
