import { describe, it, expect, vi, beforeEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import type { Faq } from "@/lib/faq";

/**
 * Container API 渲染测试 —— /faqs 页。
 *
 * 数据层 faq 被 mock，验证两条路径：
 *  - 有 FAQ → 渲染 FaqAccordion（island + FAQPage JSON-LD）；
 *  - 无 FAQ（[]）→ 优雅空状态 + Contact CTA（绝不 lorem / 占位）。
 * 同时验证唯一 SEO（title）与 Breadcrumbs（含 BreadcrumbList JSON-LD）。
 *
 * 注：mock 必须在导入页面组件前生效，故页面用动态 import()。
 */

const getFaqs = vi.fn();

vi.mock("@/lib/faq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/faq")>();
  return {
    ...actual,
    getFaqs: (...args: unknown[]) => getFaqs(...args),
  };
});

function block(text: string): Faq["answer"][number] {
  return {
    _type: "block",
    _key: "b",
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: "s", text, marks: [] }],
  } as Faq["answer"][number];
}

// 页面经 BaseLayout → SiteHeader → MobileNav + FaqAccordionIsland（React island），
// 故容器需注册 React renderer。
const renderers = await loadRenderers([getContainerRenderer()]);

async function renderFaqs(): Promise<string> {
  const mod = await import("@/pages/faqs.astro");
  const container = await AstroContainer.create({ renderers });
  return container.renderToString(mod.default, {
    request: new Request("https://www.maywoodflooring.com.au/faqs"),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/faqs", () => {
  it("无 FAQ → 优雅空状态 + Contact CTA，唯一 SEO + 面包屑（不 lorem / 不输出 FAQPage）", async () => {
    getFaqs.mockResolvedValue([]);
    const html = await renderFaqs();

    expect(html).toContain("<title>FAQs | Maywood Flooring</title>");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain("FAQ library is being prepared");
    expect(html).not.toContain('"@type":"FAQPage"');
    expect(html).not.toMatch(/lorem/i);
  });

  it("有 FAQ → 渲染问题 + 输出 FAQPage JSON-LD（答案以 HTML 形式进 acceptedAnswer）", async () => {
    const faqs: Faq[] = [
      {
        _id: "f1",
        question: "How do I order samples?",
        answer: [block("Request them online or call our team.")],
        category: "Samples",
      },
      {
        _id: "f2",
        question: "Do you deliver across Melbourne?",
        answer: [block("Yes, across Melbourne and VIC.")],
        category: null,
      },
    ];
    getFaqs.mockResolvedValue(faqs);
    const html = await renderFaqs();

    expect(html).toContain("<title>FAQs | Maywood Flooring</title>");
    // 问题文本出现（island server-render 输出 trigger）
    expect(html).toContain("How do I order samples?");
    expect(html).toContain("Do you deliver across Melbourne?");
    // FAQPage 结构化数据，answer 以 HTML 形式（<p>…）注入并经 StructuredData 转义 `<`
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"Question"');
    expect(html).toContain('"@type":"Answer"');
    expect(html).toContain("Request them online or call our team.");
    // 空状态文案不应出现
    expect(html).not.toContain("FAQ library is being prepared");
  });

  it("过滤问题或答案为空的残缺条目（不渲染、不进 FAQPage）", async () => {
    const faqs: Faq[] = [
      {
        _id: "ok",
        question: "Valid question?",
        answer: [block("Valid answer.")],
        category: null,
      },
      { _id: "empty", question: "", answer: [], category: null },
      {
        _id: "noanswer",
        question: "Has no answer?",
        answer: [],
        category: null,
      },
    ];
    getFaqs.mockResolvedValue(faqs);
    const html = await renderFaqs();

    expect(html).toContain("Valid question?");
    expect(html).not.toContain("Has no answer?");
    expect(html).toContain('"@type":"FAQPage"');
  });
});
