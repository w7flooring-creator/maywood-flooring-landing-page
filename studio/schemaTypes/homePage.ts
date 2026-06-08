import { defineType, defineField } from "sanity";

/**
 * Home Page（首页）—— 首页专属图片的单例文档（固定 _id="homePage"）。
 *
 * 首页大部分文案是静态的（src/lib/home.ts / home-narrative.ts，单一来源）；
 * 但 hero / 专业伙伴 / Accessories 入口的**配图**需非技术编辑在 Studio 管理，
 * 且生产不热链 Wix（图入 Sanity，前端走 Sanity CDN）。本单例承载这几张首页专属图。
 *
 * 招牌系列卡与产品入口卡的图分别取自 productCollection.heroImage 与
 * productCategory.heroImage（各自单一来源），不在此重复。
 */
export const homePage = defineType({
  name: "homePage",
  title: "首页 (Home Page)",
  type: "document",
  description: "首页专属配图（hero / 专业伙伴 / Accessories 入口）。单例。",
  fields: [
    defineField({
      name: "heroImage",
      title: "Hero 主图",
      type: "image",
      description: "首页顶部大幅室内生活场景图（首屏 LCP）。",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "替代文字 (Alt)",
          type: "string",
          description: "图片文字描述（无障碍 + SEO，澳洲拼写）。",
        }),
      ],
    }),
    defineField({
      name: "partnerImage",
      title: "专业伙伴区配图",
      type: "image",
      description:
        "「Your Professional Partner」区块配图（仓库 / 展厅 / 场地）。",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "替代文字 (Alt)", type: "string" }),
      ],
    }),
    defineField({
      name: "accessoriesImage",
      title: "Accessories 入口配图",
      type: "image",
      description: "产品入口「Accessories」卡片配图（trims / scotia 等）。",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "替代文字 (Alt)", type: "string" }),
      ],
    }),
    defineField({
      name: "sustainabilityImage",
      title: "Sustainability 区块配图",
      type: "image",
      description:
        "首页 Sustainability 区块配图（responsibly managed forests / 木材原料）。",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "替代文字 (Alt)", type: "string" }),
      ],
    }),
  ],
  preview: {
    select: { media: "heroImage" },
    prepare({ media }) {
      return { title: "首页配图", media };
    },
  },
});
