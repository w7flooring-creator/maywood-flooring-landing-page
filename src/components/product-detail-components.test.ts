import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import ProductTitle from "@/components/ProductTitle.astro";
import ProductSpecList from "@/components/ProductSpecList.astro";
import ProductSpecItem from "@/components/ProductSpecItem.astro";
import ProductInquiryCta from "@/components/ProductInquiryCta.astro";
import RelatedProducts from "@/components/RelatedProducts.astro";
import ProductImageGallery, {
  type GalleryImage,
} from "@/components/ProductImageGallery.tsx";

/**
 * 渲染测试（产品/关联恒空是 Phase 1 常态 → 用 mock 数据验证形状）。
 *  - .astro 静态组件用 Astro Container API；
 *  - 图廊 island 是 React 组件，用 react-dom/server 直接做 SSR，验证它能挂载
 *    并输出图片 + 无障碍控件（Container 的 renderToString 类型只接受 .astro 工厂）。
 * 验证点：规格表显示字段/省略空值、询盘 CTA 指向 /contact、相关产品空则不渲染、
 * 图廊 island 渲染图片 + 键盘可达的箭头控件。
 */

/** 用 react-dom/server 把图廊 island 渲染成静态 HTML（.ts 文件无 JSX，用 createElement）。 */
function renderGallery(props: {
  productTitle: string;
  images: GalleryImage[];
}): string {
  return renderToStaticMarkup(React.createElement(ProductImageGallery, props));
}

describe("ProductTitle.astro", () => {
  it("渲染唯一 H1 + eyebrow + 简介", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductTitle, {
      props: {
        title: "Blackbutt",
        eyebrow: "Bushland",
        description: "Warm Australian hardwood.",
      },
    });
    expect(html).toContain("<h1");
    expect(html).toContain("Blackbutt");
    expect(html).toContain("Bushland");
    expect(html).toContain("Warm Australian hardwood.");
  });

  it("无 eyebrow / 无简介时不渲染对应行", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductTitle, {
      props: { title: "Spotted Gum", eyebrow: null, description: null },
    });
    expect(html).toContain("Spotted Gum");
    expect(html).not.toContain("product-title__eyebrow");
    expect(html).not.toContain("product-title__desc");
  });
});

describe("ProductSpecItem.astro", () => {
  it("渲染 label/value 为 dt/dd 对", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSpecItem, {
      props: { label: "Finish", value: "Matt UV Lacquer" },
    });
    expect(html).toContain("Finish");
    expect(html).toContain("Matt UV Lacquer");
    expect(html).toContain("<dt");
    expect(html).toContain("<dd");
  });
});

describe("ProductSpecList.astro", () => {
  it("有规格时渲染 dl + 全部行", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSpecList, {
      props: {
        items: [
          { label: "Type", value: "Engineered Oak" },
          { label: "Dimension", value: "1900 × 190 × 15mm" },
        ],
      },
    });
    expect(html).toContain("<dl");
    expect(html).toContain("Specifications");
    expect(html).toContain("Type");
    expect(html).toContain("Engineered Oak");
    expect(html).toContain("Dimension");
  });

  it("无规格时整块不渲染（不输出空表）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSpecList, {
      props: { items: [] },
    });
    expect(html.trim()).not.toContain("<section");
    expect(html).not.toContain("<dl");
  });
});

describe("ProductInquiryCta.astro", () => {
  it("主 CTA 指向 /contact，并给出 phone + WhatsApp 渠道", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductInquiryCta, {
      props: { productTitle: "Blackbutt" },
    });
    expect(html).toContain('href="/contact"');
    // 产品名进无障碍标签；aria-label 含可见文案（WCAG 2.5.3 label-in-name）
    expect(html).toContain("Enquire about this product: Blackbutt");
    // NAP 单一来源
    expect(html).toContain("03 8753 5522");
    expect(html).toContain('href="tel:0387535522"');
    expect(html).toContain("https://wa.me/61422709709");
  });
});

describe("RelatedProducts.astro", () => {
  it("无关联时整块不渲染（不输出空网格）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(RelatedProducts, {
      props: { products: [] },
    });
    expect(html.trim()).not.toContain("<section");
  });

  it("有关联时渲染标题链接，指向 /product-page/<slug>", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(RelatedProducts, {
      props: {
        products: [
          { title: "Spotted Gum", slug: "spotted-gum" },
          { title: "Tasmanian Oak", slug: "tasmanian-oak" },
        ],
      },
    });
    expect(html).toContain('href="/product-page/spotted-gum"');
    expect(html).toContain('href="/product-page/tasmanian-oak"');
    expect(html).toContain("Spotted Gum");
    expect(html).toContain("Related products");
    // 自包含、最小化：不应渲染图片（图卡归 #12 ProductCard）
    expect(html).not.toContain("<img");
  });
});

describe("ProductImageGallery.tsx (island)", () => {
  it("能挂载并渲染图片 + 键盘可达的 a11y 控件", () => {
    const html = renderGallery({
      productTitle: "Blackbutt",
      images: [
        { url: "https://cdn/a.jpg", alt: "Front" },
        { url: "https://cdn/b.jpg", alt: null },
      ],
    });
    // 图片 src 渲染（SSR 输出）
    expect(html).toContain("https://cdn/a.jpg");
    expect(html).toContain("https://cdn/b.jpg");
    // 无 alt 的图回落到「产品名 — image N」
    expect(html).toContain("Blackbutt — image 2");
    // 多图时渲染上一张/下一张控件（键盘可达的真 <button>）
    expect(html).toContain("Previous image");
    expect(html).toContain("Next image");
    expect(html).toContain("<button");
  });

  it("单图时不渲染轮播箭头（无意义控件不出现）", () => {
    const html = renderGallery({
      productTitle: "Solo",
      images: [{ url: "https://cdn/solo.jpg", alt: "Solo" }],
    });
    expect(html).toContain("https://cdn/solo.jpg");
    expect(html).not.toContain("Previous image");
    expect(html).not.toContain("Next image");
  });

  it("无图时不渲染（返回 null）", () => {
    const html = renderGallery({ productTitle: "X", images: [] });
    expect(html).toBe("");
  });
});
