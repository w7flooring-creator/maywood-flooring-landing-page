import { describe, it, expect, vi, beforeEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import type { ResourceDetail } from "@/lib/content-pages";

/**
 * Container API 渲染测试 —— 资料详情页 /resources/[slug]（#67）。
 *
 * 数据层 content-pages 被 mock，使页面测试不触网、可控验证三条路径：
 *  - 有 body → RichTextRenderer 渲染编辑正文；
 *  - body 为空 + 有 excerpt → 回落显示 excerpt + Contact/Resources CTA（绝不 lorem）；
 *  - body 为空 + 无 excerpt → 通用回落文案 + CTA（不留空白页）。
 * 同时验证唯一 SEO（title/meta）、单 H1（hero 标题）、Breadcrumbs（含 JSON-LD）、
 * 相关产品交叉链接。
 *
 * 注：mock 必须在导入页面组件前生效，故页面用动态 import()；并模拟 Astro.params。
 */

const getResourceBySlug = vi.fn();
const getResourceSlugs = vi.fn();

vi.mock("@/lib/content-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content-pages")>();
  return {
    ...actual,
    getResourceBySlug: (...args: unknown[]) => getResourceBySlug(...args),
    getResourceSlugs: (...args: unknown[]) => getResourceSlugs(...args),
  };
});

const baseResource: ResourceDetail = {
  _id: "resource.install",
  title: "Installation Instructions",
  slug: "installation",
  excerpt: "Site prep, installation steps and aftercare.",
  heroImage: null,
  category: "Installation",
  publishedAt: "2026-01-02T00:00:00Z",
  body: [],
  relatedProducts: [],
  faqs: [],
  seoTitle: null,
  seoDescription: null,
};

const renderers = await loadRenderers([getContainerRenderer()]);

// 用模板字符串路径导入（同 projects-render.test.ts）：让 mod.default 推断为
// any，避开 Container.renderToString 对精确组件类型的 never 参数冲突。
const PAGE_PATH = "/resources/[slug]";

async function renderDetail(slug: string): Promise<string> {
  const mod = await import(`@/pages${PAGE_PATH}.astro`);
  const container = await AstroContainer.create({ renderers });
  return container.renderToString(mod.default, {
    params: { slug },
    request: new Request(
      `https://www.maywoodflooring.com.au/resources/${slug}`
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/resources/[slug]", () => {
  it("有 body → RichTextRenderer 渲染正文，单 H1 + 唯一 SEO + 面包屑", async () => {
    getResourceBySlug.mockResolvedValue({
      ...baseResource,
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
              text: "Editor-authored installation copy.",
              marks: [],
            },
          ],
        },
      ],
    } satisfies ResourceDetail);

    const html = await renderDetail("installation");

    // seoTitle 为 null → 回落 resource.title
    expect(html).toContain(
      "<title>Installation Instructions | Maywood Flooring</title>"
    );
    // seoDescription 为 null → 回落 excerpt
    expect(html).toContain(
      '<meta name="description" content="Site prep, installation steps and aftercare.">'
    );
    // 单 H1（hero 标题）
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain("Installation Instructions");
    // 正文经 RichTextRenderer
    expect(html).toContain('class="rich-text"');
    expect(html).toContain("Editor-authored installation copy.");
    // 面包屑 + JSON-LD（Home > Resources > 标题）
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('href="/resources"');
    // 有 body → 不渲染空 body 回落 CTA
    expect(html).not.toContain("Contact our team");
    expect(html).not.toMatch(/lorem/i);
  });

  it("空 body + 有 excerpt → 回落显示 excerpt + Contact/Resources CTA（不 lorem）", async () => {
    getResourceBySlug.mockResolvedValue(baseResource);

    const html = await renderDetail("installation");

    expect(html).toContain("Site prep, installation steps and aftercare.");
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Contact our team");
    expect(html).toContain("Back to all resources");
    expect(html).not.toContain('class="rich-text"');
    expect(html).not.toMatch(/lorem/i);
  });

  it("空 body + 无 excerpt → 通用回落文案 + CTA（不留空白页）", async () => {
    getResourceBySlug.mockResolvedValue({
      ...baseResource,
      excerpt: null,
    } satisfies ResourceDetail);

    const html = await renderDetail("installation");

    expect(html).toContain("being prepared");
    expect(html).toContain('href="/contact"');
    expect(html).not.toMatch(/lorem/i);
  });

  it("有相关产品 → 渲染交叉链接到 /product-page/<slug>", async () => {
    getResourceBySlug.mockResolvedValue({
      ...baseResource,
      relatedProducts: [{ title: "Bushland Oak", slug: "bushland-oak" }],
    } satisfies ResourceDetail);

    const html = await renderDetail("installation");

    expect(html).toContain("Related products");
    expect(html).toContain('href="/product-page/bushland-oak"');
    expect(html).toContain("Bushland Oak");
  });

  it("无文档（getStaticPaths 后内容被删）→ 重定向 /404，不渲染半成品页", async () => {
    getResourceBySlug.mockResolvedValue(null);

    const container = await AstroContainer.create({ renderers });
    const mod = await import(`@/pages${PAGE_PATH}.astro`);
    const res = await container.renderToResponse(mod.default, {
      params: { slug: "gone" },
      request: new Request("https://www.maywoodflooring.com.au/resources/gone"),
    });

    // Astro.redirect("/404") → 3xx + Location 头（与 product-page / projects 路由一致）
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe("/404");
  });
});
