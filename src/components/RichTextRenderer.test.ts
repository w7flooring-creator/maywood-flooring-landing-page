import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { PortableTextBlock } from "@portabletext/types";
import RichTextRenderer from "@/components/RichTextRenderer.astro";

/**
 * Container API 渲染测试 —— 验证 RichTextRenderer 把 mock Portable Text
 * 渲染成正确的品牌化 HTML（标题 / 段落 / 列表 / 链接 / 图片 / 引用）。
 * 该组件由本 issue 拥有、供全站内容页复用，故覆盖各节点类型。
 */

function block(
  style: string,
  text: string,
  extra: Partial<PortableTextBlock> = {}
): PortableTextBlock {
  return {
    _type: "block",
    _key: `b-${style}-${text.slice(0, 4)}`,
    style,
    markDefs: [],
    children: [{ _type: "span", _key: "s", text, marks: [] }],
    ...extra,
  } as PortableTextBlock;
}

async function render(value: PortableTextBlock[]): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(RichTextRenderer, { props: { value } });
}

describe("RichTextRenderer.astro", () => {
  it("渲染包裹层 .rich-text 容器", async () => {
    const html = await render([block("normal", "Hello world")]);
    expect(html).toContain('class="rich-text"');
  });

  it("normal 块 → <p>，标题块 → <h2>/<h3>", async () => {
    const html = await render([
      block("h2", "Heading two"),
      block("h3", "Heading three"),
      block("normal", "A paragraph."),
    ]);
    expect(html).toContain("<h2");
    expect(html).toContain("Heading two");
    expect(html).toContain("<h3");
    expect(html).toContain("Heading three");
    expect(html).toContain("<p");
    expect(html).toContain("A paragraph.");
  });

  it("bullet 列表 → <ul><li>", async () => {
    const html = await render([
      block("normal", "Item one", { listItem: "bullet", level: 1 }),
      block("normal", "Item two", { listItem: "bullet", level: 1 }),
    ]);
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Item one");
    expect(html).toContain("Item two");
  });

  it("blockquote 块 → <blockquote>", async () => {
    const html = await render([block("blockquote", "A quote.")]);
    expect(html).toContain("<blockquote");
    expect(html).toContain("A quote.");
  });

  it("strong mark → <strong>", async () => {
    const html = await render([
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        markDefs: [],
        children: [
          { _type: "span", _key: "s1", text: "Bold bit", marks: ["strong"] },
        ],
      } as PortableTextBlock,
    ]);
    expect(html).toContain("<strong");
    expect(html).toContain("Bold bit");
  });

  it("内部 link mark → <a href> 不带 target", async () => {
    const html = await render([
      {
        _type: "block",
        _key: "b2",
        style: "normal",
        markDefs: [{ _key: "l1", _type: "link", href: "/contact" }],
        children: [
          { _type: "span", _key: "s2", text: "Contact us", marks: ["l1"] },
        ],
      } as PortableTextBlock,
    ]);
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Contact us");
    expect(html).not.toContain('target="_blank"');
  });

  it("外部 link mark → 加 target=_blank 与 rel=noopener noreferrer（安全加固）", async () => {
    const html = await render([
      {
        _type: "block",
        _key: "b3",
        style: "normal",
        markDefs: [{ _key: "l2", _type: "link", href: "https://atfa.com.au" }],
        children: [{ _type: "span", _key: "s3", text: "ATFA", marks: ["l2"] }],
      } as PortableTextBlock,
    ]);
    expect(html).toContain('href="https://atfa.com.au"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("image 块 → <figure><img> 用 GROQ 解出的 url，lazy load", async () => {
    const html = await render([
      {
        _type: "image",
        _key: "img1",
        url: "https://cdn.sanity.io/floor.jpg",
        alt: "Engineered oak floor",
      } as unknown as PortableTextBlock,
    ]);
    expect(html).toContain("<figure");
    expect(html).toContain('src="https://cdn.sanity.io/floor.jpg"');
    expect(html).toContain('alt="Engineered oak floor"');
    expect(html).toContain('loading="lazy"');
  });

  it("image 块无 url 时不渲染（避免 broken image）", async () => {
    const html = await render([
      {
        _type: "image",
        _key: "img2",
        alt: "missing",
      } as unknown as PortableTextBlock,
    ]);
    expect(html).not.toContain("<img");
  });

  it("空数组 → 只输出空的 .rich-text 容器，不抛错", async () => {
    const html = await render([]);
    expect(html).toContain('class="rich-text"');
    expect(html).not.toContain("<p");
  });
});
