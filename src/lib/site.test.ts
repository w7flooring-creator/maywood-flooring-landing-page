import { describe, it, expect } from "vitest";
import { SITE, NAP, absoluteUrl } from "@/lib/site";

// 站点常量是全站 NAP 的单一来源（见 AGENTS.md「关键业务事实」）。
// 这些测试把 NAP 的精确值钉死，防止任何页面/组件出现不一致。
describe("SITE constants", () => {
  it("站点名与 base URL 正确（无尾斜杠）", () => {
    expect(SITE.name).toBe("Maywood Flooring");
    expect(SITE.url).toBe("https://www.maywoodflooring.com.au");
    expect(SITE.url.endsWith("/")).toBe(false);
  });

  it("提供站点级默认 OG 图与默认描述", () => {
    expect(SITE.defaultOgImage.length).toBeGreaterThan(0);
    expect(SITE.defaultDescription.length).toBeGreaterThan(0);
  });
});

describe("NAP（Name / Address / Phone — 必须全站一致）", () => {
  it("电话与邮箱精确匹配 AGENTS.md", () => {
    expect(NAP.phone).toBe("03 8753 5522");
    expect(NAP.email).toBe("sales@maywoodflooring.com.au");
  });

  it("地址字段精确匹配 AGENTS.md", () => {
    expect(NAP.address.street).toBe("49-51 Keysborough Ave");
    expect(NAP.address.locality).toBe("Keysborough");
    expect(NAP.address.region).toBe("VIC");
    expect(NAP.address.postalCode).toBe("3173");
    expect(NAP.address.country).toBe("AU");
  });

  it("服务地理区域包含 Melbourne / VIC / Australia", () => {
    expect(NAP.areaServed).toEqual(["Melbourne", "Victoria", "Australia"]);
  });

  it("WhatsApp 链接用国际格式 61422709709", () => {
    expect(NAP.whatsappUrl).toBe("https://wa.me/61422709709");
  });
});

describe("absoluteUrl", () => {
  it("把相对路径解析为站点绝对 URL", () => {
    expect(absoluteUrl("/contact")).toBe(
      "https://www.maywoodflooring.com.au/contact",
    );
  });

  it("缺前导斜杠也能正确拼接", () => {
    expect(absoluteUrl("contact")).toBe(
      "https://www.maywoodflooring.com.au/contact",
    );
  });

  it("已是绝对 URL 时原样返回", () => {
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("根路径返回带尾斜杠的站点根", () => {
    expect(absoluteUrl("/")).toBe("https://www.maywoodflooring.com.au/");
  });
});
