import type { SchemaTypeDefinition } from "sanity";
import { seo } from "./seo";
import { productCategory } from "./productCategory";
import { productCollection } from "./productCollection";
import { product } from "./product";
import { page } from "./page";
import { caseStudy } from "./caseStudy";
import { blogPost } from "./blogPost";
import { resource } from "./resource";
import { faq } from "./faq";
import { locationPage } from "./locationPage";
import { galleryImage } from "./galleryImage";
import { redirect } from "./redirect";
import { siteSettings } from "./siteSettings";
import { navigation } from "./navigation";
import { seoSettings } from "./seoSettings";
import { homePage } from "./homePage";

// 目标 document types 见 AGENTS.md「Sanity CMS 模型」。
// service 仍待后续 issue 实现。
export const schemaTypes: SchemaTypeDefinition[] = [
  // 可复用 object
  seo,
  // 分类法 document（issue #7）
  productCategory,
  productCollection,
  // 产品 document（issue #9）
  product,
  // 内容 / 支撑 document（issue #8）
  page,
  caseStudy,
  blogPost,
  resource,
  faq,
  locationPage,
  galleryImage,
  redirect,
  // 全局单例（issue #8）
  siteSettings,
  navigation,
  seoSettings,
  // 首页配图单例（#59 Wix 对齐）
  homePage,
];
