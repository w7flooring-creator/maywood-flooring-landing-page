import { defineType, defineField } from "sanity";

/**
 * Gallery Image（图库图片）—— Gallery 页（路由 /gallery）与首页 GalleryFeed
 * 区块的单张展示图片（成品实景、展厅、项目等暖色调影像）。
 *
 * 字段对应 AGENTS.md「Document types」中的 `galleryImage`。
 * 图片本身必填且带 alt（无障碍 + SEO，见 AGENTS.md「A11y」「SEO」）。
 *
 * 面向非技术编辑：上传图片并填写 alt；可选填标题、说明与关联产品。
 */
export const galleryImage = defineType({
  name: "galleryImage",
  title: "图库图片 (Gallery Image)",
  type: "document",
  description:
    "Gallery 页与首页 GalleryFeed 的单张展示图片（成品实景 / 展厅 / 项目）。",
  fields: [
    defineField({
      name: "image",
      title: "图片",
      type: "image",
      description:
        "展示图片。请上传暖色调室内 / 木纹 / 项目影像，并填写有意义的替代文字（alt）。",
      options: { hotspot: true },
      validation: (rule) => rule.required().error("图库条目必须有图片。"),
      fields: [
        defineField({
          name: "alt",
          title: "替代文字 (Alt)",
          type: "string",
          description:
            "图片的文字描述，供读屏软件与搜索引擎使用（无障碍 + SEO）。",
          validation: (rule) =>
            rule.required().error("图库图片必须有替代文字（alt）。"),
        }),
      ],
    }),
    defineField({
      name: "title",
      title: "标题",
      type: "string",
      description: "可选的图片标题 / 说明（如项目名称）。",
    }),
    defineField({
      name: "caption",
      title: "说明文字",
      type: "text",
      rows: 2,
      description: "可选的图片说明（澳洲拼写）。",
    }),
    defineField({
      name: "relatedProduct",
      title: "关联产品",
      type: "reference",
      to: [{ type: "product" }],
      description: "图中展示的产品（引用 product 文档，可选），用于交叉链接。",
    }),
    defineField({
      name: "sortOrder",
      title: "排序",
      type: "number",
      description: "数字越小越靠前，控制图库中的展示顺序。",
      initialValue: 0,
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
    select: { title: "title", alt: "image.alt", media: "image" },
    prepare({ title, alt, media }) {
      return { title: title || alt || "（未命名图片）", media };
    },
  },
});
