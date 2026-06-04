import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import HomeHero from "@/components/HomeHero.astro";
import ProductSelectionGrid from "@/components/ProductSelectionGrid.astro";
import ProductSelectionCard from "@/components/ProductSelectionCard.astro";
import { HOME_HERO, PRODUCT_SELECTION } from "@/lib/home";

/**
 * 通过 Astro Container 渲染首页上半区块（#15），验证：
 *  1. Hero 渲染唯一 H1 / tagline / 简介 / READ MORE CTA；
 *  2. 四入口卡链接正确（含 ADR-0001 误导 slug 与 Accessories→Contact）；
 *  3. 无图时优雅降级（占位块，不放破图 / lorem），有图时输出 <img>；
 *  4. below-the-fold 入口图 lazy load。
 */

describe("HomeHero.astro", () => {
  it("渲染唯一 H1 与 tagline / 简介 / READ MORE CTA", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeHero, {});
    // 唯一 H1
    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).toContain(HOME_HERO.heading);
    expect(html).toContain(HOME_HERO.tagline);
    // CTA 锚点指向配置 href
    expect(html).toContain(`href="${HOME_HERO.cta.href}"`);
    expect(html).toContain(HOME_HERO.cta.label);
  });

  it("无图时不输出 <img>（优雅降级到 muted 背景）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeHero, {});
    expect(html).not.toContain("<img");
  });

  it("有图时渲染室内图（eager，首屏 LCP），含 alt", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeHero, {
      props: {
        imageUrl: "https://cdn.sanity.io/hero.jpg",
        imageAlt: "Maywood living room",
      },
    });
    expect(html).toContain('src="https://cdn.sanity.io/hero.jpg"');
    expect(html).toContain('alt="Maywood living room"');
    expect(html).toContain('loading="eager"');
  });
});

describe("ProductSelectionGrid.astro", () => {
  it("渲染四入口，链接与文案对照配置（含 ADR-0001 误导 slug）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSelectionGrid, {});
    for (const entry of PRODUCT_SELECTION) {
      expect(html).toContain(`href="${entry.href}"`);
      expect(html).toContain(entry.label);
    }
    // 关键 href 明确钉死
    expect(html).toContain('href="/category/engineered-flooring"');
    expect(html).toContain('href="/category/solid-flooring"');
    expect(html).toContain('href="/category/sustainable-flooring"');
    expect(html).toContain('href="/contact"');
  });

  it("区块标题用 H2（首页 H1 唯一性由 hero 持有）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSelectionGrid, {});
    expect(html).toContain("Our Products Selection");
    expect(html).not.toContain("<h1");
  });
});

describe("ProductSelectionCard.astro", () => {
  it("无图时渲染占位块（不放破图），label 与链接正确", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSelectionCard, {
      props: {
        label: "Timber",
        href: "/category/engineered-flooring",
        imageAlt: "Timber floor",
      },
    });
    expect(html).toContain("Timber");
    expect(html).toContain('href="/category/engineered-flooring"');
    expect(html).toContain("card__img--empty");
    expect(html).not.toContain("<img");
  });

  it("有图时 below-the-fold 懒加载（loading=lazy）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSelectionCard, {
      props: {
        label: "Timber",
        href: "/category/engineered-flooring",
        imageAlt: "Timber floor",
        imageUrl: "https://cdn.sanity.io/timber.jpg",
      },
    });
    expect(html).toContain('src="https://cdn.sanity.io/timber.jpg"');
    expect(html).toContain('alt="Timber floor"');
    expect(html).toContain('loading="lazy"');
  });
});
