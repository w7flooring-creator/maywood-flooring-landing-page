import { defineType, defineField } from "sanity";

/**
 * Blog Post（博客文章）—— editorial 文章，输出 BlogPosting 结构化数据
 * （见 AGENTS.md「SEO」）。
 *
 * 字段对应 AGENTS.md「`blogPost` / `resource`」全清单：
 *   title slug excerpt heroImage body category relatedProducts faqs publishedAt seo
 * body 用 Portable Text（block 数组）。`resource` 与本类型同构（见 resource.ts），
 * 区分点是文档类型本身（博客 vs. 资料），便于按类型路由与列表（见 AGENTS.md「路由」）。
 *
 * 面向非技术编辑：title/slug 必填；relatedProducts / faqs 通过引用复用既有文档。
 */
export const blogPost = defineType({
  name: "blogPost",
  title: "博客文章 (Blog Post)",
  type: "document",
  description: "editorial 文章，含摘要、主图、正文、相关产品与 FAQ。",
  fields: [
    defineField({
      name: "title",
      title: "文章标题",
      type: "string",
      description: "文章的展示标题，也是详情页 H1。",
      validation: (rule) => rule.required().error("文章必须有标题。"),
    }),
    defineField({
      name: "slug",
      title: "URL Slug",
      type: "slug",
      description: "页面 URL 末段。沿用历史值，请勿擅自修改（见 ADR-0001）。",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required().error("文章必须有 URL slug。"),
    }),
    defineField({
      name: "excerpt",
      title: "摘要",
      type: "text",
      rows: 3,
      description:
        "列表卡片与详情页开头的一两句话摘要（澳洲拼写）。也可作为 SEO 描述的回落。",
    }),
    defineField({
      name: "heroImage",
      title: "Hero 主图",
      type: "image",
      description:
        "文章顶部 / 列表卡片主图。请填写有意义的替代文字（alt）以利无障碍与 SEO。",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "替代文字 (Alt)",
          type: "string",
          description: "图片的文字描述，供读屏软件与搜索引擎使用。",
        }),
      ],
    }),
    defineField({
      name: "body",
      title: "正文",
      type: "array",
      description: "文章正文，支持标题、段落、列表、图片与链接（澳洲拼写）。",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "替代文字 (Alt)",
              type: "string",
              description: "图片的文字描述，供读屏软件与搜索引擎使用。",
            }),
          ],
        },
      ],
    }),
    defineField({
      name: "category",
      title: "分类标签",
      type: "string",
      description:
        "文章归类标签（如 Buying Guides / Care & Maintenance / Trends），便于组织与筛选。",
    }),
    defineField({
      name: "relatedProducts",
      title: "相关产品",
      type: "array",
      description:
        "与本文相关的产品（引用 product 文档），用于交叉链接与推荐。",
      of: [{ type: "reference", to: [{ type: "product" }] }],
    }),
    defineField({
      name: "faqs",
      title: "常见问题 (FAQ)",
      type: "array",
      description:
        "与本文相关的常见问题（引用 faq 文档），用于在页面输出 FAQPage 结构化数据。",
      of: [{ type: "reference", to: [{ type: "faq" }] }],
    }),
    defineField({
      name: "publishedAt",
      title: "发布时间",
      type: "datetime",
      description: "文章发布日期与时间，用于排序与展示。",
      validation: (rule) => rule.required().error("文章必须有发布时间。"),
    }),
    defineField({
      name: "seo",
      title: "SEO 设置",
      type: "seo",
    }),
  ],
  orderings: [
    {
      title: "发布时间（新→旧）",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      publishedAt: "publishedAt",
      media: "heroImage",
    },
    prepare({ title, category, publishedAt, media }) {
      const date = publishedAt
        ? new Date(publishedAt).toISOString().slice(0, 10)
        : null;
      const tags = [category, date].filter(Boolean).join(" · ");
      return { title, subtitle: tags || undefined, media };
    },
  },
});
