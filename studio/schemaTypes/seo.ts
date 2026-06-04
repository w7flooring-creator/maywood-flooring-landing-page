import { defineType, defineField } from "sanity";

/**
 * 可复用 SEO 对象 —— 嵌入各 document（productCategory / productCollection /
 * product / page ...）的 `seo` 字段。
 *
 * 字段对应 AGENTS.md「`seo` object」：
 *   metaTitle、metaDescription、canonicalUrl、ogImage、noIndex、structuredDataType
 *
 * 面向非技术编辑：每个字段给出清晰 label/description，重要字段加长度提示。
 * SEO 是本站核心目标（见 AGENTS.md「SEO」），故对 metaTitle/metaDescription 做
 * 软性长度校验（warning，不阻断发布），引导编辑写出搜索友好的文案。
 */
export const seo = defineType({
  name: "seo",
  title: "SEO 设置",
  type: "object",
  description:
    "搜索引擎与社交分享设置。留空则由页面自动回落到站点级默认值。",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta 标题",
      type: "string",
      description:
        "浏览器标签与搜索结果中显示的标题。建议 50–60 字符；留空则用页面标题。",
      validation: (rule) =>
        rule
          .max(70)
          .warning("Meta 标题过长（建议 ≤ 60 字符），搜索结果可能被截断。"),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta 描述",
      type: "text",
      rows: 3,
      description:
        "搜索结果中标题下方的摘要。建议 150–160 字符，自然包含地区/产品关键词（澳洲拼写）。",
      validation: (rule) =>
        rule
          .max(180)
          .warning("Meta 描述过长（建议 ≤ 160 字符），搜索结果可能被截断。"),
    }),
    defineField({
      name: "canonicalUrl",
      title: "Canonical URL",
      type: "url",
      description:
        "本页的权威 URL。仅在本页与另一页内容近重复、需指向主版本时填写（见 ADR-0001）。一般留空。",
      validation: (rule) =>
        rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "ogImage",
      title: "社交分享图（Open Graph）",
      type: "image",
      description:
        "分享到社交平台时显示的预览图。建议 1200×630。留空则用站点默认图。",
      options: { hotspot: true },
    }),
    defineField({
      name: "noIndex",
      title: "禁止收录（noindex）",
      type: "boolean",
      description:
        "开启后告诉搜索引擎不要收录本页。默认关闭——绝大多数页面都应被收录。",
      initialValue: false,
    }),
    defineField({
      name: "structuredDataType",
      title: "结构化数据类型",
      type: "string",
      description:
        "本页要输出的 schema.org 结构化数据类型。一般无需手动设置，由页面模板自动选择。",
      options: {
        list: [
          { title: "（自动 / 不指定）", value: "" },
          { title: "LocalBusiness（本地商家）", value: "LocalBusiness" },
          { title: "Product（产品）", value: "Product" },
          { title: "BreadcrumbList（面包屑）", value: "BreadcrumbList" },
          { title: "FAQPage（常见问题）", value: "FAQPage" },
          { title: "Article（文章）", value: "Article" },
          { title: "BlogPosting（博客）", value: "BlogPosting" },
        ],
      },
    }),
  ],
});
