import { defineType, defineField } from "sanity";

/**
 * Product（产品）—— 单个地板款式（如 Blackbutt、Spotted Gum），隶属于一个
 * Category 与一个 Collection（术语见 CONTEXT.md）。约 73 个产品，后续由 #10
 * 从 Wix Stores 导出 CSV 转入（本 schema 不含种子数据）。
 *
 * 字段对应 AGENTS.md「`product`」全清单：
 *   基本：title slug legacyPath status shortDescription
 *   分类：category collection
 *   规格：type dimensions packSize packWeight finish bevel profile grade
 *        environmentalRate（= 产品详情页的九个规格字段）
 *        + waterResistance material colourTone installationMethod applications
 *   媒体：mainImage gallery downloads
 *   关联：relatedProducts
 *   SEO：seo（复用 seo object）
 *
 * 面向非技术编辑：分 fieldset 收纳，每字段给清晰中文 label + description。
 * 校验：title / slug 必填；category 必填（产品必须归属一个分类）。
 */
export const product = defineType({
  name: "product",
  title: "产品 (Product)",
  type: "document",
  description:
    "单个地板款式（如 Blackbutt），含规格、所属分类/系列、图片与 SEO。",
  fieldsets: [
    {
      name: "basic",
      title: "基本信息",
      description: "产品名称、URL、状态与简介。",
    },
    {
      name: "taxonomy",
      title: "分类归属",
      description: "产品所属的分类（必填）与系列。",
    },
    {
      name: "specs",
      title: "规格参数",
      description:
        "产品详情页规格表字段（Type / Dimension / … / Environmental Rate）及补充规格。",
      options: { collapsible: true, collapsed: false },
    },
    {
      name: "media",
      title: "图片与下载",
      description: "主图、图库与可下载资料。",
      options: { collapsible: true, collapsed: false },
    },
    {
      name: "related",
      title: "相关产品",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    // ——————————————————————————— 基本信息 ———————————————————————————
    defineField({
      name: "title",
      title: "产品名称",
      type: "string",
      fieldset: "basic",
      description: "产品的展示名称，如「Blackbutt」。也是详情页的 H1。",
      validation: (rule) => rule.required().error("产品必须有名称。"),
    }),
    defineField({
      name: "slug",
      title: "URL Slug",
      type: "slug",
      fieldset: "basic",
      description:
        "页面 URL 末段，用于 /product-page/<slug>。沿用 Wix 历史值，请勿擅自修改（见 ADR-0001）。",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required().error("产品必须有 URL slug。"),
    }),
    defineField({
      name: "legacyPath",
      title: "历史路径 (Legacy Path)",
      type: "string",
      fieldset: "basic",
      description:
        "对应的旧 Wix URL 路径（如 /product-page/blackbutt），用于平迁保留链接与生成 redirect。",
    }),
    defineField({
      name: "status",
      title: "发布状态",
      type: "string",
      fieldset: "basic",
      description:
        "控制产品是否出页。仅「已发布」会出现在列表与详情路由；草稿 / 已下架不出页。",
      options: {
        list: [
          { title: "草稿 (Draft)", value: "draft" },
          { title: "已发布 (Published)", value: "published" },
          { title: "已下架 (Archived)", value: "archived" },
        ],
        layout: "radio",
      },
      initialValue: "draft",
    }),
    defineField({
      name: "shortDescription",
      title: "简短描述",
      type: "text",
      rows: 3,
      fieldset: "basic",
      description:
        "列表卡片与详情页摘要用的一两句话简介（澳洲拼写）。也可作为 SEO 描述的回落。",
    }),

    // ——————————————————————————— 分类归属 ———————————————————————————
    defineField({
      name: "category",
      title: "所属分类 (Category)",
      type: "reference",
      to: [{ type: "productCategory" }],
      fieldset: "taxonomy",
      description:
        "本产品归属的分类（Engineered / Laminate / Hybrid 之一）。每个产品恰好属于一个分类。",
      validation: (rule) => rule.required().error("产品必须归属一个分类。"),
    }),
    defineField({
      name: "collection",
      title: "所属系列 (Collection)",
      type: "reference",
      to: [{ type: "productCollection" }],
      fieldset: "taxonomy",
      description:
        "本产品归属的品牌系列（如 Bushland）。系列须与上面的分类一致；可留空。",
    }),

    // ——————————————————————————— 规格参数 ———————————————————————————
    // 下面九个是产品详情页规格表字段（AGENTS.md「产品详情」），按表中顺序排列。
    defineField({
      name: "type",
      title: "类型 (Type)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Type」，如「Engineered Oak」。",
    }),
    defineField({
      name: "dimensions",
      title: "尺寸 (Dimension)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Dimension」，如「1900 × 190 × 15mm」。",
    }),
    defineField({
      name: "packSize",
      title: "每包面积 (Pack Size)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Pack Size」，每包覆盖面积，如「2.166 m²」。",
    }),
    defineField({
      name: "packWeight",
      title: "每包重量 (Pack Weight)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Pack Weight」，如「28 kg」。",
    }),
    defineField({
      name: "finish",
      title: "表面处理 (Finish)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Finish」，如「Matt UV Lacquer」。",
    }),
    defineField({
      name: "surfaceCoating",
      title: "表面涂层 (Surface Coating)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Surface Coating」，如「UV Lacquer」。",
    }),
    defineField({
      name: "bevel",
      title: "倒角 (Bevel)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Bevel」，如「4-sided micro bevel」。",
    }),
    defineField({
      name: "profile",
      title: "拼接方式 (Profile)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Profile」，如「Click」或「Tongue & Groove」。",
    }),
    defineField({
      name: "grade",
      title: "等级 (Grade)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Grade」，木纹/外观等级，如「Natural」。",
    }),
    defineField({
      name: "environmentalRate",
      title: "环保等级 (Environmental Rate)",
      type: "string",
      fieldset: "specs",
      description: "规格表「Environmental Rate」，如「E0」「E1」。",
    }),
    // —— 以下为补充规格，用于筛选 / 内容，不一定进规格表 ——
    defineField({
      name: "waterResistance",
      title: "防水性能 (Water Resistance)",
      type: "string",
      fieldset: "specs",
      description:
        "防水/耐潮等级，如「72hr」「Waterproof」，主要用于 Laminate / Hybrid。",
    }),
    defineField({
      name: "material",
      title: "材质 (Material)",
      type: "string",
      fieldset: "specs",
      description: "基材/面层材质，如「Oak」「SPC」，供筛选与内容使用。",
    }),
    defineField({
      name: "colourTone",
      title: "色调 (Colour Tone)",
      type: "string",
      fieldset: "specs",
      description:
        "整体色调，如「Light」「Natural」「Dark」，供筛选使用（澳洲拼写 colour）。",
    }),
    defineField({
      name: "installationMethod",
      title: "安装方式 (Installation Method)",
      type: "string",
      fieldset: "specs",
      description: "安装方式，如「Floating」「Glue down」。",
    }),
    defineField({
      name: "applications",
      title: "适用场景 (Applications)",
      type: "array",
      of: [{ type: "string" }],
      fieldset: "specs",
      description:
        "适用空间/场景标签，如「Residential」「Commercial」「Wet areas」。",
      options: { layout: "tags" },
    }),

    // ——————————————————————————— 图片与下载 ———————————————————————————
    defineField({
      name: "mainImage",
      title: "主图 (Main Image)",
      type: "image",
      fieldset: "media",
      description:
        "详情页与列表卡片的主图。请填写有意义的替代文字（alt）以利无障碍与 SEO。",
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
      name: "gallery",
      title: "图库 (Gallery)",
      type: "array",
      fieldset: "media",
      description: "详情页附加图片（纹理特写、铺装实景等）。每张请填 alt。",
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
      name: "downloads",
      title: "下载资料 (Downloads)",
      type: "array",
      fieldset: "media",
      description: "可下载文件，如规格表 PDF、安装指南、保修说明。",
      of: [
        {
          type: "file",
          fields: [
            defineField({
              name: "title",
              title: "文件标题",
              type: "string",
              description: "下载链接显示的名称，如「Spec Sheet (PDF)」。",
            }),
          ],
        },
      ],
    }),

    // ——————————————————————————— 相关产品 ———————————————————————————
    defineField({
      name: "relatedProducts",
      title: "相关产品",
      type: "array",
      fieldset: "related",
      description: "详情页底部推荐的其他产品。一般选同系列或风格相近的款式。",
      of: [{ type: "reference", to: [{ type: "product" }] }],
    }),

    // ——————————————————————————— SEO ———————————————————————————
    defineField({
      name: "seo",
      title: "SEO 设置",
      type: "seo",
    }),
  ],
  orderings: [
    {
      title: "名称（A→Z）",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      status: "status",
      categoryTitle: "category.title",
      collectionTitle: "collection.title",
      media: "mainImage",
    },
    prepare({ title, status, categoryTitle, collectionTitle, media }) {
      const statusLabel =
        status === "published"
          ? null // 已发布是常态，不赘述
          : status === "archived"
            ? "已下架"
            : "草稿";
      const tags = [categoryTitle, collectionTitle, statusLabel]
        .filter(Boolean)
        .join(" · ");
      return { title, subtitle: tags || undefined, media };
    },
  },
});
