import { defineType, defineField } from "sanity";

/**
 * Site Settings（站点设置）—— 全站 NAP（Name / Address / Phone）与品牌信息的
 * 单一来源（见 AGENTS.md「关键业务事实」：NAP 必须全站一致）。SeoHead、
 * LocalBusiness 结构化数据、Footer、Contact 等都从这里取值。
 *
 * 单例（singleton）：编辑只维护一份。下面用 __experimental_actions 关掉
 * create / delete / duplicate，仅保留 update / publish，避免出现第二份。
 * （Sanity 的 hidden create 入口仍由 desk structure 控制；此处先从动作层约束。）
 *
 * 字段对应 AGENTS.md「Document types」中的 `siteSettings`，承载全局 NAP / 社媒 /
 * 营业时间 / 默认 SEO 等。Phase 1 这些值由 src/lib/site.ts 硬编码；#11 接入本类型后切换数据源。
 */
export const siteSettings = defineType({
  name: "siteSettings",
  title: "站点设置 (Site Settings)",
  type: "document",
  description: "全站 NAP、社媒、营业时间与默认 SEO 的单一来源（只维护一份）。",
  // 单例：禁止新建 / 删除 / 复制，只能编辑现有那一份。
  __experimental_actions: ["update", "publish"],
  groups: [
    { name: "brand", title: "品牌" },
    { name: "contact", title: "联系方式 (NAP)", default: true },
    { name: "hours", title: "营业时间" },
    { name: "social", title: "社媒" },
    { name: "seo", title: "默认 SEO" },
  ],
  fields: [
    // ——————————————————————————— 品牌 ———————————————————————————
    defineField({
      name: "siteName",
      title: "站点名称",
      type: "string",
      group: "brand",
      description:
        "品牌 / 站点名称，如「Maywood Flooring」，用于标题与结构化数据。",
      validation: (rule) => rule.required().error("站点名称必填。"),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      group: "brand",
      description: "站点 logo（Header / 结构化数据用）。请填写 alt。",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "替代文字 (Alt)",
          type: "string",
          description: "logo 的文字描述，供读屏软件使用。",
        }),
      ],
    }),

    // ——————————————————————————— 联系方式（NAP）———————————————————————————
    defineField({
      name: "phone",
      title: "电话",
      type: "string",
      group: "contact",
      description: "主联系电话，全站一致（如 03 8753 5522）。",
      validation: (rule) => rule.required().error("电话必填（NAP 全站一致）。"),
    }),
    defineField({
      name: "email",
      title: "邮箱",
      type: "string",
      group: "contact",
      description: "主联系邮箱（如 sales@maywoodflooring.com.au）。",
      validation: (rule) =>
        rule.required().email().error("请填写有效邮箱（NAP 全站一致）。"),
    }),
    defineField({
      name: "whatsappUrl",
      title: "WhatsApp 链接",
      type: "url",
      group: "contact",
      description:
        "WhatsApp 链接，国际格式（如 https://wa.me/61422709709）。供 WhatsAppCta 使用。",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "address",
      title: "地址",
      type: "object",
      group: "contact",
      description: "营业地址，拆字段以便 schema.org PostalAddress 复用。",
      options: { collapsible: false },
      fields: [
        defineField({
          name: "street",
          title: "街道",
          type: "string",
          description: "如「49-51 Keysborough Ave」。",
        }),
        defineField({
          name: "locality",
          title: "城市 / 郊区",
          type: "string",
          description: "如「Keysborough」。",
        }),
        defineField({
          name: "region",
          title: "州 / 领地",
          type: "string",
          description: "如「VIC」。",
        }),
        defineField({
          name: "postalCode",
          title: "邮编",
          type: "string",
          description: "如「3173」。",
        }),
        defineField({
          name: "country",
          title: "国家码",
          type: "string",
          description: "ISO 3166-1 alpha-2 国家码，如「AU」。",
          initialValue: "AU",
        }),
      ],
    }),
    defineField({
      name: "areaServed",
      title: "服务地理区域",
      type: "array",
      group: "contact",
      description:
        "LocalBusiness areaServed 与本地 SEO 用（如 Melbourne / Victoria / Australia）。",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),

    // ——————————————————————————— 营业时间 ———————————————————————————
    defineField({
      name: "openingHours",
      title: "营业时间",
      type: "array",
      group: "hours",
      description:
        "按天 / 时段列出营业时间，供 Contact 页与 LocalBusiness 使用。",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "days",
              title: "星期",
              type: "string",
              description:
                "适用的星期或区间，如「Monday – Friday」「Saturday」。",
            }),
            defineField({
              name: "hours",
              title: "时间",
              type: "string",
              description: "营业时段，如「9:00am – 5:00pm」或「Closed」。",
            }),
          ],
          preview: {
            select: { title: "days", subtitle: "hours" },
          },
        },
      ],
    }),

    // ——————————————————————————— 社媒 ———————————————————————————
    defineField({
      name: "socialLinks",
      title: "社媒链接",
      type: "array",
      group: "social",
      description: "页脚 / 社媒栏的账号链接（SocialLinks 单一来源）。",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "platform",
              title: "平台",
              type: "string",
              description: "平台名，也用作图标标识 / aria-label。",
              options: {
                list: [
                  { title: "Instagram", value: "instagram" },
                  { title: "Facebook", value: "facebook" },
                  { title: "YouTube", value: "youtube" },
                  { title: "LinkedIn", value: "linkedin" },
                ],
              },
            }),
            defineField({
              name: "url",
              title: "链接",
              type: "url",
              description: "账号主页绝对 URL。",
              validation: (rule) => rule.uri({ scheme: ["https"] }),
            }),
          ],
          preview: { select: { title: "platform", subtitle: "url" } },
        },
      ],
    }),

    // ——————————————————————————— 默认 SEO ———————————————————————————
    defineField({
      name: "defaultSeo",
      title: "默认 SEO",
      type: "seo",
      group: "seo",
      description:
        "站点级 SEO 默认值。页面未单独填写 SEO 字段时回落到这里（如默认 OG 图、默认描述）。",
    }),
  ],
  preview: {
    prepare() {
      return { title: "站点设置 (Site Settings)" };
    },
  },
});
