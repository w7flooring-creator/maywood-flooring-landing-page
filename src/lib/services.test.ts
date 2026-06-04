import { describe, it, expect } from "vitest";
import {
  SERVICES,
  SERVICE_SLUGS,
  getServiceBySlug,
  resolveServiceCta,
  toServiceStaticPaths,
  buildServiceBreadcrumbs,
  buildServiceSeo,
  buildBookOnlineSeo,
  type Service,
} from "@/lib/services";
import { SAMPLE_REQUEST } from "@/lib/site";

/**
 * 只测静态清单与纯逻辑（不触网）：5 个已知 slug、CTA 分流落点、
 * getStaticPaths 映射、面包屑、SEO。CTA 分流是 #20 的核心验收点，重点覆盖。
 */

describe("SERVICES —— 静态清单（5 个已知服务）", () => {
  it("恰好包含线上 Wix 的 5 个 slug，且顺序对齐 book-online", () => {
    expect(SERVICE_SLUGS).toEqual([
      "flooring-consultation",
      "flooring-workshop",
      "installation-workshop",
      "flooring-consultation-1",
      "sample-viewing",
    ]);
  });

  it("每个服务字段齐全（title / summary / intro / whatsInvolved / ctaType）", () => {
    for (const s of SERVICES) {
      expect(s.slug.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.summary.length).toBeGreaterThan(0);
      expect(s.intro.length).toBeGreaterThan(0);
      expect(s.whatsInvolved.length).toBeGreaterThan(0);
      expect(["contact", "sample"]).toContain(s.ctaType);
    }
  });

  it("时长核对自线上：consultation 1hr、sample-viewing 1.5hr", () => {
    expect(getServiceBySlug("flooring-consultation")?.duration).toBe("1 hr");
    expect(getServiceBySlug("flooring-consultation-1")?.duration).toBe("1 hr");
    expect(getServiceBySlug("sample-viewing")?.duration).toBe("1.5 hr");
  });

  it("绝不含价格 / 收款字眼（降级为静态介绍，不展示价格）", () => {
    for (const s of SERVICES) {
      const text = `${s.summary} ${s.intro} ${s.whatsInvolved.join(" ")}`;
      expect(text).not.toMatch(
        /\$|\bprice\b|\bpayment\b|\bpay\b|\bbook now\b/i
      );
    }
  });

  it("sample-viewing 是唯一的 sample 类，其余皆 contact 类", () => {
    const sampleSlugs = SERVICES.filter((s) => s.ctaType === "sample").map(
      (s) => s.slug
    );
    expect(sampleSlugs).toEqual(["sample-viewing"]);
  });
});

describe("getServiceBySlug", () => {
  it("命中已知 slug 返回该服务", () => {
    expect(getServiceBySlug("flooring-workshop")?.title).toBe(
      "Flooring Workshop"
    );
  });

  it("未知 slug 返回 undefined", () => {
    expect(getServiceBySlug("does-not-exist")).toBeUndefined();
  });
});

describe("resolveServiceCta —— CTA 按服务类型分流（#20 核心）", () => {
  it("consultation / workshop 类 → /contact", () => {
    for (const slug of [
      "flooring-consultation",
      "flooring-workshop",
      "installation-workshop",
      "flooring-consultation-1",
    ]) {
      const cta = resolveServiceCta(getServiceBySlug(slug)!);
      expect(cta.href).toBe("/contact");
    }
  });

  it("sample-viewing → /request-sample（取自 site.ts 单一来源）", () => {
    const cta = resolveServiceCta(getServiceBySlug("sample-viewing")!);
    expect(cta.href).toBe("/request-sample");
    expect(cta.href).toBe(SAMPLE_REQUEST.href);
    expect(cta.label).toBe(SAMPLE_REQUEST.label);
  });

  it("contact 类有可读的 label", () => {
    const cta = resolveServiceCta(getServiceBySlug("flooring-consultation")!);
    expect(cta.label.length).toBeGreaterThan(0);
  });
});

describe("toServiceStaticPaths —— 5 条路由，每条 { params.slug, props.service }", () => {
  it("默认映射全部 5 个服务", () => {
    const paths = toServiceStaticPaths();
    expect(paths).toHaveLength(5);
    expect(paths.map((p) => p.params.slug)).toEqual([...SERVICE_SLUGS]);
    expect(paths[0].props.service.slug).toBe("flooring-consultation");
  });

  it("过滤掉缺 slug 的脏数据（不生成无效路由）", () => {
    const dirty: Service[] = [{ ...SERVICES[0] }, { ...SERVICES[1], slug: "" }];
    const paths = toServiceStaticPaths(dirty);
    expect(paths).toHaveLength(1);
    expect(paths[0].params.slug).toBe("flooring-consultation");
  });
});

describe("buildServiceBreadcrumbs —— Home > Our Services > {Service}", () => {
  it("三项，末项指向自身 /service-page/<slug>", () => {
    const crumbs = buildServiceBreadcrumbs(getServiceBySlug("sample-viewing")!);
    expect(crumbs).toEqual([
      { name: "Home", url: "/" },
      { name: "Our Services", url: "/book-online" },
      { name: "Sample Viewing", url: "/service-page/sample-viewing" },
    ]);
  });
});

describe("buildServiceSeo —— canonical 自指（legacy URL，ADR-0001）", () => {
  it("path / canonical 均为 /service-page/<slug>", () => {
    const seo = buildServiceSeo(getServiceBySlug("flooring-workshop")!);
    expect(seo.path).toBe("/service-page/flooring-workshop");
    expect(seo.canonical).toBe("/service-page/flooring-workshop");
  });

  it("title 用服务名，description 提及 Keysborough / Melbourne", () => {
    const seo = buildServiceSeo(getServiceBySlug("flooring-workshop")!);
    expect(seo.title).toBe("Flooring Workshop");
    expect(seo.description).toContain("Keysborough");
    expect(seo.description).toContain("Melbourne");
  });
});

describe("buildBookOnlineSeo —— 列表页 canonical 自指", () => {
  it("title 'Our Services'，canonical /book-online", () => {
    const seo = buildBookOnlineSeo();
    expect(seo.title).toBe("Our Services");
    expect(seo.path).toBe("/book-online");
    expect(seo.canonical).toBe("/book-online");
  });
});
