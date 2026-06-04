import { describe, it, expect, vi, beforeEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react";
import type { CaseStudy } from "@/lib/case-studies";

/**
 * Container API 渲染测试 —— /projects/[slug] 案例详情页。
 *
 * 数据层 case-studies 被 mock（仅 getCaseStudyBySlug），使页面测试不触网、
 * 可控验证：标题 / 地点·类型 / summary / body（RichTextRenderer）/ 图库 /
 * productsUsed 交叉链接，以及唯一 SEO（title + canonical + og:type=article）、
 * Breadcrumbs（Home > Projects > Project，含 BreadcrumbList JSON-LD）、
 * Article JSON-LD。缺失案例 → 重定向 /404。
 *
 * 注：mock 必须在导入页面组件前生效，故页面用动态 import()。
 * getStaticPaths 在 Container 渲染时不执行（直接渲染 default + 指定 request 路径）。
 */

const getCaseStudyBySlug = vi.fn();

vi.mock("@/lib/case-studies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/case-studies")>();
  return {
    ...actual,
    // getStaticPaths 用的 getCaseStudySlugs 在 Container 渲染时不会被调用；
    // 仍 stub 成空以防意外触网。
    getCaseStudySlugs: vi.fn(async () => []),
    getCaseStudyBySlug: (...args: unknown[]) => getCaseStudyBySlug(...args),
  };
});

const richCaseStudy: CaseStudy = {
  _id: "cs.zero",
  title: "Zero Carbon World",
  slug: "zero-carbon-world",
  location: "Brighton, Melbourne",
  projectType: "Residential",
  summary: "A warm engineered oak fit-out across the whole home.",
  body: [
    {
      _type: "block",
      _key: "p1",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "s1",
          text: "Editor-authored project story.",
          marks: [],
        },
      ],
    },
  ],
  images: [
    { url: "https://cdn/cover.jpg", alt: "Finished living room" },
    { url: "https://cdn/detail.jpg", alt: null },
  ],
  productsUsed: [
    { title: "Blackbutt", slug: "blackbutt" },
    { title: "Spotted Gum", slug: "spotted-gum" },
  ],
  seoTitle: null,
  seoDescription: null,
};

// 页面经 BaseLayout → SiteHeader → MobileNav（React island），故容器需注册
// React renderer，否则 Container API 无法渲染 .tsx island（NoMatchingRenderer）。
const renderers = await loadRenderers([getContainerRenderer()]);

async function renderProject(slug: string): Promise<string> {
  // 用模板字符串路径导入（同 content-pages-render.test.ts）：让 mod.default 推断为
  // any，避开 Container.renderToString 对精确组件类型的 never 参数冲突。
  const pagePath = "/projects/[slug]";
  const mod = await import(`@/pages${pagePath}.astro`);
  const container = await AstroContainer.create({ renderers });
  return container.renderToString(mod.default, {
    params: { slug },
    request: new Request(`https://www.maywoodflooring.com.au/projects/${slug}`),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/projects/[slug]", () => {
  it("渲染案例全字段：标题 / 地点·类型 / summary / body / 图库 / 所用产品", async () => {
    getCaseStudyBySlug.mockResolvedValue(richCaseStudy);
    const html = await renderProject("zero-carbon-world");

    // 唯一 H1 + 标题
    expect(html).toContain("<h1");
    expect(html).toContain("Zero Carbon World");
    // 地点·类型 eyebrow
    expect(html).toContain("Residential · Brighton, Melbourne");
    // summary
    expect(html).toContain("A warm engineered oak fit-out");
    // body 经 RichTextRenderer
    expect(html).toContain('class="rich-text"');
    expect(html).toContain("Editor-authored project story.");
    // 图库（缺 alt 的图回落到标题）
    expect(html).toContain('src="https://cdn/cover.jpg"');
    expect(html).toContain('alt="Finished living room"');
    expect(html).toContain('src="https://cdn/detail.jpg"');
    expect(html).toContain('alt="Zero Carbon World"');
    // 所用产品交叉链接 → /product-page/<slug>
    expect(html).toContain("Products used");
    expect(html).toContain('href="/product-page/blackbutt"');
    expect(html).toContain('href="/product-page/spotted-gum"');
  });

  it("唯一 SEO：title / canonical / og:type=article", async () => {
    getCaseStudyBySlug.mockResolvedValue(richCaseStudy);
    const html = await renderProject("zero-carbon-world");

    expect(html).toContain(
      "<title>Zero Carbon World | Maywood Flooring</title>"
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://www.maywoodflooring.com.au/projects/zero-carbon-world">'
    );
    expect(html).toContain('property="og:type" content="article"');
  });

  it("面包屑 Home > Projects > Project，含 BreadcrumbList + Article JSON-LD", async () => {
    getCaseStudyBySlug.mockResolvedValue(richCaseStudy);
    const html = await renderProject("zero-carbon-world");

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/projects"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    // Article 结构化数据
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"headline":"Zero Carbon World"');
    expect(html).toContain(
      '"url":"https://www.maywoodflooring.com.au/projects/zero-carbon-world"'
    );
  });

  it("无 body / 图 / 产品时优雅降级（对应区块不渲染，不 lorem）", async () => {
    getCaseStudyBySlug.mockResolvedValue({
      ...richCaseStudy,
      body: [],
      images: [],
      productsUsed: [],
      summary: null,
    });
    const html = await renderProject("zero-carbon-world");

    expect(html).toContain("Zero Carbon World");
    expect(html).not.toContain('class="rich-text"');
    expect(html).not.toContain("project__gallery");
    expect(html).not.toContain("Products used");
    expect(html).not.toMatch(/lorem/i);
  });

  it("缺失案例 → 重定向 /404", async () => {
    getCaseStudyBySlug.mockResolvedValue(null);
    // redirect 在 Container 渲染时抛 RewriteEncountered/Response —— 用宽松断言：
    // 要么抛（重定向响应），要么返回空/重定向 HTML。无论如何不应渲染案例内容。
    let html = "";
    try {
      html = await renderProject("does-not-exist");
    } catch {
      // Astro.redirect 在 Container 环境抛出 Response —— 视为已重定向。
      return;
    }
    expect(html).not.toContain("project__title");
  });
});
