import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import CategoryHero from "@/components/CategoryHero.astro";
import CategoryIntro from "@/components/CategoryIntro.astro";
import CategorySidebar from "@/components/CategorySidebar.astro";
import ProductCount from "@/components/ProductCount.astro";
import ProductCard from "@/components/ProductCard.astro";
import ProductGrid from "@/components/ProductGrid.astro";
import type { Collection } from "@/lib/taxonomy";
import type { CategoryProduct } from "@/lib/category-page";

/**
 * 通过 Astro Container 渲染分类页区块组件，验证两件事：
 *  1. 内容尚未灌入（空产品 / 空 description）时优雅降级——不输出 lorem / 空网格 / 占位文案；
 *  2. 内容就绪时插槽自动「亮起」（渲染真实 hero / intro / 侧栏 / 网格）。
 * 这是 #12 验收标准（hero/intro/sidebar/grid/空态）的直接验证。
 * 本地匿名读 dataset 返回空 → 实页 0 页，故正确性靠这些 mock 渲染测试，不靠页数。
 */

/** mock 侧栏 Collection（Engineered 下两个）。 */
const mockCollections: Collection[] = [
  {
    _id: "collection.bushland",
    title: "Bushland",
    slug: "bushland",
    legacyPath: "/category/bushland",
    isSignature: true,
    sortOrder: 2,
    category: { _id: "category.engineered", title: "Engineered", slug: "e" },
  },
  {
    _id: "collection.manor",
    title: "Manor",
    slug: "manor",
    legacyPath: "/category/manor",
    isSignature: true,
    sortOrder: 3,
    category: { _id: "category.engineered", title: "Engineered", slug: "e" },
  },
];

/** mock 产品（一有图、一无图）。 */
const mockProducts: CategoryProduct[] = [
  {
    _id: "p1",
    title: "Blackbutt",
    slug: "blackbutt",
    imageUrl: "https://cdn.sanity.io/p1.jpg",
  },
  { _id: "p2", title: "Spotted Gum", slug: "spotted-gum", imageUrl: null },
];

describe("CategoryHero.astro", () => {
  it("无 heroImage 时渲染 muted hero + serif 标题，不放占位 img", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryHero, {
      props: { title: "Laminate Flooring", eyebrow: "Products", image: null },
    });
    expect(html).toContain("Laminate Flooring");
    expect(html).toContain("Products");
    expect(html).not.toContain("<img");
  });

  it("有 heroImage 时渲染主图（含 alt、eager）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryHero, {
      props: {
        title: "Engineered Flooring",
        image: { url: "https://cdn.sanity.io/e.jpg", alt: "Engineered floor" },
      },
    });
    expect(html).toContain('src="https://cdn.sanity.io/e.jpg"');
    expect(html).toContain('alt="Engineered floor"');
    expect(html).toContain('loading="eager"');
  });

  it("hero 标题不是 <h1>（H1 让给 CategoryIntro，避免双 H1）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryHero, {
      props: { title: "Hybrid Flooring", image: null },
    });
    expect(html).not.toContain("<h1");
  });
});

describe("CategoryIntro.astro", () => {
  it("渲染唯一 H1（分类展示名），即便 description 为 null", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryIntro, {
      props: { title: "Laminate Flooring", description: null },
    });
    expect(html).toContain("<h1");
    expect(html).toContain("Laminate Flooring");
    // 无 description：不输出正文段落
    expect(html).not.toContain("intro__para");
  });

  it("有 description 时按段落渲染纯文本（内容债以 Sanity 文案为准）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryIntro, {
      props: {
        title: "Laminate Flooring",
        description: "Durable laminate range.\n\nWater-resistant options.",
      },
    });
    expect(html).toContain("Durable laminate range.");
    expect(html).toContain("Water-resistant options.");
    expect(html.match(/intro__para/g)?.length).toBe(2);
  });
});

describe("CategorySidebar.astro —— Browse by 列出该 Category 的 Collection", () => {
  it("无 Collection 时整块不渲染（不输出空侧栏）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategorySidebar, {
      props: { collections: [] },
    });
    expect(html.trim()).not.toContain("<nav");
  });

  it("有 Collection 时渲染 Browse by 与链接 /category/<collection-slug>", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategorySidebar, {
      props: { collections: mockCollections },
    });
    expect(html).toContain("Browse by");
    expect(html).toContain('href="/category/bushland"');
    expect(html).toContain('href="/category/manor"');
    expect(html).toContain("Bushland");
    expect(html).toContain("Manor");
    // 语义 nav（无障碍）
    expect(html).toContain('aria-label="Browse by"');
  });
});

describe("ProductCount.astro —— 单复数正确，0 也诚实显示", () => {
  it("0 产品 → '0 products'（Phase 1 常态，不破版）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductCount, {
      props: { count: 0 },
    });
    expect(html).toContain("0 products");
  });

  it("1 产品 → 单数 '1 product'", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductCount, {
      props: { count: 1 },
    });
    expect(html).toContain("1 product");
    expect(html).not.toContain("1 products");
  });

  it("多产品 → 复数", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductCount, {
      props: { count: 12 },
    });
    expect(html).toContain("12 products");
  });
});

describe("ProductCard.astro", () => {
  it("有图时渲染 img（lazy）+ 链接 /product-page/<slug>", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductCard, {
      props: { product: mockProducts[0] },
    });
    expect(html).toContain('href="/product-page/blackbutt"');
    expect(html).toContain('src="https://cdn.sanity.io/p1.jpg"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("Blackbutt");
  });

  it("无图时回落到占位块（不破版），仍带链接与产品名", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductCard, {
      props: { product: mockProducts[1] },
    });
    expect(html).toContain('href="/product-page/spotted-gum"');
    expect(html).toContain("card__img--empty");
    expect(html).toContain("Spotted Gum");
    expect(html).not.toContain("<img");
  });
});

describe("ProductGrid.astro", () => {
  it("无产品时渲染克制空态文案（不是空网格、不是 lorem）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductGrid, {
      props: { products: [] },
    });
    expect(html).toContain("grid__empty");
    expect(html).not.toContain('role="list"');
  });

  it("有产品时渲染网格，逐个产品出卡片链接", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductGrid, {
      props: { products: mockProducts },
    });
    expect(html).toContain('role="list"');
    expect(html).toContain('href="/product-page/blackbutt"');
    expect(html).toContain('href="/product-page/spotted-gum"');
    // 两个产品 → 两张卡
    expect(html.match(/grid__item/g)?.length).toBe(2);
  });
});
