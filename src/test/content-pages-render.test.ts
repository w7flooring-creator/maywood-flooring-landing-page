import { describe, it, expect, vi, beforeEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import type { ContentPage, ResourceSummary } from "@/lib/content-pages";

/**
 * Container API 渲染测试 —— About / Sustainability / Resources 三页。
 *
 * 数据层 content-pages 被 mock，使页面测试不触网、可控验证两条路径：
 *  - 有 Sanity 内容 → 渲染 body / 卡片；
 *  - 无内容（null / []）→ 静态 editorial 回落 / 优雅空状态（绝不 lorem）。
 * 同时验证唯一 SEO（title）与 Breadcrumbs（含 BreadcrumbList JSON-LD）。
 *
 * 注：mock 必须在导入页面组件前生效，故页面用动态 import()。
 */

const getPageBySlug = vi.fn();
const getResources = vi.fn();

vi.mock("@/lib/content-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content-pages")>();
  return {
    ...actual,
    getPageBySlug: (...args: unknown[]) => getPageBySlug(...args),
    getResources: (...args: unknown[]) => getResources(...args),
  };
});

// About 页另调用 category-page.getFeaturedProducts（「Explore Our Products」轮播）。
// 测试不触网：mock 返回空数组 → 轮播区块优雅不渲染（与回落路径一致）。
vi.mock("@/lib/category-page", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/category-page")>();
  return {
    ...actual,
    getFeaturedProducts: vi.fn(async () => []),
  };
});

const richPage: ContentPage = {
  _id: "page.about",
  title: "About Maywood",
  slug: "about-us",
  heroImage: null,
  sectionImages: [],
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
          text: "Editor-authored about copy.",
          marks: [],
        },
      ],
    },
  ],
  seoTitle: null,
  seoDescription: "Editor meta description.",
};

// 页面经 BaseLayout → SiteHeader → MobileNav（React island），故容器需注册
// React renderer，否则 Container API 无法渲染 .tsx island（NoMatchingRenderer）。
const renderers = await loadRenderers([getContainerRenderer()]);

async function renderPage(path: string): Promise<string> {
  const mod = await import(`@/pages${path}.astro`);
  const container = await AstroContainer.create({ renderers });
  return container.renderToString(mod.default, {
    request: new Request(`https://www.maywoodflooring.com.au${path}`),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/about-us", () => {
  it("无 Sanity 文档 → 静态 editorial 回落（不 lorem），唯一 SEO + 面包屑", async () => {
    getPageBySlug.mockResolvedValue(null);
    const html = await renderPage("/about-us");

    expect(html).toContain('data-motion-profile="editorial"');
    expect(html).toContain("data-page-motion");
    expect(html).toContain("<title>About Us | Maywood Flooring</title>");
    // 面包屑 + BreadcrumbList JSON-LD
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    // 静态回落文案（核对自线上 Wix）
    expect(html).toContain("Your Trusted Flooring Partner");
    expect(html).toContain("European Oak");
    expect(html).not.toMatch(/lorem/i);
  });

  it("有 body → 渲染 RichTextRenderer 编辑正文，title/meta 用 seo 回落到 page", async () => {
    getPageBySlug.mockResolvedValue(richPage);
    const html = await renderPage("/about-us");

    // seoTitle 为 null → 用 page.title
    expect(html).toContain("<title>About Maywood | Maywood Flooring</title>");
    expect(html).toContain(
      '<meta name="description" content="Editor meta description.">'
    );
    expect(html).toContain('class="rich-text"');
    expect(html).toContain("Editor-authored about copy.");
    // 有正文时不再渲染静态回落
    expect(html).not.toContain("Your Trusted Flooring Partner");
  });
});

describe("/sustainability", () => {
  it("无文档 → 静态可持续支柱回落（澳洲拼写），唯一 SEO", async () => {
    getPageBySlug.mockResolvedValue(null);
    const html = await renderPage("/sustainability");

    expect(html).toContain("<title>Sustainability | Maywood Flooring</title>");
    expect(html).toContain("Forest stewardship");
    expect(html).toContain("Sustainability through durability");
    // 澳洲拼写：optimising / minimise（非 optimizing / minimize）
    expect(html).toContain("optimising");
    expect(html).not.toContain("optimizing");
    expect(html).not.toMatch(/lorem/i);
  });
});

describe("/resources", () => {
  it("无资料 → 优雅空状态 + Contact CTA（不占位卡）", async () => {
    getResources.mockResolvedValue([]);
    const html = await renderPage("/resources");

    expect(html).toContain('data-motion-profile="editorial"');
    expect(html).toContain("<title>Resources | Maywood Flooring</title>");
    expect(html).toContain('href="/contact"');
    expect(html).toContain("resource library is being prepared");
    expect(html).not.toContain("resources__grid");
  });

  it("有资料 → 渲染卡片网格（标题 / 分类 / 摘要）", async () => {
    const items: ResourceSummary[] = [
      {
        _id: "r1",
        title: "Installation Instructions",
        slug: "installation",
        excerpt: "Site prep, installation steps and maintenance.",
        heroImage: { url: "https://cdn/i.jpg", alt: "Guide" },
        category: "Installation",
        publishedAt: "2026-01-02T00:00:00Z",
      },
      {
        _id: "r2",
        title: "Care & Maintenance",
        slug: "care",
        excerpt: null,
        heroImage: null,
        category: "Care & Maintenance",
        publishedAt: null,
      },
    ];
    getResources.mockResolvedValue(items);
    const html = await renderPage("/resources");

    expect(html).toContain("resources__grid");
    expect(html).toContain("Installation Instructions");
    // & 在 HTML 文本里转义（Astro 输出 &amp;）—— 第二张卡的标题与分类都含 "Care … Maintenance"
    expect(html).toContain("Care &amp; Maintenance");
    expect(html).toContain("Site prep, installation steps");
    expect(html).toContain('src="https://cdn/i.jpg"');
    // 空状态文案不应出现
    expect(html).not.toContain("resource library is being prepared");
  });

  it("每张卡渲染 per-card「View more」→ /resources/<slug>，aria-label 含标题", async () => {
    const items: ResourceSummary[] = [
      {
        _id: "r1",
        title: "Installation Instructions",
        slug: "installation",
        excerpt: null,
        heroImage: null,
        category: "Installation",
        publishedAt: null,
      },
      {
        _id: "r2",
        title: "Care & Maintenance",
        slug: "care",
        excerpt: null,
        heroImage: null,
        category: "Care & Maintenance",
        publishedAt: null,
      },
    ];
    getResources.mockResolvedValue(items);
    const html = await renderPage("/resources");

    // 每条 resource 都生成指向详情路由的链接
    expect(html).toContain('href="/resources/installation"');
    expect(html).toContain('href="/resources/care"');
    // 链接文案 + 区分性 aria-label（Astro 7 在属性里把 & 转义为 &amp;）
    expect(html).toContain("View more");
    expect(html).toContain('aria-label="View more: Installation Instructions"');
    expect(html).toContain('aria-label="View more: Care &amp; Maintenance"');
  });
});
