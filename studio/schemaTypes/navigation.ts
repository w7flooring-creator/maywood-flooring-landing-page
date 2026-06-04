import { defineType, defineField } from "sanity";

/**
 * Navigation（导航）—— 主导航与页脚菜单的单一来源（驱动 PrimaryNav / MobileNav /
 * SiteFooter）。Phase 1 这些值由 src/lib/site.ts 硬编码；#11 接入本类型后切换数据源。
 *
 * 单例（singleton）：编辑只维护一份。下面用 __experimental_actions 关掉
 * create / delete / duplicate，仅保留 update / publish，避免出现第二份。
 *
 * 字段对应 AGENTS.md「Document types」中的 `navigation`，承载全局菜单结构。
 * 每个菜单项是「label + href」（href 为站内相对路径，保留 legacy URL，见 ADR-0001）。
 */

// 单个菜单项：label + 站内相对路径。支持一层子菜单（如「Products」下的分类）。
const navItem = {
  type: "object" as const,
  fields: [
    defineField({
      name: "label",
      title: "文案",
      type: "string",
      description: "菜单显示文案（澳洲拼写）。",
      validation: (rule) => rule.required().error("菜单项必须有文案。"),
    }),
    defineField({
      name: "href",
      title: "链接",
      type: "string",
      description:
        "站内相对路径，以 / 开头（保留 legacy URL，见 ADR-0001），如 /category/engineered-flooring。",
      validation: (rule) =>
        rule
          .required()
          .error("菜单项必须有链接。")
          .custom((value) =>
            !value || value.startsWith("/")
              ? true
              : "链接应为站内相对路径（以 / 开头）。"
          ),
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "href" },
  },
};

export const navigation = defineType({
  name: "navigation",
  title: "导航 (Navigation)",
  type: "document",
  description: "主导航与页脚菜单的单一来源（只维护一份）。",
  // 单例：禁止新建 / 删除 / 复制，只能编辑现有那一份。
  __experimental_actions: ["update", "publish"],
  fields: [
    defineField({
      name: "primaryNav",
      title: "主导航",
      type: "array",
      description:
        "Header 桌面导航与移动端抽屉共用的主菜单。可为某项添加一层子菜单（如 Products 下的分类）。",
      of: [
        {
          type: "object",
          fields: [
            ...navItem.fields,
            defineField({
              name: "children",
              title: "子菜单",
              type: "array",
              description: "可选的下拉子项（如分类）。留空则为普通链接。",
              of: [navItem],
            }),
          ],
          preview: navItem.preview,
        },
      ],
    }),
    defineField({
      name: "footerNav",
      title: "页脚菜单",
      type: "array",
      description: "页脚的链接列表（如 quick links / legal）。",
      of: [navItem],
    }),
    defineField({
      name: "sampleRequestCta",
      title: "Sample Request CTA",
      type: "object",
      description:
        "Header 上的「Request a Sample」按钮。Phase 1 指向 Contact（见已敲定决策）。",
      fields: navItem.fields,
    }),
  ],
  preview: {
    prepare() {
      return { title: "导航 (Navigation)" };
    },
  },
});
