import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import CollectionHero from "@/components/CollectionHero.astro";
import CollectionNarrative from "@/components/CollectionNarrative.astro";
import CollectionRelatedProducts from "@/components/CollectionRelatedProducts.astro";

/**
 * 通过 Astro Container 渲染落地页区块组件，验证两件事：
 *  1. 内容尚未灌入（空）时优雅降级——不输出 lorem / 空网格 / 占位文案；
 *  2. 内容就绪时插槽自动「亮起」（渲染真实内容）。
 * 这是 #14「graceful with empty content」验收标准的直接验证。
 */

describe("CollectionHero.astro", () => {
  it("无 heroImage 时渲染克制的 serif 大标题，不放占位 img", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CollectionHero, {
      props: { title: "Manor", eyebrow: "Signature Collection", image: null },
    });
    expect(html).toContain("Manor");
    expect(html).toContain("Signature Collection");
    // 无图：不应出现 <img>
    expect(html).not.toContain("<img");
  });

  it("有 heroImage 时渲染主图（含 alt）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CollectionHero, {
      props: {
        title: "Bushland",
        image: { url: "https://cdn.sanity.io/b.jpg", alt: "Bushland floor" },
      },
    });
    expect(html).toContain('src="https://cdn.sanity.io/b.jpg"');
    expect(html).toContain('alt="Bushland floor"');
    // hero 图首屏 → eager 加载
    expect(html).toContain('loading="eager"');
  });
});

describe("CollectionNarrative.astro", () => {
  it("description 为 null 时整块不渲染（不输出 lorem）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CollectionNarrative, {
      props: { description: null },
    });
    expect(html.trim()).not.toContain("<section");
  });

  it("有 description 时按段落渲染纯文本", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CollectionNarrative, {
      props: {
        heading: "The collection",
        description: "First paragraph.\n\nSecond paragraph.",
      },
    });
    expect(html).toContain("The collection");
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph.");
    // 两段 → 两个 <p>
    expect(html.match(/narrative__para/g)?.length).toBe(2);
  });
});

describe("CollectionRelatedProducts.astro", () => {
  it("无产品时整块不渲染（不输出空网格）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CollectionRelatedProducts, {
      props: { products: [] },
    });
    expect(html.trim()).not.toContain("<section");
  });

  it("有产品时渲染网格，链接指向 /product-page/<slug>", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CollectionRelatedProducts, {
      props: {
        products: [
          {
            _id: "p1",
            title: "Blackbutt",
            slug: "blackbutt",
            imageUrl: "https://cdn/p1.jpg",
          },
          {
            _id: "p2",
            title: "Spotted Gum",
            slug: "spotted-gum",
            imageUrl: null,
          },
        ],
      },
    });
    expect(html).toContain('href="/product-page/blackbutt"');
    expect(html).toContain('href="/product-page/spotted-gum"');
    expect(html).toContain("Blackbutt");
    // 有图产品渲染 img；无图产品回落到占位 span（不破版）
    expect(html).toContain('src="https://cdn/p1.jpg"');
    expect(html).toContain("related__img--empty");
  });
});
