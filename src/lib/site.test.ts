import { describe, it, expect } from "vitest";
import {
  SITE,
  NAP,
  absoluteUrl,
  PRIMARY_NAV,
  FOOTER_NAV,
  SAMPLE_REQUEST,
  SOCIAL_LINKS,
  OPENING_HOURS,
  isNavLinkActive,
} from "@/lib/site";

// 站点常量是全站 NAP 的单一来源（见 AGENTS.md「关键业务事实」）。
// 这些测试把 NAP 的精确值钉死，防止任何页面/组件出现不一致。
describe("SITE constants", () => {
  it("站点名与 base URL 正确（无尾斜杠）", () => {
    expect(SITE.name).toBe("Maywood Flooring");
    expect(SITE.url).toBe("https://www.maywoodflooring.com.au");
    expect(SITE.url.endsWith("/")).toBe(false);
  });

  it("提供站点级默认 OG 图与默认描述", () => {
    expect(SITE.defaultOgImage).toMatch(/^https:\/\/cdn\.sanity\.io\/images\//);
    expect(SITE.defaultDescription.length).toBeGreaterThan(0);
  });

  it("提供稳定 business ID", () => {
    expect(SITE.businessId).toBe(
      "https://www.maywoodflooring.com.au/#business"
    );
  });
});

describe("OPENING_HOURS", () => {
  it("Contact 可见文案与结构化数据共用同一来源", () => {
    expect(OPENING_HOURS.map((row) => [row.days, row.hours])).toEqual([
      ["Monday – Friday", "10:00 am – 4:00 pm"],
      ["Saturday", "11:00 am – 4:00 pm"],
      ["Sunday", "By appointment only"],
    ]);
    expect(OPENING_HOURS[2].schemaDays).toBeNull();
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
      "https://www.maywoodflooring.com.au/contact"
    );
  });

  it("缺前导斜杠也能正确拼接", () => {
    expect(absoluteUrl("contact")).toBe(
      "https://www.maywoodflooring.com.au/contact"
    );
  });

  it("已是绝对 URL 时原样返回", () => {
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("根路径返回带尾斜杠的站点根", () => {
    expect(absoluteUrl("/")).toBe("https://www.maywoodflooring.com.au/");
  });
});

describe("PRIMARY_NAV（SiteHeader / MobileNav 共用的单一来源）", () => {
  it("条目顺序与文案符合规范", () => {
    expect(PRIMARY_NAV.map((l) => l.label)).toEqual([
      "Home",
      "Products",
      "Resources",
      "Gallery",
      "About Us",
      "Contact",
    ]);
  });

  it("Products 指向 engineered Category 的 legacy URL（ADR-0001，不改 slug）", () => {
    const products = PRIMARY_NAV.find((l) => l.label === "Products");
    expect(products?.href).toBe("/category/engineered-flooring");
  });

  it("关键路由 href 与保留的 Wix 结构一致", () => {
    const byLabel = Object.fromEntries(
      PRIMARY_NAV.map((l) => [l.label, l.href])
    );
    expect(byLabel["Home"]).toBe("/");
    expect(byLabel["Resources"]).toBe("/resources");
    expect(byLabel["Gallery"]).toBe("/gallery");
    expect(byLabel["About Us"]).toBe("/about-us");
    expect(byLabel["Contact"]).toBe("/contact");
  });

  it("所有 href 都是站内相对路径", () => {
    for (const link of PRIMARY_NAV) {
      expect(link.href.startsWith("/")).toBe(true);
    }
  });
});

describe("FOOTER_NAV（页脚导航 — 向 Wix「Quick Links」对齐）", () => {
  it("在主导航基础上追加 Sustainability + FAQ 入口（#59-#4：加到页脚，不进主导航）", () => {
    expect(FOOTER_NAV.map((l) => l.label)).toEqual([
      ...PRIMARY_NAV.map((l) => l.label),
      "Sustainability",
      "FAQs",
      "Terms & Conditions",
    ]);
    const tc = FOOTER_NAV.find((l) => l.label === "Terms & Conditions");
    expect(tc?.href).toBe("/terms-and-conditions");
    const faqs = FOOTER_NAV.find((l) => l.label === "FAQs");
    expect(faqs?.href).toBe("/faqs");
    const sustainability = FOOTER_NAV.find((l) => l.label === "Sustainability");
    expect(sustainability?.href).toBe("/sustainability");
  });

  it("FAQ 与 Sustainability 只在页脚，不污染主导航", () => {
    expect(PRIMARY_NAV.some((l) => l.href === "/faqs")).toBe(false);
    expect(PRIMARY_NAV.some((l) => l.href === "/sustainability")).toBe(false);
  });

  it("所有 href 都是站内相对路径", () => {
    for (const link of FOOTER_NAV) {
      expect(link.href.startsWith("/")).toBe(true);
    }
  });
});

describe("SAMPLE_REQUEST CTA", () => {
  it("指向专属样品申请页 /request-sample（见 #26）", () => {
    expect(SAMPLE_REQUEST.href).toBe("/request-sample");
    expect(SAMPLE_REQUEST.label.length).toBeGreaterThan(0);
  });
});

describe("SOCIAL_LINKS（SocialLinks 单一来源，核对自线上 Social Bar）", () => {
  it("含 Instagram / Facebook / YouTube 三个平台", () => {
    expect(SOCIAL_LINKS.map((s) => s.icon)).toEqual([
      "instagram",
      "facebook",
      "youtube",
    ]);
  });

  it("每条都有 https 外链、可读 label 与图标标识", () => {
    for (const social of SOCIAL_LINKS) {
      expect(social.href.startsWith("https://")).toBe(true);
      expect(social.label.length).toBeGreaterThan(0);
      expect(social.icon.length).toBeGreaterThan(0);
    }
  });

  it("链接精确匹配品牌账号", () => {
    const byIcon = Object.fromEntries(
      SOCIAL_LINKS.map((s) => [s.icon, s.href])
    );
    expect(byIcon.instagram).toBe("https://www.instagram.com/maywood_au/");
    expect(byIcon.facebook).toBe(
      "https://www.facebook.com/profile.php?id=61588526080799"
    );
    expect(byIcon.youtube).toBe("https://www.youtube.com/@maywood_au");
  });
});

describe("isNavLinkActive", () => {
  it("Home 只在站点根激活，不在每页高亮", () => {
    expect(isNavLinkActive("/", "/")).toBe(true);
    expect(isNavLinkActive("/", "/contact")).toBe(false);
  });

  it("精确路径匹配即激活", () => {
    expect(isNavLinkActive("/contact", "/contact")).toBe(true);
    expect(isNavLinkActive("/gallery", "/contact")).toBe(false);
  });

  it("子路径激活父级导航项（如产品页高亮 Products）", () => {
    expect(
      isNavLinkActive(
        "/category/engineered-flooring",
        "/category/engineered-flooring/some-product"
      )
    ).toBe(true);
  });

  it("忽略尾斜杠差异", () => {
    expect(isNavLinkActive("/about-us", "/about-us/")).toBe(true);
  });

  it("前缀相近但非子路径不误判", () => {
    expect(isNavLinkActive("/gallery", "/gallery-extra")).toBe(false);
  });
});
