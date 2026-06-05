import { describe, it, expect } from "vitest";
import { sanityImageUrl, sanityImageSrcset } from "@/lib/sanity-image";

/**
 * Sanity 图片 URL 优化 helper 单测（#27 launch QA）。
 * 纯字符串变换，可单测、不触网。
 */

const SANITY_URL =
  "https://cdn.sanity.io/images/1soy4f28/production/abc123-4160x6240.jpg";

describe("sanityImageUrl", () => {
  it("给 Sanity 图片 URL 追加 w / q / auto=format 参数", () => {
    const out = sanityImageUrl(SANITY_URL, { width: 640 });
    expect(out).toContain(`${SANITY_URL}?`);
    expect(out).toContain("w=640");
    expect(out).toContain("q=70");
    expect(out).toContain("auto=format");
  });

  it("width 四舍五入为整数（srcset 计算可能产生小数）", () => {
    expect(sanityImageUrl(SANITY_URL, { width: 639.6 })).toContain("w=640");
  });

  it("可覆盖默认质量，并可关闭 auto=format", () => {
    const out = sanityImageUrl(SANITY_URL, {
      width: 800,
      quality: 50,
      auto: false,
    });
    expect(out).toContain("q=50");
    expect(out).not.toContain("auto=format");
  });

  it("不传 width 时只做格式/质量优化（不含 w=）", () => {
    const out = sanityImageUrl(SANITY_URL);
    expect(out).not.toContain("w=");
    expect(out).toContain("auto=format");
  });

  it("非 Sanity URL 原样返回（不破图、不热链改写）", () => {
    const external = "https://example.com/photo.jpg";
    expect(sanityImageUrl(external, { width: 640 })).toBe(external);
  });

  it("空值 / null / undefined 返回空串", () => {
    expect(sanityImageUrl("")).toBe("");
    expect(sanityImageUrl(null)).toBe("");
    expect(sanityImageUrl(undefined)).toBe("");
  });

  it("URL 已带 query 时用 & 衔接", () => {
    const withQuery = `${SANITY_URL}?rect=0,0,100,100`;
    expect(sanityImageUrl(withQuery, { width: 640 })).toContain(
      "?rect=0,0,100,100&"
    );
  });
});

describe("sanityImageSrcset", () => {
  it("每个宽度生成一项 `<url> Ww`，按宽度升序", () => {
    const srcset = sanityImageSrcset(SANITY_URL, [800, 320, 480]);
    const entries = srcset.split(", ");
    expect(entries).toHaveLength(3);
    expect(entries[0]).toContain("w=320");
    expect(entries[0].endsWith(" 320w")).toBe(true);
    expect(entries[1]).toContain("w=480");
    expect(entries[2]).toContain("w=800");
  });

  it("宽度去重", () => {
    expect(
      sanityImageSrcset(SANITY_URL, [640, 640, 320]).split(", ")
    ).toHaveLength(2);
  });

  it("非 Sanity URL / 空 widths / 空值返回空串", () => {
    expect(sanityImageSrcset("https://example.com/a.jpg", [640])).toBe("");
    expect(sanityImageSrcset(SANITY_URL, [])).toBe("");
    expect(sanityImageSrcset(null, [640])).toBe("");
  });
});
