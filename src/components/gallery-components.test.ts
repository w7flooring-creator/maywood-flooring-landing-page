import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import GalleryGrid from "@/components/GalleryGrid.astro";
import type { GalleryItem } from "@/lib/gallery";

/**
 * 有图态会挂 React island（client:visible）。Astro Container 默认不带框架渲染器，
 * 须显式注册 @astrojs/react 的 server renderer，island 才能渲染成 <astro-island>。
 */
async function createContainer() {
  const renderers = await loadRenderers([getContainerRenderer()]);
  return AstroContainer.create({ renderers });
}

/**
 * GalleryGrid.astro（issue #19）的 Astro Container 渲染测试。
 *
 * GalleryGrid 是 /gallery 的网格容器：有图 → 挂 GalleryLightbox island（client:visible）；
 * 无图 → 渲染克制的优雅空态（coming soon + 浏览产品兜底链接，绝不 lorem / 破图 /
 * 空网格 / 热链 Wix）。验证两态均正确。
 */

const items: GalleryItem[] = [
  {
    _id: "g1",
    url: "https://cdn.sanity.io/g1.jpg",
    alt: "Spotted Gum living room",
    title: "Brighton project",
    caption: null,
  },
];

describe("GalleryGrid.astro —— 有图态", () => {
  it("有图时挂 GalleryLightbox island（client:visible）", async () => {
    const container = await createContainer();
    const html = await container.renderToString(GalleryGrid, {
      props: { items },
    });
    // island 以 astro-island 形式注入，且按需 hydrate（client:visible）。
    expect(html).toContain("astro-island");
    expect(html).toContain('client="visible"');
    // 不渲染空态文案 / 占位。
    expect(html).not.toContain("coming soon");
  });
});

describe("GalleryGrid.astro —— 空态优雅降级", () => {
  it("无图时渲染 coming soon + 浏览产品兜底链接，不输出空网格 / Wix 热链", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GalleryGrid, {
      props: { items: [] },
    });
    expect(html.toLowerCase()).toContain("coming soon");
    // 兜底导览链接到产品分类，避免空白区块。
    expect(html).toContain('href="/category/engineered-flooring"');
    // 不挂 island、不放破图、不热链 Wix。
    expect(html).not.toContain("astro-island");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("wixstatic");
    expect(html).not.toContain("parastorage");
  });
});
