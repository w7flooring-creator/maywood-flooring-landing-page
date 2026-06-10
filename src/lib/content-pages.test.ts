import { describe, it, expect } from "vitest";
import {
  PAGE_BY_SLUG_QUERY,
  RESOURCES_QUERY,
  RESOURCE_BY_SLUG_QUERY,
  RESOURCE_SLUGS_QUERY,
  normaliseContentImage,
  normaliseBody,
  normaliseSectionImages,
  normaliseContentPage,
  normaliseResourceSummary,
  normaliseResourceDetail,
  normaliseResourceRelatedProducts,
  normaliseResourceFaqs,
  hasBody,
  hasResourceBody,
  buildContentBreadcrumbs,
  buildContentSeo,
  buildResourceBreadcrumbs,
  buildResourceSeo,
  type ContentPage,
  type ResourceDetail,
} from "@/lib/content-pages";

/**
 * 只测纯逻辑（不触网）：GROQ 构造、归一化、判空、面包屑、SEO。
 * 真实 Sanity 数据由 build 时拉取并在 PR 描述说明（live dataset 当前为空，页面优雅降级）。
 */

const fullPage: ContentPage = {
  _id: "page.about",
  title: "About Us",
  slug: "about-us",
  heroImage: { url: "https://cdn.sanity.io/h.jpg", alt: "Showroom" },
  sectionImages: [],
  body: [
    {
      _type: "block",
      _key: "a",
      style: "normal",
      children: [{ _type: "span", _key: "s", text: "Hello", marks: [] }],
      markDefs: [],
    },
  ],
  seoTitle: "About Maywood Flooring",
  seoDescription: "Our story.",
};

describe("GROQ 构造", () => {
  it("PAGE_BY_SLUG_QUERY 用 $slug 参数、取单条、解平 slug、解引用 heroImage 与 body 内图片", () => {
    expect(PAGE_BY_SLUG_QUERY).toContain('_type == "page"');
    expect(PAGE_BY_SLUG_QUERY).toContain("slug.current == $slug");
    expect(PAGE_BY_SLUG_QUERY).toContain("[0]");
    expect(PAGE_BY_SLUG_QUERY).toContain('"slug": slug.current');
    expect(PAGE_BY_SLUG_QUERY).toContain(
      '"heroImage": heroImage{ "url": asset->url'
    );
    // 分区配图按顺序解引用 asset->url（供图文分栏取图）
    expect(PAGE_BY_SLUG_QUERY).toContain(
      '"sectionImages": sectionImages[]{ "url": asset->url'
    );
    // body 内 image 块解引用 asset url（生产不热链 Wix）
    expect(PAGE_BY_SLUG_QUERY).toContain(
      '_type == "image" => { ..., "url": asset->url }'
    );
    // 不把任何具体 slug 值插进字符串（防注入）
    expect(PAGE_BY_SLUG_QUERY).not.toMatch(/slug\.current == "[^$]/);
  });

  it("RESOURCES_QUERY 取全部 resource 并按 publishedAt desc, title asc 排序", () => {
    expect(RESOURCES_QUERY).toContain('_type == "resource"');
    expect(RESOURCES_QUERY).toContain("order(publishedAt desc, title asc)");
    expect(RESOURCES_QUERY).toContain('"slug": slug.current');
  });

  it("RESOURCE_BY_SLUG_QUERY 用 $slug 参数、取单条、解引用 body 内图片与 related/faqs/seo", () => {
    expect(RESOURCE_BY_SLUG_QUERY).toContain('_type == "resource"');
    expect(RESOURCE_BY_SLUG_QUERY).toContain("slug.current == $slug");
    expect(RESOURCE_BY_SLUG_QUERY).toContain("[0]");
    expect(RESOURCE_BY_SLUG_QUERY).toContain('"slug": slug.current');
    // body 内 image 块解引用 asset url（生产不热链 Wix）
    expect(RESOURCE_BY_SLUG_QUERY).toContain(
      '_type == "image" => { ..., "url": asset->url }'
    );
    // related/faqs 解引用为最小投影
    expect(RESOURCE_BY_SLUG_QUERY).toContain(
      '"relatedProducts": relatedProducts[]->{ title, "slug": slug.current }'
    );
    expect(RESOURCE_BY_SLUG_QUERY).toContain('"faqs": faqs[]->question');
    expect(RESOURCE_BY_SLUG_QUERY).toContain('"seoTitle": seo.metaTitle');
    // 不把任何具体 slug 值插进字符串（防注入）
    expect(RESOURCE_BY_SLUG_QUERY).not.toMatch(/slug\.current == "[^$]/);
  });

  it("RESOURCE_SLUGS_QUERY 取全部已定义 slug 的字符串数组", () => {
    expect(RESOURCE_SLUGS_QUERY).toContain('_type == "resource"');
    expect(RESOURCE_SLUGS_QUERY).toContain("defined(slug.current)");
    expect(RESOURCE_SLUGS_QUERY).toContain(".slug.current");
  });
});

describe("normaliseContentImage —— 有 url 才算有图", () => {
  it("缺 url（资产未解出）时为 null", () => {
    expect(normaliseContentImage({ url: null, alt: "ignored" })).toBeNull();
    expect(normaliseContentImage(undefined)).toBeNull();
    expect(normaliseContentImage({})).toBeNull();
  });

  it("有 url、无 alt 时保留 url、alt 为 null", () => {
    expect(normaliseContentImage({ url: "https://cdn/x.jpg" })).toEqual({
      url: "https://cdn/x.jpg",
      alt: null,
    });
  });

  it("有 url、有 alt 时全保留", () => {
    expect(
      normaliseContentImage({ url: "https://cdn/x.jpg", alt: "Floor" })
    ).toEqual({ url: "https://cdn/x.jpg", alt: "Floor" });
  });
});

describe("normaliseBody —— 非数组收敛为空数组", () => {
  it("缺省 / null / 非数组 → []", () => {
    expect(normaliseBody(undefined)).toEqual([]);
    expect(normaliseBody(null)).toEqual([]);
    expect(normaliseBody("nope")).toEqual([]);
  });

  it("数组原样返回", () => {
    const blocks = [{ _type: "block", _key: "a", children: [] }];
    expect(normaliseBody(blocks)).toBe(blocks);
  });
});

describe("normaliseSectionImages —— 保序、丢弃无 url、非数组收敛", () => {
  it("缺省 / null / 非数组 → []", () => {
    expect(normaliseSectionImages(undefined)).toEqual([]);
    expect(normaliseSectionImages(null)).toEqual([]);
    expect(normaliseSectionImages("nope")).toEqual([]);
  });

  it("保序映射，丢弃 asset 未解出（url 为空）的条目", () => {
    expect(
      normaliseSectionImages([
        { url: "https://cdn/a.jpg", alt: "A" },
        { url: null, alt: "missing asset" },
        { url: "https://cdn/b.jpg" },
      ])
    ).toEqual([
      { url: "https://cdn/a.jpg", alt: "A" },
      { url: "https://cdn/b.jpg", alt: null },
    ]);
  });
});

describe("normaliseContentPage —— 缺字段收敛，绝不编造", () => {
  it("缺 heroImage / body / seo 时全部为 null / 空数组", () => {
    const result = normaliseContentPage({
      _id: "page.x",
      title: "X",
      slug: "x",
    });
    expect(result.heroImage).toBeNull();
    expect(result.sectionImages).toEqual([]);
    expect(result.body).toEqual([]);
    expect(result.seoTitle).toBeNull();
    expect(result.seoDescription).toBeNull();
  });

  it("空字符串字段一律归一化为 null", () => {
    const result = normaliseContentPage({
      _id: "x",
      title: "X",
      slug: "x",
      seoTitle: "   ",
      seoDescription: "",
    });
    expect(result.seoTitle).toBeNull();
    expect(result.seoDescription).toBeNull();
  });

  it("内容齐全时保留", () => {
    const result = normaliseContentPage({
      _id: "page.about",
      title: "About Us",
      slug: "about-us",
      heroImage: { url: "https://cdn/h.jpg", alt: "Showroom" },
      body: fullPage.body,
      seoTitle: "About",
      seoDescription: "Story",
    });
    expect(result.heroImage).toEqual({
      url: "https://cdn/h.jpg",
      alt: "Showroom",
    });
    expect(result.body).toHaveLength(1);
    expect(result.seoTitle).toBe("About");
  });
});

describe("normaliseResourceSummary", () => {
  it("缺字段收敛为 null / 空", () => {
    const result = normaliseResourceSummary({
      _id: "res.x",
      title: "Guide",
      slug: "install-guide",
    });
    expect(result.excerpt).toBeNull();
    expect(result.heroImage).toBeNull();
    expect(result.category).toBeNull();
    expect(result.publishedAt).toBeNull();
  });

  it("内容齐全时保留", () => {
    const result = normaliseResourceSummary({
      _id: "res.x",
      title: "Install Guide",
      slug: "install-guide",
      excerpt: "How to install.",
      heroImage: { url: "https://cdn/g.jpg", alt: "Guide" },
      category: "Installation",
      publishedAt: "2026-01-01T00:00:00Z",
    });
    expect(result.excerpt).toBe("How to install.");
    expect(result.category).toBe("Installation");
    expect(result.publishedAt).toBe("2026-01-01T00:00:00Z");
  });
});

describe("hasBody", () => {
  it("null / 空 body → false；有块 → true", () => {
    expect(hasBody(null)).toBe(false);
    expect(hasBody({ ...fullPage, body: [] })).toBe(false);
    expect(hasBody(fullPage)).toBe(true);
  });
});

describe("buildContentBreadcrumbs —— Home > {title}", () => {
  it("两项，末项指向自身路径（即便用回落标题）", () => {
    expect(buildContentBreadcrumbs("/about-us", "About Us")).toEqual([
      { name: "Home", url: "/" },
      { name: "About Us", url: "/about-us" },
    ]);
  });
});

describe("buildContentSeo", () => {
  it("优先用编辑填的 seoTitle / seoDescription", () => {
    const seo = buildContentSeo({
      path: "/about-us",
      page: fullPage,
      fallbackTitle: "About Us",
      fallbackDescription: "fallback",
    });
    expect(seo.title).toBe("About Maywood Flooring");
    expect(seo.description).toBe("Our story.");
    expect(seo.path).toBe("/about-us");
    expect(seo.type).toBe("article");
  });

  it("无 seoTitle 时用页面 title，无 seoDescription 时用 fallback", () => {
    const seo = buildContentSeo({
      path: "/about-us",
      page: { ...fullPage, seoTitle: null, seoDescription: null },
      fallbackTitle: "About Us",
      fallbackDescription: "Static fallback desc.",
    });
    expect(seo.title).toBe("About Us");
    expect(seo.description).toBe("Static fallback desc.");
  });

  it("无文档（page=null）时全部回落到 fallback", () => {
    const seo = buildContentSeo({
      path: "/sustainability",
      page: null,
      fallbackTitle: "Sustainability",
      fallbackDescription: "Static sustainability desc.",
    });
    expect(seo.title).toBe("Sustainability");
    expect(seo.description).toBe("Static sustainability desc.");
  });
});

const fullResource: ResourceDetail = {
  _id: "resource.install",
  title: "Installation Instructions",
  slug: "installation",
  excerpt: "Site prep and steps.",
  heroImage: { url: "https://cdn/h.jpg", alt: "Guide" },
  category: "Installation",
  publishedAt: "2026-01-02T00:00:00Z",
  body: [
    {
      _type: "block",
      _key: "a",
      style: "normal",
      children: [{ _type: "span", _key: "s", text: "Body", marks: [] }],
      markDefs: [],
    },
  ],
  relatedProducts: [{ title: "Bushland Oak", slug: "bushland-oak" }],
  faqs: ["How do I install?"],
  seoTitle: "Install | SEO",
  seoDescription: "SEO description.",
};

describe("normaliseResourceRelatedProducts —— 保序、丢弃缺 title/slug", () => {
  it("非数组 → []", () => {
    expect(normaliseResourceRelatedProducts(undefined)).toEqual([]);
    expect(normaliseResourceRelatedProducts(null)).toEqual([]);
    expect(normaliseResourceRelatedProducts("nope")).toEqual([]);
  });

  it("丢弃缺 title 或 slug（草稿 / 未发布引用解出 null）的条目", () => {
    expect(
      normaliseResourceRelatedProducts([
        { title: "Bushland Oak", slug: "bushland-oak" },
        { title: "No slug", slug: null },
        { title: null, slug: "no-title" },
        { title: "Manor", slug: "manor" },
      ])
    ).toEqual([
      { title: "Bushland Oak", slug: "bushland-oak" },
      { title: "Manor", slug: "manor" },
    ]);
  });
});

describe("normaliseResourceFaqs —— 丢弃空/非字符串项", () => {
  it("非数组 → []；丢弃空白与非字符串", () => {
    expect(normaliseResourceFaqs(undefined)).toEqual([]);
    expect(normaliseResourceFaqs(["Q1", "", "   ", 42, "Q2"])).toEqual([
      "Q1",
      "Q2",
    ]);
  });
});

describe("normaliseResourceDetail —— 缺字段收敛，绝不编造", () => {
  it("仅 _id/title/slug 时其余收敛为 null / 空数组", () => {
    const result = normaliseResourceDetail({
      _id: "res.x",
      title: "Guide",
      slug: "guide",
    });
    expect(result.excerpt).toBeNull();
    expect(result.heroImage).toBeNull();
    expect(result.category).toBeNull();
    expect(result.publishedAt).toBeNull();
    expect(result.body).toEqual([]);
    expect(result.relatedProducts).toEqual([]);
    expect(result.faqs).toEqual([]);
    expect(result.seoTitle).toBeNull();
    expect(result.seoDescription).toBeNull();
  });

  it("内容齐全时保留", () => {
    const result = normaliseResourceDetail({
      _id: "resource.install",
      title: "Installation Instructions",
      slug: "installation",
      excerpt: "Site prep and steps.",
      heroImage: { url: "https://cdn/h.jpg", alt: "Guide" },
      category: "Installation",
      publishedAt: "2026-01-02T00:00:00Z",
      body: fullResource.body,
      relatedProducts: [{ title: "Bushland Oak", slug: "bushland-oak" }],
      faqs: ["How do I install?"],
      seoTitle: "Install | SEO",
      seoDescription: "SEO description.",
    });
    expect(result.body).toHaveLength(1);
    expect(result.relatedProducts).toEqual([
      { title: "Bushland Oak", slug: "bushland-oak" },
    ]);
    expect(result.faqs).toEqual(["How do I install?"]);
    expect(result.seoTitle).toBe("Install | SEO");
  });
});

describe("hasResourceBody", () => {
  it("null / 空 body → false；有块 → true", () => {
    expect(hasResourceBody(null)).toBe(false);
    expect(hasResourceBody({ ...fullResource, body: [] })).toBe(false);
    expect(hasResourceBody(fullResource)).toBe(true);
  });
});

describe("buildResourceBreadcrumbs —— Home > Resources > {title}", () => {
  it("三项，中间指向 /resources，末项指向资料自身", () => {
    expect(buildResourceBreadcrumbs(fullResource)).toEqual([
      { name: "Home", url: "/" },
      { name: "Resources", url: "/resources" },
      {
        name: "Installation Instructions",
        url: "/resources/installation",
      },
    ]);
  });
});

describe("buildResourceSeo", () => {
  it("优先用 seoTitle / seoDescription，path 指向 /resources/<slug>", () => {
    const seo = buildResourceSeo({
      resource: fullResource,
      fallbackDescription: "fallback",
    });
    expect(seo.title).toBe("Install | SEO");
    expect(seo.description).toBe("SEO description.");
    expect(seo.path).toBe("/resources/installation");
    expect(seo.type).toBe("article");
  });

  it("无 seoTitle → 用标题；无 seoDescription → 回落 excerpt", () => {
    const seo = buildResourceSeo({
      resource: { ...fullResource, seoTitle: null, seoDescription: null },
      fallbackDescription: "fallback",
    });
    expect(seo.title).toBe("Installation Instructions");
    expect(seo.description).toBe("Site prep and steps.");
  });

  it("无 seoDescription 且无 excerpt → 回落 fallbackDescription", () => {
    const seo = buildResourceSeo({
      resource: {
        ...fullResource,
        seoTitle: null,
        seoDescription: null,
        excerpt: null,
      },
      fallbackDescription: "Static resource fallback.",
    });
    expect(seo.description).toBe("Static resource fallback.");
  });
});
