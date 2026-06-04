import { describe, it, expect } from "vitest";
import { HOME_HERO, PRODUCT_SELECTION } from "@/lib/home";

// 首页上半静态数据是入口与文案的单一来源（#15）。这些测试把 label / href
// 钉死，防止任何重构把入口指错（尤其是 ADR-0001 故意保留的误导 slug）。

describe("HOME_HERO", () => {
  it("H1 是线上首页的 Welcome to Maywood Flooring", () => {
    expect(HOME_HERO.heading).toBe("Welcome to Maywood Flooring");
  });

  it("提供 tagline 与简介段（非空）", () => {
    expect(HOME_HERO.tagline.length).toBeGreaterThan(0);
    expect(HOME_HERO.intro.length).toBeGreaterThan(0);
  });

  it("READ MORE CTA 有可读 label 且指向站内相对路径", () => {
    expect(HOME_HERO.cta.label.length).toBeGreaterThan(0);
    expect(HOME_HERO.cta.href.startsWith("/")).toBe(true);
  });
});

describe("PRODUCT_SELECTION（首页四入口）", () => {
  it("恰好四个入口，顺序为 Timber / Laminate / Hybrid / Accessories", () => {
    expect(PRODUCT_SELECTION.map((e) => e.label)).toEqual([
      "Timber",
      "Laminate",
      "Hybrid",
      "Accessories",
    ]);
  });

  it("三个 Category 入口指向保留的 legacy URL（ADR-0001，不改误导 slug）", () => {
    const byLabel = Object.fromEntries(
      PRODUCT_SELECTION.map((e) => [e.label, e.href])
    );
    // Timber = Engineered（名实相符）
    expect(byLabel["Timber"]).toBe("/category/engineered-flooring");
    // Laminate 的 slug 是误导的 solid-flooring
    expect(byLabel["Laminate"]).toBe("/category/solid-flooring");
    // Hybrid 的 slug 是误导的 sustainable-flooring
    expect(byLabel["Hybrid"]).toBe("/category/sustainable-flooring");
  });

  it("Accessories 入口 Phase 1 指向 Contact 询盘（见已敲定决策）", () => {
    const accessories = PRODUCT_SELECTION.find(
      (e) => e.label === "Accessories"
    );
    expect(accessories?.href).toBe("/contact");
  });

  it("每个入口都有站内相对 href 与有意义的图片 alt", () => {
    for (const entry of PRODUCT_SELECTION) {
      expect(entry.href.startsWith("/")).toBe(true);
      expect(entry.imageAlt.length).toBeGreaterThan(0);
    }
  });
});
