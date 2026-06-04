import { defineType, defineField } from "sanity";

/**
 * SEO Settings（站点级 SEO 设置）—— 站点全局的 SEO / 搜索控制（区别于嵌入各文档的
 * 可复用 `seo` object：后者是「单页」设置，本类型是「全站」设置）。
 *
 * 字段对应 AGENTS.md「Document types」中的 `seoSettings`，承载默认元信息、
 * 默认 OG 图、robots / 站点级 noindex、搜索引擎验证码等全站项（见 AGENTS.md「SEO」）。
 *
 * 单例（singleton）：编辑只维护一份。下面用 __experimental_actions 关掉
 * create / delete / duplicate，仅保留 update / publish，避免出现第二份。
 *
 * 注：单页 SEO 优先级高于本类型；本类型提供站点级回落与全站开关。
 */
export const seoSettings = defineType({
  name: "seoSettings",
  title: "SEO 设置（站点级）(SEO Settings)",
  type: "document",
  description:
    "站点级 SEO 默认值与搜索控制（默认标题模板 / 描述 / OG 图 / robots / 验证码）。只维护一份。",
  // 单例：禁止新建 / 删除 / 复制，只能编辑现有那一份。
  __experimental_actions: ["update", "publish"],
  fields: [
    defineField({
      name: "titleTemplate",
      title: "标题模板",
      type: "string",
      description:
        "页面标题模板，用 %s 代表页面自身标题，如「%s | Maywood Flooring」。",
      validation: (rule) =>
        rule.custom((value) =>
          !value || value.includes("%s")
            ? true
            : "模板应包含 %s 占位符（代表页面标题）。"
        ),
    }),
    defineField({
      name: "defaultMetaTitle",
      title: "默认 Meta 标题",
      type: "string",
      description:
        "页面未单独设置标题时的站点级回落（如首页 / 无标题页）。建议 ≤ 60 字符。",
      validation: (rule) =>
        rule
          .max(70)
          .warning("Meta 标题过长（建议 ≤ 60 字符），搜索结果可能被截断。"),
    }),
    defineField({
      name: "defaultMetaDescription",
      title: "默认 Meta 描述",
      type: "text",
      rows: 3,
      description:
        "页面未单独设置描述时的站点级回落。建议 150–160 字符，自然包含地区 / 产品关键词（澳洲拼写）。",
      validation: (rule) =>
        rule
          .max(180)
          .warning("Meta 描述过长（建议 ≤ 160 字符），搜索结果可能被截断。"),
    }),
    defineField({
      name: "defaultOgImage",
      title: "默认社交分享图（Open Graph）",
      type: "image",
      description: "页面未单独设置 OG 图时的站点级回落。建议 1200×630。",
      options: { hotspot: true },
    }),
    defineField({
      name: "siteNoIndex",
      title: "全站禁止收录（noindex）",
      type: "boolean",
      description:
        "⚠️ 危险开关：开启后告诉搜索引擎不要收录整站（仅上线前 / staging 用）。生产务必关闭。",
      initialValue: false,
    }),
    defineField({
      name: "googleSiteVerification",
      title: "Google Search Console 验证码",
      type: "string",
      description:
        "Google Search Console 的 meta 验证码（content 值，不含标签）。供 SeoHead 输出验证 meta。",
    }),
    defineField({
      name: "robotsTxt",
      title: "robots.txt 附加规则",
      type: "text",
      rows: 4,
      description:
        "可选：追加到自动生成的 robots.txt 的自定义规则。一般留空（见 AGENTS.md「必须产出」robots.txt）。",
    }),
  ],
  preview: {
    prepare() {
      return { title: "SEO 设置（站点级）(SEO Settings)" };
    },
  },
});
