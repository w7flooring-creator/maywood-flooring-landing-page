import { defineType, defineField } from "sanity";

/**
 * Category（分类）—— 按构造/材质划分的顶层产品族，共三个：
 * Engineered / Laminate / Hybrid（术语见 CONTEXT.md）。
 *
 * 字段对应 AGENTS.md「`productCategory`」。本站 Category 是扁平的（无层级），
 * 故 `parent`/`children` 暂不建模——需要时再加。
 *
 * ⚠️ slug 故意保留 Wix 历史值，可能与展示名不符（见 ADR-0001）：
 *   solid-flooring → 展示 Laminate；sustainable-flooring → 展示 Hybrid。
 *   不要「顺手修正」slug，改动需走 Phase 2 + 301 + GSC 评估。
 */
export const productCategory = defineType({
  name: "productCategory",
  title: "分类 (Category)",
  type: "document",
  description:
    "顶层产品族，按材质/构造划分（Engineered / Laminate / Hybrid）。",
  fields: [
    defineField({
      name: "title",
      title: "分类名称",
      type: "string",
      description: "在分类页与导航中显示的名称，如「Engineered Flooring」。",
      validation: (rule) => rule.required().error("分类必须有名称。"),
    }),
    defineField({
      name: "slug",
      title: "URL Slug",
      type: "slug",
      description:
        "页面 URL 末段，用于 /category/<slug>。⚠️ 沿用 Wix 历史值，可能与名称不符（如 Laminate 的 slug 是 solid-flooring），请勿擅自修改（见 ADR-0001）。",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required().error("分类必须有 URL slug。"),
    }),
    defineField({
      name: "legacyPath",
      title: "历史路径 (Legacy Path)",
      type: "string",
      description:
        "对应的旧 Wix URL 路径（如 /category/solid-flooring），用于平迁保留链接与生成 redirect。",
    }),
    defineField({
      name: "description",
      title: "分类描述",
      type: "text",
      rows: 4,
      description:
        "分类页 hero 下方的介绍文案。请与页面实际材质相符（澳洲拼写；勿写错材质，见 ADR-0001 内容债）。",
    }),
    defineField({
      name: "heroImage",
      title: "Hero 主图",
      type: "image",
      description: "分类页顶部宽幅主图。请填写有意义的替代文字（alt）以利无障碍与 SEO。",
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
      description:
        "数字越小越靠前，控制导航与列表中的展示顺序（如 Engineered=1, Laminate=2, Hybrid=3）。",
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
    select: { title: "title", subtitle: "slug.current" },
  },
});
