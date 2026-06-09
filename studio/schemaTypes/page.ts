import { defineType, defineField } from "sanity";

/**
 * Page（通用内容页）—— 用于不属于产品 / 案例 / 博客等专用类型的常规页面，
 * 如 About Us、Sustainability 等（路由见 AGENTS.md「路由」）。
 *
 * 字段对应 AGENTS.md「Document types」中的 `page`：通用富文本页面 + SEO。
 * body 用 Portable Text（block 数组）承载编辑可自由排版的正文。
 *
 * 面向非技术编辑：title/slug 必填并校验；正文用所见即所得富文本。
 * slug 沿用 Wix 历史值，请勿擅自修改（见 ADR-0001）。
 */
export const page = defineType({
  name: "page",
  title: "内容页 (Page)",
  type: "document",
  description:
    "通用内容页（如 About Us / Sustainability）。含标题、URL、正文与 SEO。",
  fields: [
    defineField({
      name: "title",
      title: "页面标题",
      type: "string",
      description: "页面的展示标题，也是正文区的 H1。",
      validation: (rule) => rule.required().error("页面必须有标题。"),
    }),
    defineField({
      name: "slug",
      title: "URL Slug",
      type: "slug",
      description:
        "页面 URL 末段，用于 /<slug>（如 about-us）。沿用 Wix 历史值，请勿擅自修改（见 ADR-0001）。",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required().error("页面必须有 URL slug。"),
    }),
    defineField({
      name: "legacyPath",
      title: "历史路径 (Legacy Path)",
      type: "string",
      description:
        "对应的旧 Wix URL 路径（如 /about-us），用于平迁保留链接与生成 redirect。",
    }),
    defineField({
      name: "heroImage",
      title: "Hero 主图",
      type: "image",
      description:
        "页面顶部宽幅主图（可选）。请填写有意义的替代文字（alt）以利无障碍与 SEO。",
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
      name: "sectionImages",
      title: "分区配图",
      type: "array",
      description:
        "可选。按出现顺序为页面的图文分栏提供配图（如 About「Your Trusted Flooring Partner」、Sustainability 三大支柱）。留空则该区块降级为纯文字。",
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
      name: "body",
      title: "正文",
      type: "array",
      description:
        "页面主体内容。支持标题、段落、列表、图片与链接（所见即所得，澳洲拼写）。",
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
      name: "seo",
      title: "SEO 设置",
      type: "seo",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "slug.current", media: "heroImage" },
  },
});
