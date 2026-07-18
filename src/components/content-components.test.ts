import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import HeroImageSection from "@/components/HeroImageSection.astro";
import EditorialTextBlock from "@/components/EditorialTextBlock.astro";
import ImageTextSplit from "@/components/ImageTextSplit.astro";

/**
 * Container API 渲染测试 —— 内容页支撑组件（通用、供内容页复用）。
 * 重点覆盖「有图 / 无图」与「静态文案 / slot」两条降级路径。
 */

async function render(
  Component: Parameters<AstroContainer["renderToString"]>[0],
  props: Record<string, unknown>
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Component, { props });
}

describe("HeroImageSection.astro", () => {
  it("无图 → 克制 H1，无 <img>", async () => {
    const html = await render(HeroImageSection, {
      title: "About Us",
      eyebrow: "About Maywood",
    });
    expect(html).toContain("<h1");
    expect(html).toContain("About Us");
    expect(html).toContain("About Maywood");
    expect(html).not.toContain("<img");
  });

  it("有图 → 宽幅主图 eager load + alt", async () => {
    const html = await render(HeroImageSection, {
      title: "About Us",
      image: { url: "https://cdn/hero.jpg", alt: "Showroom" },
    });
    expect(html).toContain('src="https://cdn/hero.jpg"');
    expect(html).toContain('alt="Showroom"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('data-motion-scene="hero"');
    expect(html).toContain('data-motion-layer="media"');
    expect(html).toContain('data-motion-layer="heading"');
  });
});

describe("EditorialTextBlock.astro", () => {
  it("paragraphs → 多个 <p>（静态回落）", async () => {
    const html = await render(EditorialTextBlock, {
      heading: "Our Story",
      paragraphs: ["Para one.", "Para two."],
    });
    expect(html).toContain("Our Story");
    expect(html).toContain("Para one.");
    expect(html).toContain("Para two.");
    expect(html).toContain('data-motion-scene="text"');
    expect(html).toContain('data-motion-layer="heading"');
    expect(html).toContain('data-motion-layer="copy"');
  });

  it("无 paragraphs → 渲染默认 slot 占位（无静态 <p>）", async () => {
    const html = await render(EditorialTextBlock, { heading: "Body" });
    // 无 paragraphs 时不输出 editorial__body（交给 slot）
    expect(html).not.toContain("editorial__body");
    expect(html).toContain("Body");
  });
});

describe("ImageTextSplit.astro", () => {
  it("有图 → 渲染 <img> lazy load + 标题 + 段落", async () => {
    const html = await render(ImageTextSplit, {
      heading: "Forest stewardship",
      image: { url: "https://cdn/forest.jpg", alt: "Forest" },
      paragraphs: ["We source responsibly."],
    });
    expect(html).toContain('src="https://cdn/forest.jpg"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("Forest stewardship");
    expect(html).toContain("We source responsibly.");
    expect(html).toContain('data-motion-scene="split"');
    expect(html).toContain('data-motion-layer="media"');
    expect(html).toContain('data-motion-layer="heading"');
    expect(html).toContain('data-motion-layer="copy"');
  });

  it("无图 → 降级为纯文字块（no-image 类，无 <img>）", async () => {
    const html = await render(ImageTextSplit, {
      heading: "Durability",
      paragraphs: ["Built to last."],
    });
    expect(html).toContain("split--no-image");
    expect(html).not.toContain("<img");
    expect(html).toContain("Built to last.");
  });

  it("reverse → 加 split--reverse 类（图文对调）", async () => {
    const html = await render(ImageTextSplit, {
      heading: "X",
      image: { url: "https://cdn/x.jpg", alt: "" },
      paragraphs: ["y"],
      reverse: true,
    });
    expect(html).toContain("split--reverse");
  });
});
