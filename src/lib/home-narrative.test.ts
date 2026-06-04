import { describe, it, expect } from "vitest";
import {
  PARTNER_NARRATIVE,
  SILENT_FOUNDATION,
  SIGNATURE_COLLECTIONS_HEADING,
  BRAND_STATEMENT,
  GALLERY_FEED,
  HOME_CTA,
} from "@/lib/home-narrative";

/**
 * 钉死首页下半静态文案的关键不变量（标题、CTA href、澳洲拼写、拼写修复），
 * 防止后续改动让文案 / 链接漂移。文案本身核实自线上 Wix 首页 DOM 快照。
 */

describe("home-narrative 文案常量", () => {
  it("PartnerNarrative 标题与两段正文齐全", () => {
    expect(PARTNER_NARRATIVE.heading).toBe(
      "Your Professional Partner in Timber Supply"
    );
    expect(PARTNER_NARRATIVE.paragraphs.length).toBe(2);
    for (const para of PARTNER_NARRATIVE.paragraphs) {
      expect(para.length).toBeGreaterThan(0);
    }
  });

  it("SilentFoundation 标题对照线上，正文非空", () => {
    expect(SILENT_FOUNDATION.heading).toBe("The Silent Foundation");
    expect(SILENT_FOUNDATION.paragraphs[0]).toContain("silent foundation");
  });

  it("SignatureCollections 区块标题对照线上", () => {
    expect(SIGNATURE_COLLECTIONS_HEADING).toBe("Maywood Signature Collections");
  });

  it("BrandStatement 是品牌信念陈述（无 CTA 正文）", () => {
    expect(BRAND_STATEMENT.heading).toContain("bringing a space to life");
    expect(BRAND_STATEMENT.paragraphs.length).toBe(0);
  });

  it("GalleryFeed 用修正拼写 “Gallery” 且 CTA 指向 /gallery", () => {
    expect(GALLERY_FEED.heading).toBe("Gallery");
    // Wix 原页拼作 “Gallary” —— 不得保留该拼写错误
    expect(GALLERY_FEED.heading).not.toBe("Gallary");
    expect(GALLERY_FEED.cta.href).toBe("/gallery");
    // 澳洲拼写
    expect(GALLERY_FEED.paragraphs[0]).toContain("personalised");
  });

  it("HomeCta 收尾 CTA 指向 /contact（Phase 1 主转化路径）", () => {
    expect(HOME_CTA.cta.href).toBe("/contact");
    expect(HOME_CTA.cta.label.length).toBeGreaterThan(0);
    expect(HOME_CTA.heading.length).toBeGreaterThan(0);
  });

  it("不残留 Wix 原页 “Gallary” 拼写错误", () => {
    const allCopy = JSON.stringify({
      PARTNER_NARRATIVE,
      SILENT_FOUNDATION,
      BRAND_STATEMENT,
      GALLERY_FEED,
      HOME_CTA,
    });
    expect(allCopy).not.toContain("Gallary");
  });
});
