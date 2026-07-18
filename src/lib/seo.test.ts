import { describe, it, expect } from "vitest";
import {
  resolveSeoMeta,
  buildLocalBusinessJsonLd,
  buildBreadcrumbListJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo";

describe("resolveSeoMeta — 从 props + 默认值解析每页 meta/OG", () => {
  it("传入完整 props 时原样使用，并组装绝对 canonical 与 OG URL", () => {
    const meta = resolveSeoMeta({
      title: "Contact Us",
      description: "Get in touch with our Keysborough showroom.",
      path: "/contact",
      image: "/og/contact.jpg",
      type: "website",
    });

    expect(meta.title).toBe("Contact Us | Maywood Flooring");
    expect(meta.description).toBe(
      "Get in touch with our Keysborough showroom."
    );
    expect(meta.canonical).toBe("https://www.maywoodflooring.com.au/contact");
    expect(meta.ogTitle).toBe("Contact Us | Maywood Flooring");
    expect(meta.ogDescription).toBe(
      "Get in touch with our Keysborough showroom."
    );
    expect(meta.ogImage).toBe(
      "https://www.maywoodflooring.com.au/og/contact.jpg"
    );
    expect(meta.ogType).toBe("website");
    expect(meta.ogUrl).toBe("https://www.maywoodflooring.com.au/contact");
    expect(meta.ogSiteName).toBe("Maywood Flooring");
  });

  it("缺 description / image / type 时回落到站点级默认值（不报错）", () => {
    const meta = resolveSeoMeta({ title: "About Us", path: "/about-us" });

    expect(meta.title).toBe("About Us | Maywood Flooring");
    expect(meta.description.length).toBeGreaterThan(0);
    expect(meta.ogImage).toMatch(/^https:\/\/cdn\.sanity\.io\/images\//);
    expect(meta.ogType).toBe("website");
  });

  it("首页（path '/'）标题不重复品牌名，只用站点名", () => {
    const meta = resolveSeoMeta({ title: "Maywood Flooring", path: "/" });
    // 标题已等于品牌名 → 不再追加 " | Maywood Flooring"，避免重复
    expect(meta.title).toBe("Maywood Flooring");
    expect(meta.canonical).toBe("https://www.maywoodflooring.com.au/");
  });

  it("显式传入绝对 canonical 时覆盖由 path 推导的值", () => {
    const meta = resolveSeoMeta({
      title: "PureGrain",
      path: "/category/puregrain",
      canonical: "https://www.maywoodflooring.com.au/puregrain",
    });
    // ADR-0001：store 视图 canonical 指向营销落地页
    expect(meta.canonical).toBe("https://www.maywoodflooring.com.au/puregrain");
  });

  it("noindex 默认 false，可显式开启", () => {
    expect(resolveSeoMeta({ title: "X", path: "/x" }).noindex).toBe(false);
    expect(
      resolveSeoMeta({ title: "X", path: "/x", noindex: true }).noindex
    ).toBe(true);
  });

  it("title 缺失时回落到站点名（不抛错）", () => {
    const meta = resolveSeoMeta({ path: "/" });
    expect(meta.title).toBe("Maywood Flooring");
  });

  it("长 description 收敛为单行且不超过 160 字符", () => {
    const meta = resolveSeoMeta({
      path: "/long",
      description: `${"A detailed timber flooring description ".repeat(8)}\nSecond paragraph.`,
    });
    expect(meta.description).not.toContain("\n");
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(meta.description.endsWith("…")).toBe(true);
    expect(meta.ogDescription).toBe(meta.description);
  });
});

describe("buildLocalBusinessJsonLd — 站点级 NAP 结构化数据", () => {
  const ld = buildLocalBusinessJsonLd();

  it("@context / @type 正确", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("LocalBusiness");
  });

  it("name / telephone / email 匹配 NAP", () => {
    expect(ld.name).toBe("Maywood Flooring");
    expect(ld.telephone).toBe("03 8753 5522");
    expect(ld.email).toBe("sales@maywoodflooring.com.au");
  });

  it("url 为站点绝对 URL", () => {
    expect(ld.url).toBe("https://www.maywoodflooring.com.au");
    expect(ld["@id"]).toBe("https://www.maywoodflooring.com.au/#business");
  });

  it("address 是 schema.org PostalAddress，字段齐全", () => {
    expect(ld.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "49-51 Keysborough Ave",
      addressLocality: "Keysborough",
      addressRegion: "VIC",
      postalCode: "3173",
      addressCountry: "AU",
    });
  });

  it("areaServed 含 Melbourne / Victoria / Australia", () => {
    expect(ld.areaServed).toEqual(["Melbourne", "Victoria", "Australia"]);
  });

  it("连接已核实社媒、销售渠道与页面可见营业时间", () => {
    expect(ld.sameAs).toEqual([
      "https://www.instagram.com/maywood_au/",
      "https://www.facebook.com/profile.php?id=61588526080799",
      "https://www.youtube.com/@maywood_au",
    ]);
    expect(ld.contactPoint).toMatchObject({
      "@type": "ContactPoint",
      contactType: "sales",
      areaServed: "AU",
      availableLanguage: "en-AU",
    });
    expect(ld.openingHoursSpecification).toHaveLength(2);
    expect(ld.openingHoursSpecification[0]).toMatchObject({
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "16:00",
    });
  });

  it("默认实体图片指向现有 Sanity 资产，而不是已失效的本地占位", () => {
    expect(ld.image).toMatch(/^https:\/\/cdn\.sanity\.io\/images\//);
    expect(ld.image).not.toContain("/og-default.jpg");
  });

  it("可序列化为合法 JSON（供 <script type=application/ld+json> 注入）", () => {
    expect(() => JSON.stringify(ld)).not.toThrow();
    expect(JSON.parse(JSON.stringify(ld))["@type"]).toBe("LocalBusiness");
  });
});

describe("buildBreadcrumbListJsonLd — 从有序 items 生成 BreadcrumbList", () => {
  const items: BreadcrumbItem[] = [
    { name: "Home", url: "/" },
    { name: "All Products", url: "/category/engineered-flooring" },
    { name: "Blackbutt", url: "/product-page/blackbutt" },
  ];
  const ld = buildBreadcrumbListJsonLd(items);

  it("@context / @type 正确", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("BreadcrumbList");
  });

  it("itemListElement 顺序 / position / 绝对 item URL 正确", () => {
    expect(ld.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.maywoodflooring.com.au/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "All Products",
        item: "https://www.maywoodflooring.com.au/category/engineered-flooring",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Blackbutt",
        item: "https://www.maywoodflooring.com.au/product-page/blackbutt",
      },
    ]);
  });

  it("position 从 1 开始连续", () => {
    const positions = ld.itemListElement.map((e) => e.position);
    expect(positions).toEqual([1, 2, 3]);
  });

  it("空数组返回空 itemListElement（不抛错）", () => {
    const empty = buildBreadcrumbListJsonLd([]);
    expect(empty.itemListElement).toEqual([]);
  });

  it("已是绝对 URL 的 item 不再二次拼接", () => {
    const out = buildBreadcrumbListJsonLd([
      { name: "Ext", url: "https://example.com/x" },
    ]);
    expect(out.itemListElement[0].item).toBe("https://example.com/x");
  });
});
