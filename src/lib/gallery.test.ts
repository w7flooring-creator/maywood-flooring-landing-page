import { describe, it, expect } from "vitest";
import {
  GALLERY_IMAGES_QUERY,
  normaliseGalleryItem,
  normaliseGalleryItems,
  buildGalleryBreadcrumbs,
  buildGallerySeo,
  type GalleryItem,
} from "@/lib/gallery";

/**
 * Gallery 数据/纯逻辑层单测（issue #19）。
 *
 * 与 category-page.ts / product-detail.ts 同构：GROQ 字符串、归一化、面包屑、
 * SEO 输入都是纯函数/常量，可单测、不触网。`getGalleryItems()` 才真正发请求，
 * 故此处只测纯部分（网络由 build 验证）。
 */

describe("GALLERY_IMAGES_QUERY", () => {
  it("只取 galleryImage 文档，按 sortOrder 升序并解出可渲染 url", () => {
    expect(GALLERY_IMAGES_QUERY).toContain('_type == "galleryImage"');
    expect(GALLERY_IMAGES_QUERY).toContain("order(sortOrder asc)");
    // 在数据层解出 url（项目未装 @sanity/image-url，沿用 asset->url 约定）。
    expect(GALLERY_IMAGES_QUERY).toContain("asset->url");
    // 投影出 lightbox / 网格所需的 alt / title / caption。
    expect(GALLERY_IMAGES_QUERY).toContain("image.alt");
    expect(GALLERY_IMAGES_QUERY).toContain("caption");
  });
});

describe("normaliseGalleryItem", () => {
  it("解出 url / alt / title / caption（去空白）", () => {
    const item = normaliseGalleryItem({
      _id: "g1",
      url: "https://cdn.sanity.io/g1.jpg",
      alt: "  Spotted Gum living room  ",
      title: "  Brighton project  ",
      caption: "  Engineered oak throughout.  ",
    });
    expect(item).toEqual({
      _id: "g1",
      url: "https://cdn.sanity.io/g1.jpg",
      alt: "Spotted Gum living room",
      title: "Brighton project",
      caption: "Engineered oak throughout.",
    });
  });

  it("缺 url 时返回 null（无图不进网格，绝不破版）", () => {
    expect(normaliseGalleryItem({ _id: "g1", url: null, alt: "x" })).toBeNull();
    expect(normaliseGalleryItem({ _id: "g1", url: "", alt: "x" })).toBeNull();
    expect(normaliseGalleryItem({ _id: "g1" })).toBeNull();
  });

  it("空 alt / title / caption 收敛为 null（页面/lightbox 据此回落）", () => {
    const item = normaliseGalleryItem({
      _id: "g1",
      url: "https://cdn.sanity.io/g1.jpg",
      alt: "   ",
      title: "",
      caption: null,
    });
    expect(item).toEqual({
      _id: "g1",
      url: "https://cdn.sanity.io/g1.jpg",
      alt: null,
      title: null,
      caption: null,
    });
  });
});

describe("normaliseGalleryItems", () => {
  it("丢弃无 url 的脏数据、保留顺序", () => {
    const items = normaliseGalleryItems([
      { _id: "g1", url: "https://cdn.sanity.io/g1.jpg", alt: "one" },
      { _id: "g2", url: null, alt: "broken" },
      { _id: "g3", url: "https://cdn.sanity.io/g3.jpg", alt: "three" },
    ]);
    expect(items.map((i) => i._id)).toEqual(["g1", "g3"]);
  });

  it("非数组（null / undefined）安全返回空数组", () => {
    expect(normaliseGalleryItems(null)).toEqual([]);
    expect(normaliseGalleryItems(undefined)).toEqual([]);
  });
});

describe("buildGalleryBreadcrumbs", () => {
  it("Home > Gallery，末项指向自身 /gallery", () => {
    expect(buildGalleryBreadcrumbs()).toEqual([
      { name: "Home", url: "/" },
      { name: "Gallery", url: "/gallery" },
    ]);
  });
});

describe("buildGallerySeo", () => {
  it("唯一 title / description，canonical 自指 /gallery", () => {
    const seo = buildGallerySeo();
    expect(seo.title).toBe("Gallery");
    expect(seo.path).toBe("/gallery");
    expect(seo.canonical).toBe("/gallery");
    expect(seo.description).toBeTruthy();
    // 澳洲本地表达（自然提及 Melbourne / Victoria）。
    expect(seo.description).toMatch(/Melbourne|Victoria/);
  });

  it("传入首图时作为 OG image（缺省则不设，回落站点默认）", () => {
    const withImage: GalleryItem[] = [
      {
        _id: "g1",
        url: "https://cdn.sanity.io/g1.jpg",
        alt: "one",
        title: null,
        caption: null,
      },
    ];
    expect(buildGallerySeo(withImage).image).toBe(
      "https://cdn.sanity.io/g1.jpg"
    );
    expect(buildGallerySeo([]).image).toBeUndefined();
  });
});
