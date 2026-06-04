import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import ServiceDetail from "@/components/ServiceDetail.astro";
import ServiceCtaSection from "@/components/ServiceCtaSection.astro";
import ServiceCard from "@/components/ServiceCard.astro";
import { getServiceBySlug } from "@/lib/services";

/**
 * 通过 Astro Container 渲染服务页区块，验证 #20 的两个核心点：
 *  1. 页面区块正常渲染（标题 / 介绍 / what's involved）；
 *  2. CTA href 按服务类型正确分流（consultation/workshop → /contact；
 *     sample-viewing → /request-sample），且不出现日历 / 价格。
 */

const consultation = getServiceBySlug("flooring-consultation")!;
const sampleViewing = getServiceBySlug("sample-viewing")!;

describe("ServiceDetail.astro", () => {
  it("渲染标题、时长 eyebrow、intro 与 what's involved 要点", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServiceDetail, {
      props: { service: consultation },
    });
    expect(html).toContain("Flooring Consultation");
    expect(html).toContain("1 hr");
    // intro 含撇号，渲染时被 HTML 转义；断言无撇号的稳定子串即可。
    expect(html).toContain("Sit down with our team for a focused, one-hour");
    // 模板里的静态文本不转义撇号（仅 {} 插值表达式会转义）。
    expect(html).toContain("What's involved");
    // 每个要点都渲染为列表项
    for (const item of consultation.whatsInvolved) {
      expect(html).toContain(item);
    }
  });

  it("无时长的服务（workshop）不渲染时长但仍标 Service", async () => {
    const container = await AstroContainer.create();
    const workshop = getServiceBySlug("flooring-workshop")!;
    const html = await container.renderToString(ServiceDetail, {
      props: { service: workshop },
    });
    expect(html).toContain("Flooring Workshop");
    expect(html).toContain("Service");
    // 不应出现日历 / 价格相关字眼
    expect(html).not.toMatch(/\$|calendar|book now/i);
  });
});

describe("ServiceCtaSection.astro —— CTA 按服务类型分流（#20 核心）", () => {
  it("consultation / workshop 类 → CTA 指向 /contact", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServiceCtaSection, {
      props: { service: consultation },
    });
    expect(html).toContain('href="/contact"');
    // 渠道：电话 tel: + WhatsApp（取自 site.ts 单一来源）
    expect(html).toContain('href="tel:0387535522"');
    expect(html).toContain("https://wa.me/61422709709");
    // 不应误导向 sample 页
    expect(html).not.toContain('href="/request-sample"');
  });

  it("sample-viewing → CTA 指向 /request-sample", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServiceCtaSection, {
      props: { service: sampleViewing },
    });
    expect(html).toContain('href="/request-sample"');
    expect(html).toContain("Request a Sample");
  });

  it("无日历 / 收款 widget（降级为静态 CTA）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServiceCtaSection, {
      props: { service: consultation },
    });
    expect(html).not.toMatch(/\$|calendar|<iframe|payment/i);
  });
});

describe("ServiceCard.astro —— 列表卡链接到 /service-page/<slug>", () => {
  it("渲染标题 / 摘要，整卡链接到对应服务页", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ServiceCard, {
      props: { service: consultation },
    });
    expect(html).toContain('href="/service-page/flooring-consultation"');
    expect(html).toContain("Flooring Consultation");
    expect(html).toContain(consultation.summary);
    expect(html).toContain("1 hr");
  });

  it("无时长的服务卡不渲染时长块", async () => {
    const container = await AstroContainer.create();
    const workshop = getServiceBySlug("flooring-workshop")!;
    const html = await container.renderToString(ServiceCard, {
      props: { service: workshop },
    });
    expect(html).toContain('href="/service-page/flooring-workshop"');
    expect(html).not.toContain("service-card__duration");
  });
});
