import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import CaseStudyCard from "@/components/CaseStudyCard.astro";
import type { CaseStudySummary } from "@/lib/case-studies";

/**
 * CaseStudyCard 渲染测试（案例 Phase 1 未灌入 → 用 mock 摘要验证形状）。
 * 验证点：链接指向 /projects/<slug>、有图渲染 <img> + alt 回落到标题、
 * 无图回落占位、地点/类型/摘要缺省则对应行不渲染（绝不占位）。
 */

function mockSummary(
  overrides: Partial<CaseStudySummary> = {}
): CaseStudySummary {
  return {
    _id: "cs1",
    title: "Zero Carbon World",
    slug: "zero-carbon-world",
    location: null,
    projectType: null,
    summary: null,
    image: null,
    ...overrides,
  };
}

describe("CaseStudyCard.astro", () => {
  it("渲染标题 + 链接到 /projects/<slug>", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudyCard, {
      props: { caseStudy: mockSummary() },
    });
    expect(html).toContain('href="/projects/zero-carbon-world"');
    expect(html).toContain("Zero Carbon World");
  });

  it("有图：渲染 <img>，缺 alt 回落到标题", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudyCard, {
      props: {
        caseStudy: mockSummary({
          image: { url: "https://cdn/cover.jpg", alt: null },
        }),
      },
    });
    expect(html).toContain('src="https://cdn/cover.jpg"');
    expect(html).toContain('alt="Zero Carbon World"');
    expect(html).toContain('loading="lazy"');
  });

  it("有图且有 alt：用图自身 alt", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudyCard, {
      props: {
        caseStudy: mockSummary({
          image: { url: "https://cdn/cover.jpg", alt: "Finished living room" },
        }),
      },
    });
    expect(html).toContain('alt="Finished living room"');
  });

  it("无图：回落到 aria-hidden 占位块（不破图）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudyCard, {
      props: { caseStudy: mockSummary() },
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("case-card__img--empty");
    expect(html).toContain('aria-hidden="true"');
  });

  it("有地点/类型：渲染 meta 行（类型 · 地点）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudyCard, {
      props: {
        caseStudy: mockSummary({
          projectType: "Residential",
          location: "Brighton, Melbourne",
        }),
      },
    });
    expect(html).toContain("Residential · Brighton, Melbourne");
  });

  it("无地点/类型/摘要：对应行不渲染（绝不占位）", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudyCard, {
      props: { caseStudy: mockSummary() },
    });
    expect(html).not.toContain("case-card__meta");
    expect(html).not.toContain("case-card__summary");
  });

  it("有摘要：渲染摘要文本", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudyCard, {
      props: {
        caseStudy: mockSummary({ summary: "Warm engineered oak throughout." }),
      },
    });
    expect(html).toContain("Warm engineered oak throughout.");
  });
});
