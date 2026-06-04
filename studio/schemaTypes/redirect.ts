import { defineType, defineField } from "sanity";

/**
 * Redirect（重定向）—— 旧 URL → 新 URL 的映射，用于平迁阶段保留 / 修复链接
 * （见 AGENTS.md「必须产出」：旧 Wix URL 的 redirect map）。
 *
 * 字段对应 AGENTS.md「Document types」中的 `redirect`。
 * Phase 1 多数 legacy URL 原样保留（ADR-0001），本类型主要用于例外情形，
 * 如 /booking-calendar/* 交易 funnel 301 到对应 service 页（见已敲定决策）。
 *
 * 面向非技术编辑：from/to 必填；from 为站内路径（以 / 开头），to 可为站内路径或绝对 URL。
 */
export const redirect = defineType({
  name: "redirect",
  title: "重定向 (Redirect)",
  type: "document",
  description:
    "旧 URL → 新 URL 的映射，用于平迁保留 / 修复链接（如 /booking-calendar/* → service 页）。",
  fields: [
    defineField({
      name: "from",
      title: "源路径 (From)",
      type: "string",
      description:
        "要被重定向的旧路径，以 / 开头（如 /booking-calendar/sample-viewing）。同一源路径只应存在一条。",
      validation: (rule) =>
        rule
          .required()
          .error("必须填写源路径。")
          .custom((value) =>
            !value || value.startsWith("/")
              ? true
              : "源路径必须以 / 开头（站内相对路径）。"
          ),
    }),
    defineField({
      name: "to",
      title: "目标 (To)",
      type: "string",
      description:
        "重定向到的目标，站内路径（以 / 开头，如 /service-page/sample-viewing）或完整绝对 URL。",
      validation: (rule) =>
        rule
          .required()
          .error("必须填写目标路径。")
          .custom((value) =>
            !value || value.startsWith("/") || /^https?:\/\//i.test(value)
              ? true
              : "目标必须是站内路径（以 / 开头）或完整 http(s) URL。"
          ),
    }),
    defineField({
      name: "permanent",
      title: "永久重定向 (301)",
      type: "boolean",
      description:
        "开启 = 301 永久重定向（默认，传递 SEO 权重）；关闭 = 302 临时重定向。",
      initialValue: true,
    }),
    defineField({
      name: "note",
      title: "备注",
      type: "string",
      description:
        "可选说明，记录为何需要这条重定向（如对应哪个 ADR / 决策）。",
    }),
  ],
  orderings: [
    {
      title: "源路径（A→Z）",
      name: "fromAsc",
      by: [{ field: "from", direction: "asc" }],
    },
  ],
  preview: {
    select: { from: "from", to: "to", permanent: "permanent" },
    prepare({ from, to, permanent }) {
      return {
        title: from,
        subtitle: `${permanent === false ? "302" : "301"} → ${to ?? ""}`,
      };
    },
  },
});
