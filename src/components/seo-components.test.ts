import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import SeoHead from "@/components/SeoHead.astro";
import Breadcrumbs from "@/components/Breadcrumbs.astro";
import StructuredData from "@/components/StructuredData.astro";

// 通过 Astro Container API 做轻量渲染测试，验证薄 .astro 包装确实把
// 纯逻辑层（已在 lib 测试覆盖）的输出渲染成正确的 head/nav 标签。

describe("SeoHead.astro", () => {
  it("渲染唯一 title / description / canonical / OG 与 LocalBusiness JSON-LD", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SeoHead, {
      props: {
        title: "Contact Us",
        description: "Get in touch with our Keysborough showroom.",
        path: "/contact",
      },
    });

    expect(html).toContain("<title>Contact Us | Maywood Flooring</title>");
    expect(html).toContain(
      '<meta name="description" content="Get in touch with our Keysborough showroom.">',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://www.maywoodflooring.com.au/contact">',
    );
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('content="en_AU"');
    // 站点级 LocalBusiness JSON-LD 默认注入
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"LocalBusiness"');
    expect(html).toContain('"telephone":"03 8753 5522"');
  });

  it("noindex=true 时输出 robots noindex", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SeoHead, {
      props: { title: "Hidden", path: "/hidden", noindex: true },
    });
    expect(html).toContain('name="robots"');
    expect(html).toContain("noindex");
  });

  it("localBusiness=false 时不注入 LocalBusiness", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SeoHead, {
      props: { title: "X", path: "/x", localBusiness: false },
    });
    expect(html).not.toContain('"@type":"LocalBusiness"');
  });
});

describe("Breadcrumbs.astro", () => {
  it("渲染语义 nav + 链接，末项标 aria-current，并输出 BreadcrumbList", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Breadcrumbs, {
      props: {
        items: [
          { name: "Home", url: "/" },
          { name: "All Products", url: "/category/engineered-flooring" },
          { name: "Blackbutt", url: "/product-page/blackbutt" },
        ],
      },
    });

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/category/engineered-flooring"');
    // 末项是当前页：不作链接 + aria-current
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Blackbutt");
    expect(html).not.toContain('href="/product-page/blackbutt"');
    // BreadcrumbList JSON-LD
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"position":3');
    expect(html).toContain(
      '"item":"https://www.maywoodflooring.com.au/product-page/blackbutt"',
    );
  });

  it("空 items 不渲染 nav，也不抛错", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Breadcrumbs, {
      props: { items: [] },
    });
    expect(html).not.toContain('aria-label="Breadcrumb"');
  });
});

describe("StructuredData.astro", () => {
  it("转义 < 防止 JSON 内容提前闭合 </script>（XSS 防护）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(StructuredData, {
      props: { data: { "@type": "Thing", name: "</script><script>x" } },
    });
    // 原始 "</script>" 不应原样出现在脚本块内容里
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("\\u003c/script");
    expect(html).not.toContain("</script><script>x");
  });
});
