import { describe, it, expect } from "vitest";
import {
  FAQS_QUERY,
  normaliseFaq,
  portableTextToHtml,
  portableTextToPlainText,
  buildFaqPageJsonLd,
  type Faq,
} from "@/lib/faq";
import type { PortableTextBlock } from "@portabletext/types";

/**
 * 只测纯逻辑（不触网）：GROQ 构造、归一化、Portable Text → HTML 序列化、
 * FAQPage JSON-LD 构造（含转义）。真实 Sanity 数据由 build 时拉取，live dataset
 * 当前为空 → 页面优雅降级（见 PR 说明）。
 */

/** 构造一个标准段落块（含可选 marks / markDefs），简化用例噪音。 */
function block(
  children: { text: string; marks?: string[] }[],
  opts: { style?: string; markDefs?: PortableTextBlock["markDefs"] } = {}
): PortableTextBlock {
  return {
    _type: "block",
    _key: "b",
    style: opts.style ?? "normal",
    markDefs: opts.markDefs ?? [],
    children: children.map((c, i) => ({
      _type: "span",
      _key: `s${i}`,
      text: c.text,
      marks: c.marks ?? [],
    })),
  } as PortableTextBlock;
}

describe("GROQ 构造", () => {
  it("FAQS_QUERY 取全部 faq、解出 question/answer/category，按 question asc 稳定排序", () => {
    expect(FAQS_QUERY).toContain('_type == "faq"');
    expect(FAQS_QUERY).toContain("order(question asc)");
    expect(FAQS_QUERY).toContain("question");
    expect(FAQS_QUERY).toContain("answer");
    expect(FAQS_QUERY).toContain("category");
    // 不把任何具体值插进字符串（无注入面）
    expect(FAQS_QUERY).not.toMatch(/==\s*"[^f]/);
  });
});

describe("normaliseFaq —— 缺字段优雅收敛", () => {
  it("完整文档原样投影出 question/answer/category", () => {
    const raw = {
      _id: "faq1",
      question: "How do I order samples?",
      answer: [block([{ text: "Request them online." }])],
      category: "Samples",
    };
    const faq = normaliseFaq(raw);
    expect(faq.question).toBe("How do I order samples?");
    expect(faq.answer).toHaveLength(1);
    expect(faq.category).toBe("Samples");
  });

  it("question/answer 缺省时收敛为空字符串 / 空数组，category 空串归 null", () => {
    const faq = normaliseFaq({ _id: "x" });
    expect(faq.question).toBe("");
    expect(faq.answer).toEqual([]);
    expect(faq.category).toBeNull();
    expect(normaliseFaq({ _id: "y", category: "   " }).category).toBeNull();
  });
});

describe("portableTextToHtml —— 序列化 + 转义", () => {
  it("段落包成 <p>，多块各自一个 <p>", () => {
    const html = portableTextToHtml([
      block([{ text: "First." }]),
      block([{ text: "Second." }]),
    ]);
    expect(html).toBe("<p>First.</p><p>Second.</p>");
  });

  it("strong / em marks 包成 <strong> / <em>", () => {
    const html = portableTextToHtml([
      block([
        { text: "Plain " },
        { text: "bold", marks: ["strong"] },
        { text: " and " },
        { text: "italic", marks: ["em"] },
      ]),
    ]);
    expect(html).toBe("<p>Plain <strong>bold</strong> and <em>italic</em></p>");
  });

  it("link mark 渲染 <a href>，外链加 rel/target，内链不加", () => {
    const external = portableTextToHtml([
      block([{ text: "site", marks: ["l1"] }], {
        markDefs: [{ _key: "l1", _type: "link", href: "https://example.com" }],
      }),
    ]);
    expect(external).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">site</a>'
    );

    const internal = portableTextToHtml([
      block([{ text: "contact", marks: ["l2"] }], {
        markDefs: [{ _key: "l2", _type: "link", href: "/contact" }],
      }),
    ]);
    expect(internal).toContain('<a href="/contact">contact</a>');
    expect(internal).not.toContain("target=");
  });

  it("bullet / number 列表块收敛为 <ul>/<ol> 且相邻同型列表合并", () => {
    const html = portableTextToHtml([
      { ...block([{ text: "One" }]), listItem: "bullet", level: 1 },
      { ...block([{ text: "Two" }]), listItem: "bullet", level: 1 },
      { ...block([{ text: "Step" }]), listItem: "number", level: 1 },
    ] as PortableTextBlock[]);
    expect(html).toBe(
      "<ul><li>One</li><li>Two</li></ul><ol><li>Step</li></ol>"
    );
  });

  it("h2/h3/h4 样式块渲染对应标题标签", () => {
    const html = portableTextToHtml([
      block([{ text: "Heading" }], { style: "h2" }),
    ]);
    expect(html).toBe("<h2>Heading</h2>");
  });

  it("转义文本中的 HTML 特殊字符（防 XSS / 破坏结构）", () => {
    const html = portableTextToHtml([
      block([{ text: '<script>alert("x")</script> & <b>' }]),
    ]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });

  it("转义链接 href 中的引号 / 尖括号（防属性逃逸）", () => {
    const html = portableTextToHtml([
      block([{ text: "x", marks: ["m"] }], {
        markDefs: [{ _key: "m", _type: "link", href: 'https://e.com/"><img>' }],
      }),
    ]);
    expect(html).not.toContain('"><img>');
    expect(html).toContain("&quot;");
  });

  it("空数组 / 非数组返回空字符串", () => {
    expect(portableTextToHtml([])).toBe("");
    expect(
      portableTextToHtml(undefined as unknown as PortableTextBlock[])
    ).toBe("");
  });
});

describe("portableTextToPlainText —— JSON-LD 用纯文本", () => {
  it("拼接所有 span 文本、块间用空格分隔、去除富文本标签", () => {
    const text = portableTextToPlainText([
      block([{ text: "Bold ", marks: ["strong"] }, { text: "and plain." }]),
      block([{ text: "Second block." }]),
    ]);
    expect(text).toBe("Bold and plain. Second block.");
  });

  it("空内容返回空字符串", () => {
    expect(portableTextToPlainText([])).toBe("");
  });
});

describe("buildFaqPageJsonLd —— FAQPage 结构化数据", () => {
  const faqs: Faq[] = [
    {
      _id: "f1",
      question: "How do I order samples?",
      answer: [block([{ text: "Request them online or call us." }])],
      category: "Samples",
    },
    {
      _id: "f2",
      question: "Do you deliver across Melbourne?",
      answer: [block([{ text: "Yes, across Melbourne & VIC." }])],
      category: null,
    },
  ];

  it("输出合规 FAQPage：@context / @type / mainEntity[] 各为 Question + acceptedAnswer", () => {
    const jsonLd = buildFaqPageJsonLd(faqs);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(2);

    const first = jsonLd.mainEntity[0];
    expect(first["@type"]).toBe("Question");
    expect(first.name).toBe("How do I order samples?");
    expect(first.acceptedAnswer["@type"]).toBe("Answer");
    // answer 文本以 HTML 形式给（FAQPage 允许 answer 含基本 HTML）
    expect(first.acceptedAnswer.text).toBe(
      "<p>Request them online or call us.</p>"
    );
  });

  it("跳过 question 或 answer 为空的条目（不产出残缺 Question）", () => {
    const jsonLd = buildFaqPageJsonLd([
      ...faqs,
      { _id: "empty", question: "", answer: [], category: null },
      { _id: "noanswer", question: "Q?", answer: [], category: null },
    ]);
    expect(jsonLd.mainEntity).toHaveLength(2);
  });

  it("空列表 → mainEntity 为空数组（仍是合规对象，由调用方决定是否注入）", () => {
    const jsonLd = buildFaqPageJsonLd([]);
    expect(jsonLd.mainEntity).toEqual([]);
  });
});
