import { defineType, defineField } from "sanity";

/**
 * FAQ（常见问题）—— 单条「问题 + 答案」。可被博客 / 资源 / location 页等通过
 * 引用复用，并由页面模板汇总输出 FAQPage 结构化数据（见 AGENTS.md「SEO」）。
 *
 * 字段对应 AGENTS.md「Document types」中的 `faq`。
 * answer 用 Portable Text（block 数组），允许答案内含链接 / 列表等富文本。
 *
 * 面向非技术编辑：question 必填；答案用富文本编辑器。
 */
export const faq = defineType({
  name: "faq",
  title: "常见问题 (FAQ)",
  type: "document",
  description: "单条「问题 + 答案」，可被博客 / 资源 / location 页引用复用。",
  fields: [
    defineField({
      name: "question",
      title: "问题",
      type: "string",
      description: "用户会问的问题原文（澳洲拼写）。",
      validation: (rule) => rule.required().error("FAQ 必须有问题。"),
    }),
    defineField({
      name: "answer",
      title: "答案",
      type: "array",
      description: "问题的答案，支持段落、列表与链接（澳洲拼写）。",
      of: [{ type: "block" }],
      validation: (rule) => rule.required().error("FAQ 必须有答案。"),
    }),
    defineField({
      name: "category",
      title: "分类标签",
      type: "string",
      description:
        "可选的归类标签（如 Installation / Warranty / Delivery），便于在 Studio 内组织与按主题筛选。",
    }),
  ],
  orderings: [
    {
      title: "问题（A→Z）",
      name: "questionAsc",
      by: [{ field: "question", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "question", subtitle: "category" },
  },
});
