import { describe, it, expect } from "vitest";
import {
  CASE_STUDY_SLUGS_QUERY,
  CASE_STUDY_BY_SLUG_QUERY,
  CASE_STUDY_SUMMARIES_QUERY,
  normaliseBody,
  normaliseProductsUsed,
  normaliseCaseStudy,
  normaliseCaseStudySummary,
  hasBody,
  caseStudyPath,
  buildCaseStudyBreadcrumbs,
  buildCaseStudySeo,
  buildCaseStudyJsonLd,
  toCaseStudyPaths,
  type CaseStudy,
} from "@/lib/case-studies";

/**
 * 纯逻辑层单测（不触网）。覆盖：GROQ 构造（$slug 防注入、解引用、解图 url）、
 * 投影归一化（图集去空、productsUsed 丢脏）、面包屑、SEO 输入、Article JSON-LD
 * 形状、getStaticPaths 映射。真实数据由 studio 端独立校验；案例 Phase 1 未灌入
 * → 用 mock 数据验证形状。
 */

/** 构造一条最小完整的案例 mock，测试按需覆盖字段。 */
function mockCaseStudy(overrides: Partial<CaseStudy> = {}): CaseStudy {
  return {
    _id: "cs1",
    title: "Zero Carbon World",
    slug: "zero-carbon-world",
    location: null,
    projectType: null,
    summary: null,
    body: [],
    images: [],
    productsUsed: [],
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  };
}

describe("GROQ 查询字符串", () => {
  it("CASE_STUDY_SLUGS_QUERY 仅取有 slug 的案例", () => {
    expect(CASE_STUDY_SLUGS_QUERY).toContain('_type == "caseStudy"');
    expect(CASE_STUDY_SLUGS_QUERY).toContain("defined(slug.current)");
    expect(CASE_STUDY_SLUGS_QUERY).toContain('"slug": slug.current');
  });

  it("CASE_STUDY_BY_SLUG_QUERY 用 $slug 参数（防注入）并解引用 + 解图 url", () => {
    expect(CASE_STUDY_BY_SLUG_QUERY).toContain("slug.current == $slug");
    expect(CASE_STUDY_BY_SLUG_QUERY).toContain("[0]");
    // 解引用 productsUsed
    expect(CASE_STUDY_BY_SLUG_QUERY).toContain("productsUsed[]->");
    // 图片解成可渲染 url（图廊用），非 asset._ref
    expect(CASE_STUDY_BY_SLUG_QUERY).toContain("asset->url");
    // body 内嵌图片也解 url
    expect(CASE_STUDY_BY_SLUG_QUERY).toContain("body[]");
    // 不应把任何具体值插进字符串
    expect(CASE_STUDY_BY_SLUG_QUERY).not.toMatch(/slug\.current == "[^$]/);
  });

  it("CASE_STUDY_SUMMARIES_QUERY 按标题排序、取首图作缩略图", () => {
    expect(CASE_STUDY_SUMMARIES_QUERY).toContain('_type == "caseStudy"');
    expect(CASE_STUDY_SUMMARIES_QUERY).toContain("order(title asc)");
    expect(CASE_STUDY_SUMMARIES_QUERY).toContain("images[0]");
  });
});

describe("normaliseBody", () => {
  it("非数组（null / undefined）收敛为空数组", () => {
    expect(normaliseBody(null)).toEqual([]);
    expect(normaliseBody(undefined)).toEqual([]);
    expect(normaliseBody("nope")).toEqual([]);
  });

  it("数组原样返回", () => {
    const blocks = [{ _type: "block", _key: "b1", children: [] }];
    expect(normaliseBody(blocks)).toBe(blocks);
  });
});

describe("normaliseProductsUsed", () => {
  it("丢弃缺 title/slug 的脏数据，保留有效引用", () => {
    expect(
      normaliseProductsUsed([
        { title: "Blackbutt", slug: "blackbutt" },
        { title: "", slug: "broken" }, // 丢弃
        { slug: "no-title" }, // 丢弃
        { title: "Spotted Gum" }, // 缺 slug，丢弃
        null, // 丢弃
      ])
    ).toEqual([{ title: "Blackbutt", slug: "blackbutt" }]);
  });

  it("非数组收敛为空数组", () => {
    expect(normaliseProductsUsed(null)).toEqual([]);
    expect(normaliseProductsUsed(undefined)).toEqual([]);
  });
});

describe("normaliseCaseStudy —— 投影归一化", () => {
  it("images 去掉无 url 的破图、保留顺序", () => {
    const cs = normaliseCaseStudy({
      _id: "cs1",
      title: "Desert Wildlife Conservation",
      slug: "desert-wildlife-conservation",
      images: [
        { url: "https://cdn/1.jpg", alt: "One" },
        { url: "", alt: "broken" }, // 丢弃
        { url: "https://cdn/2.jpg", alt: null },
      ],
    });
    expect(cs.images.map((i) => i.url)).toEqual([
      "https://cdn/1.jpg",
      "https://cdn/2.jpg",
    ]);
    expect(cs.images[0].alt).toBe("One");
  });

  it("空字符串字段收敛为 null；body 缺省为空数组", () => {
    const cs = normaliseCaseStudy({
      title: "X",
      slug: "x",
      location: "   ",
      projectType: "",
      summary: "  ",
    });
    expect(cs.location).toBeNull();
    expect(cs.projectType).toBeNull();
    expect(cs.summary).toBeNull();
    expect(cs.body).toEqual([]);
    expect(cs.images).toEqual([]);
    expect(cs.productsUsed).toEqual([]);
  });

  it("保留有值字段并解引用 productsUsed", () => {
    const cs = normaliseCaseStudy({
      _id: "cs2",
      title: "Renewable Energy Program",
      slug: "renewable-energy-program",
      location: "Geelong, VIC",
      projectType: "Commercial",
      summary: "A warm engineered fit-out.",
      body: [{ _type: "block", _key: "b1", children: [] }],
      productsUsed: [
        { title: "Blackbutt", slug: "blackbutt" },
        { title: "", slug: "x" }, // 丢弃
      ],
    });
    expect(cs.location).toBe("Geelong, VIC");
    expect(cs.projectType).toBe("Commercial");
    expect(cs.summary).toBe("A warm engineered fit-out.");
    expect(cs.body).toHaveLength(1);
    expect(cs.productsUsed).toEqual([
      { title: "Blackbutt", slug: "blackbutt" },
    ]);
  });
});

describe("normaliseCaseStudySummary", () => {
  it("取首图作缩略图，空字段收敛为 null", () => {
    const summary = normaliseCaseStudySummary({
      _id: "cs1",
      title: "Rainforest Action Initiative",
      slug: "rainforest-action-initiative",
      location: null,
      projectType: "Residential",
      summary: "",
      image: { url: "https://cdn/cover.jpg", alt: "Cover" },
    });
    expect(summary.title).toBe("Rainforest Action Initiative");
    expect(summary.projectType).toBe("Residential");
    expect(summary.summary).toBeNull();
    expect(summary.image).toEqual({
      url: "https://cdn/cover.jpg",
      alt: "Cover",
    });
  });

  it("无图时 image 为 null", () => {
    const summary = normaliseCaseStudySummary({
      title: "Y",
      slug: "y",
      image: { url: "", alt: "broken" },
    });
    expect(summary.image).toBeNull();
  });
});

describe("hasBody", () => {
  it("null / 空 body → false；有块 → true", () => {
    expect(hasBody(null)).toBe(false);
    expect(hasBody(mockCaseStudy())).toBe(false);
    expect(
      hasBody(
        mockCaseStudy({ body: [{ _type: "block", _key: "b1", children: [] }] })
      )
    ).toBe(true);
  });
});

describe("caseStudyPath", () => {
  it("拼成 /projects/<slug>", () => {
    expect(caseStudyPath("zero-carbon-world")).toBe(
      "/projects/zero-carbon-world"
    );
  });
});

describe("buildCaseStudyBreadcrumbs", () => {
  it("Home > Projects > {Project}，末项指向案例自身", () => {
    const crumbs = buildCaseStudyBreadcrumbs({
      title: "Zero Carbon World",
      slug: "zero-carbon-world",
    });
    expect(crumbs).toEqual([
      { name: "Home", url: "/" },
      { name: "Projects", url: "/projects" },
      { name: "Zero Carbon World", url: "/projects/zero-carbon-world" },
    ]);
  });
});

describe("buildCaseStudySeo", () => {
  it("canonical 指向自身，type=article，回落到 summary，用首图作 OG", () => {
    const seo = buildCaseStudySeo(
      mockCaseStudy({
        summary: "A coastal engineered oak project.",
        images: [{ url: "https://cdn/a.jpg", alt: "a" }],
      })
    );
    expect(seo.path).toBe("/projects/zero-carbon-world");
    expect(seo.canonical).toBe("/projects/zero-carbon-world");
    expect(seo.type).toBe("article");
    expect(seo.description).toBe("A coastal engineered oak project.");
    expect(seo.image).toBe("https://cdn/a.jpg");
  });

  it("优先用编辑填的 seo 字段", () => {
    const seo = buildCaseStudySeo(
      mockCaseStudy({
        seoTitle: "Custom Title",
        seoDescription: "Custom desc.",
      })
    );
    expect(seo.title).toBe("Custom Title");
    expect(seo.description).toBe("Custom desc.");
  });

  it("无 seo / summary 时给克制回落（含类型 + 地点）", () => {
    const seo = buildCaseStudySeo(
      mockCaseStudy({ projectType: "Commercial", location: "Melbourne" })
    );
    expect(seo.title).toBe("Zero Carbon World");
    expect(seo.description).toBe(
      "Zero Carbon World — a Commercial, Melbourne flooring project by Maywood Flooring."
    );
  });

  it("无类型/地点时回落到通用克制描述", () => {
    const seo = buildCaseStudySeo(mockCaseStudy());
    expect(seo.description).toBe(
      "Zero Carbon World — a flooring project by Maywood Flooring, Melbourne."
    );
  });
});

describe("buildCaseStudyJsonLd", () => {
  it("输出 Article schema：绝对 url、headline、publisher、图片数组、描述", () => {
    const ld = buildCaseStudyJsonLd(
      mockCaseStudy({
        summary: "Warm engineered oak throughout.",
        images: [
          { url: "https://cdn/a.jpg", alt: "a" },
          { url: "https://cdn/b.jpg", alt: "b" },
        ],
      })
    );
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("Zero Carbon World");
    expect(ld.url).toBe(
      "https://www.maywoodflooring.com.au/projects/zero-carbon-world"
    );
    expect(ld.publisher).toEqual({
      "@type": "Organization",
      name: "Maywood Flooring",
    });
    expect(ld.image).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"]);
    expect(ld.description).toBe("Warm engineered oak throughout.");
  });

  it("缺图片/描述时整字段省略（不放空串 / 空数组）", () => {
    const ld = buildCaseStudyJsonLd(mockCaseStudy());
    expect("image" in ld).toBe(false);
    expect("description" in ld).toBe(false);
    // 仍含必备字段
    expect(ld.headline).toBe("Zero Carbon World");
    expect(ld.publisher.name).toBe("Maywood Flooring");
  });

  it("seoDescription 优先于 summary 作描述", () => {
    const ld = buildCaseStudyJsonLd(
      mockCaseStudy({ summary: "from summary", seoDescription: "from seo" })
    );
    expect(ld.description).toBe("from seo");
  });
});

describe("toCaseStudyPaths", () => {
  it("slug 列表映射为 params；过滤空 slug", () => {
    expect(
      toCaseStudyPaths(["zero-carbon-world", "", "renewable-energy-program"])
    ).toEqual([
      { params: { slug: "zero-carbon-world" } },
      { params: { slug: "renewable-energy-program" } },
    ]);
  });

  it("空列表（Phase 1 案例未灌入）→ 0 路径（符合预期）", () => {
    expect(toCaseStudyPaths([])).toEqual([]);
  });
});
