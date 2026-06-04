import type { SchemaTypeDefinition } from "sanity";
import { seo } from "./seo";
import { productCategory } from "./productCategory";
import { productCollection } from "./productCollection";

// 其余 document schema 在后续 issue 中逐个实现。
// 目标 document types 见 AGENTS.md「Sanity CMS 模型」：
// siteSettings, navigation, homePage, page, product, productCategory,
// productCollection, caseStudy, blogPost, resource, faq, locationPage,
// service, galleryImage, redirect, seoSettings
export const schemaTypes: SchemaTypeDefinition[] = [
  // 可复用 object
  seo,
  // 分类法 document（issue #7）
  productCategory,
  productCollection,
];
