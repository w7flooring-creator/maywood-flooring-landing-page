import { defineType, defineField } from "sanity";

/**
 * Case Study（案例）—— 一个已完成的项目展示，关联所用产品（路由 /projects/<slug>）。
 *
 * 字段对应 AGENTS.md「`caseStudy`」全清单：
 *   title slug location projectType productsUsed summary body images seo
 * body 用 Portable Text（block 数组）；输出 Article 结构化数据（见 AGENTS.md「SEO」）。
 *
 * 面向非技术编辑：title/slug 必填；productsUsed 引用 product 文档复用产品信息。
 */
export const caseStudy = defineType({
  name: "caseStudy",
  title: "案例 (Case Study)",
  type: "document",
  description:
    "已完成项目的展示，含地点、类型、所用产品、正文与图片（路由 /projects/<slug>）。",
  fields: [
    defineField({
      name: "title",
      title: "案例标题",
      type: "string",
      description: "项目的展示标题，也是详情页 H1。",
      validation: (rule) => rule.required().error("案例必须有标题。"),
    }),
    defineField({
      name: "slug",
      title: "URL Slug",
      type: "slug",
      description:
        "页面 URL 末段，用于 /projects/<slug>。沿用历史值，请勿擅自修改（见 ADR-0001）。",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required().error("案例必须有 URL slug。"),
    }),
    defineField({
      name: "location",
      title: "项目地点",
      type: "string",
      description:
        "项目所在地（如「Brighton, Melbourne」）。有助于本地 SEO（自然提及地区）。",
    }),
    defineField({
      name: "projectType",
      title: "项目类型",
      type: "string",
      description:
        "项目类别，如「Residential」「Commercial」「Renovation」，便于归类与筛选。",
    }),
    defineField({
      name: "productsUsed",
      title: "所用产品",
      type: "array",
      description:
        "本案例中使用的产品（引用 product 文档），用于交叉链接与推荐。",
      of: [{ type: "reference", to: [{ type: "product" }] }],
    }),
    defineField({
      name: "summary",
      title: "摘要",
      type: "text",
      rows: 3,
      description: "案例列表卡片与详情页开头的一两句话摘要（澳洲拼写）。",
    }),
    defineField({
      name: "body",
      title: "正文",
      type: "array",
      description: "案例详情正文，支持标题、段落、列表与图片（澳洲拼写）。",
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
      name: "images",
      title: "项目图片",
      type: "array",
      description:
        "案例图库（成品实景等）。每张请填写有意义的替代文字（alt）。",
      of: [
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
      name: "seo",
      title: "SEO 设置",
      type: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      location: "location",
      projectType: "projectType",
      media: "images.0",
    },
    prepare({ title, location, projectType, media }) {
      const tags = [projectType, location].filter(Boolean).join(" · ");
      return { title, subtitle: tags || undefined, media };
    },
  },
});
