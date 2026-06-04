import { defineType, defineField } from "sanity";

/**
 * Location Page（地区落地页）—— 面向特定城市 / 地区的本地 SEO 落地页
 * （见 AGENTS.md「澳洲 SEO」：location landing 预留但不做低质重复内容）。
 *
 * 字段对应 AGENTS.md「`locationPage`」全清单：
 *   title slug city state serviceArea intro body relatedProducts
 *   relatedCaseStudies faqs seo
 * body 用 Portable Text（block 数组）。
 *
 * 面向非技术编辑：title/slug/city 必填；关联内容通过引用复用既有文档。
 */
export const locationPage = defineType({
  name: "locationPage",
  title: "地区落地页 (Location Page)",
  type: "document",
  description:
    "面向特定城市 / 地区的本地 SEO 落地页，含服务范围、正文、相关产品 / 案例与 FAQ。",
  fields: [
    defineField({
      name: "title",
      title: "页面标题",
      type: "string",
      description:
        "落地页的展示标题，也是 H1（如「Timber Flooring in Brighton」）。",
      validation: (rule) => rule.required().error("落地页必须有标题。"),
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
      validation: (rule) => rule.required().error("落地页必须有 URL slug。"),
    }),
    defineField({
      name: "city",
      title: "城市",
      type: "string",
      description: "落地页针对的城市 / 郊区（如「Brighton」），用于本地 SEO。",
      validation: (rule) => rule.required().error("落地页必须指定城市。"),
    }),
    defineField({
      name: "state",
      title: "州 / 领地",
      type: "string",
      description: "所属州/领地，澳洲多为 VIC（默认）。",
      initialValue: "VIC",
    }),
    defineField({
      name: "serviceArea",
      title: "服务范围",
      type: "array",
      description:
        "该落地页覆盖的周边区域列表（如相邻郊区），用于内容与 LocalBusiness areaServed。",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "intro",
      title: "引言",
      type: "text",
      rows: 3,
      description:
        "页面开头的引导文案，自然提及城市 / 地区与产品（澳洲拼写，避免低质重复）。",
    }),
    defineField({
      name: "body",
      title: "正文",
      type: "array",
      description: "落地页正文，支持标题、段落、列表与图片（澳洲拼写）。",
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
      name: "relatedProducts",
      title: "相关产品",
      type: "array",
      description: "在本地区主推的产品（引用 product 文档），用于交叉链接。",
      of: [{ type: "reference", to: [{ type: "product" }] }],
    }),
    defineField({
      name: "relatedCaseStudies",
      title: "相关案例",
      type: "array",
      description:
        "本地区的相关项目案例（引用 caseStudy 文档），增强本地可信度。",
      of: [{ type: "reference", to: [{ type: "caseStudy" }] }],
    }),
    defineField({
      name: "faqs",
      title: "常见问题 (FAQ)",
      type: "array",
      description:
        "本地区相关的常见问题（引用 faq 文档），用于在页面输出 FAQPage 结构化数据。",
      of: [{ type: "reference", to: [{ type: "faq" }] }],
    }),
    defineField({
      name: "seo",
      title: "SEO 设置",
      type: "seo",
    }),
  ],
  preview: {
    select: { title: "title", city: "city", state: "state" },
    prepare({ title, city, state }) {
      const tags = [city, state].filter(Boolean).join(", ");
      return { title, subtitle: tags || undefined };
    },
  },
});
