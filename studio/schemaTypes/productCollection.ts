import { defineType, defineField } from "sanity";

/**
 * Collection（系列）—— 隶属于恰好一个 Category 的品牌产品系列，共九个
 * （术语见 CONTEXT.md）。是 Category 页 "Browse by" 侧栏的分组单位。
 *
 * `isSignature` 标记 Signature Collection（招牌系列）：被首页/主导航重点推广、
 * 并拥有独立营销落地页 /<slug> 的 Collection。目前是 Engineered 下的四个
 * （PureGrain / Bushland / Bellavale / Manor）。
 *
 * Wix 旧「子分类」概念已取消，统一并入 Collection（见 AGENTS.md 已敲定决策）。
 */
export const productCollection = defineType({
  name: "productCollection",
  title: "系列 (Collection)",
  type: "document",
  description: "隶属于某个分类的品牌产品系列（如 Engineered 下的 Bushland）。",
  fields: [
    defineField({
      name: "title",
      title: "系列名称",
      type: "string",
      description: "在分类侧栏与系列页中显示的名称，如「Bushland」。",
      validation: (rule) => rule.required().error("系列必须有名称。"),
    }),
    defineField({
      name: "slug",
      title: "URL Slug",
      type: "slug",
      description:
        "页面 URL 末段。store 视图为 /category/<slug>；招牌系列另有营销落地页 /<slug>。沿用 Wix 历史值，请勿擅自修改（见 ADR-0001）。",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required().error("系列必须有 URL slug。"),
    }),
    defineField({
      name: "category",
      title: "所属分类",
      type: "reference",
      to: [{ type: "productCategory" }],
      description:
        "本系列归属的分类（每个系列恰好属于一个分类）。Engineered / Laminate / Hybrid 之一。",
      validation: (rule) => rule.required().error("系列必须归属一个分类。"),
    }),
    defineField({
      name: "isSignature",
      title: "招牌系列 (Signature Collection)",
      type: "boolean",
      description:
        "开启表示这是被首页/主导航重点推广、并拥有独立营销落地页 /<slug> 的招牌系列（目前仅 Engineered 下的 PureGrain / Bushland / Bellavale / Manor）。",
      initialValue: false,
    }),
    defineField({
      name: "tagline",
      title: "系列标语",
      type: "string",
      description:
        "一句话品牌标语，显示在首页招牌系列卡与落地页 hero 标题下方，如「The Essence of the Australian Landscape」。留空则不显示。",
    }),
    defineField({
      name: "description",
      title: "系列描述",
      type: "text",
      rows: 6,
      description:
        "系列的 editorial 介绍正文（多段以空行分隔），用于落地页叙事区与分类侧栏（澳洲拼写）。",
    }),
    defineField({
      name: "heroImage",
      title: "Hero 主图",
      type: "image",
      description:
        "系列页 / 营销落地页顶部主图。请填写有意义的替代文字（alt）以利无障碍与 SEO。",
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
      name: "sortOrder",
      title: "排序",
      type: "number",
      description: "数字越小越靠前，控制系列在分类侧栏/列表中的展示顺序。",
      initialValue: 0,
    }),
    defineField({
      name: "seo",
      title: "SEO 设置",
      type: "seo",
    }),
  ],
  orderings: [
    {
      title: "排序（升序）",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      categoryTitle: "category.title",
      isSignature: "isSignature",
    },
    prepare({ title, categoryTitle, isSignature }) {
      const tags = [categoryTitle, isSignature ? "招牌系列" : null]
        .filter(Boolean)
        .join(" · ");
      return { title, subtitle: tags || undefined };
    },
  },
});
