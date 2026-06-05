import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import HomeHero from "@/components/HomeHero.astro";
import ProductSelectionGrid from "@/components/ProductSelectionGrid.astro";
import ProductSelectionCard from "@/components/ProductSelectionCard.astro";
import PartnerNarrativeSection from "@/components/PartnerNarrativeSection.astro";
import SilentFoundationSection from "@/components/SilentFoundationSection.astro";
import SignatureCollectionsSection from "@/components/SignatureCollectionsSection.astro";
import SignatureCollectionCard from "@/components/SignatureCollectionCard.astro";
import BrandStatementSection from "@/components/BrandStatementSection.astro";
import GalleryFeedSection from "@/components/GalleryFeedSection.astro";
import HomeCtaSection from "@/components/HomeCtaSection.astro";
import { HOME_HERO, PRODUCT_SELECTION } from "@/lib/home";
import {
  PARTNER_NARRATIVE,
  SILENT_FOUNDATION,
  GALLERY_FEED,
  HOME_CTA,
} from "@/lib/home-narrative";
import type { Collection } from "@/lib/taxonomy";

/** 招牌系列 mock（getSignatureCollections() 的形状），仅含本测试关心的字段。 */
const mockCollections: Collection[] = [
  {
    _id: "c-puregrain",
    title: "PureGrain",
    slug: "puregrain",
    legacyPath: null,
    isSignature: true,
    sortOrder: 1,
    category: null,
  },
  {
    _id: "c-bushland",
    title: "Bushland",
    slug: "bushland",
    legacyPath: null,
    isSignature: true,
    sortOrder: 2,
    category: null,
  },
];

/**
 * 通过 Astro Container 渲染首页上半区块（#15），验证：
 *  1. Hero 渲染唯一 H1 / tagline / 简介 / READ MORE CTA；
 *  2. 四入口卡链接正确（含 ADR-0001 误导 slug 与 Accessories→Contact）；
 *  3. 无图时优雅降级（占位块，不放破图 / lorem），有图时输出 <img>；
 *  4. below-the-fold 入口图 lazy load。
 *
 * 下半区块（#16）的验证在文件后半段：各区块用 h2（不抢 hero 的唯一 h1）、
 * SignatureCollections 空/非空两态优雅降级、Gallery 不热链 Wix。
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
    expect(html).toContain('src="https://cdn.sanity.io/hero.jpg?');
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
    expect(html).toContain('src="https://cdn.sanity.io/timber.jpg?');
    expect(html).toContain('alt="Timber floor"');
    expect(html).toContain('loading="lazy"');
  });
});

// ─────────────────────────────────────────────────────────────
// 首页下半区块（#16）
// ─────────────────────────────────────────────────────────────

describe("PartnerNarrativeSection.astro", () => {
  it("渲染 h2 标题与两段正文（不抢 hero 的 h1）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnerNarrativeSection, {});
    expect(html).toContain(PARTNER_NARRATIVE.heading);
    expect(html).toContain(PARTNER_NARRATIVE.paragraphs[0]);
    expect(html).toContain(PARTNER_NARRATIVE.paragraphs[1]);
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h1");
  });
});

describe("SilentFoundationSection.astro", () => {
  it("渲染 “The Silent Foundation” h2 与品牌长文", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SilentFoundationSection, {});
    expect(html).toContain(SILENT_FOUNDATION.heading);
    expect(html).toContain(SILENT_FOUNDATION.paragraphs[0]);
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h1");
  });
});

describe("SignatureCollectionCard.astro", () => {
  it("无简介/无图时优雅降级：渲染系列名 + 落地页链接，占位块（不放破图）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SignatureCollectionCard, {
      props: { title: "PureGrain", slug: "puregrain" },
    });
    expect(html).toContain("PureGrain");
    // 链向营销落地页 /<slug>（见 ADR-0001）
    expect(html).toContain('href="/puregrain"');
    expect(html).toContain("sig-card__img--empty");
    expect(html).not.toContain("<img");
  });

  it("有图/有简介时插槽亮起（图 lazy load + alt 回落到 title）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SignatureCollectionCard, {
      props: {
        title: "Bushland",
        slug: "bushland",
        description: "Australian native spotted gum.",
        imageUrl: "https://cdn.sanity.io/bushland.jpg",
      },
    });
    expect(html).toContain('src="https://cdn.sanity.io/bushland.jpg?');
    expect(html).toContain('alt="Bushland"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("Australian native spotted gum.");
  });
});

describe("SignatureCollectionsSection.astro", () => {
  it("有招牌系列时渲染居中堆叠卡，每卡链向 /<slug>", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SignatureCollectionsSection, {
      props: { collections: mockCollections },
    });
    expect(html).toContain("Maywood Signature Collections");
    expect(html).toContain('href="/puregrain"');
    expect(html).toContain('href="/bushland"');
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h1");
  });

  it("空数组时优雅降级：仍渲染标题 + 兜底导览链接，不输出空网格", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SignatureCollectionsSection, {
      props: { collections: [] },
    });
    expect(html).toContain("Maywood Signature Collections");
    // 兜底链接到产品分类，避免出现空白区块
    expect(html).toContain('href="/category/engineered-flooring"');
    // 不渲染任何招牌卡
    expect(html).not.toContain("sig-card");
  });

  it("过滤掉无 slug 的系列（无法生成落地页链接）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SignatureCollectionsSection, {
      props: {
        collections: [
          {
            _id: "x",
            title: "Broken",
            slug: "",
            legacyPath: null,
            isSignature: true,
            sortOrder: 1,
            category: null,
          },
        ],
      },
    });
    expect(html).not.toContain("Broken");
    // 退化为空态（兜底链接）
    expect(html).toContain('href="/category/engineered-flooring"');
  });
});

describe("BrandStatementSection.astro", () => {
  it("渲染品牌信念 h2 陈述（不抢 hero 的 h1）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BrandStatementSection, {});
    expect(html).toContain("bringing a space to life");
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h1");
  });
});

describe("GalleryFeedSection.astro", () => {
  it("无 galleryImage（#8 未建模）时渲染静态占位 strip，绝不热链 Wix", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GalleryFeedSection, {});
    expect(html).toContain(GALLERY_FEED.heading);
    expect(html).toContain(`href="${GALLERY_FEED.cta.href}"`);
    // 占位 strip（无真实 <img>），且不引用任何 Wix 资源
    expect(html).toContain("gallery__cell--empty");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("wixstatic");
    expect(html).not.toContain("parastorage");
    expect(html).not.toContain("<h1");
  });

  it("传入真实图时插槽亮起（lazy load + alt），不再渲染占位块", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GalleryFeedSection, {
      props: {
        images: [
          { url: "https://cdn.sanity.io/g1.jpg", alt: "Project floor one" },
        ],
      },
    });
    expect(html).toContain('src="https://cdn.sanity.io/g1.jpg?');
    expect(html).toContain('alt="Project floor one"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("gallery__cell--empty");
  });
});

describe("HomeCtaSection.astro", () => {
  it("渲染收尾 CTA，按钮指向 /contact", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeCtaSection, {});
    expect(html).toContain(HOME_CTA.heading);
    expect(html).toContain(`href="${HOME_CTA.cta.href}"`);
    expect(html).toContain(HOME_CTA.cta.label);
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h1");
  });
});
