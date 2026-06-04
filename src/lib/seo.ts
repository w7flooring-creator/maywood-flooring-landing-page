/**
 * SEO 纯逻辑层 —— 不依赖 Astro / DOM，便于单测。
 *
 * 三件事：
 *  1. resolveSeoMeta —— 从页面 props + 站点默认值解析出 title/description/canonical/OG。
 *  2. buildLocalBusinessJsonLd —— 站点级 LocalBusiness 结构化数据（NAP）。
 *  3. buildBreadcrumbListJsonLd —— 从有序面包屑项生成 BreadcrumbList。
 *
 * `.astro` 组件（SeoHead / Breadcrumbs）只做薄包装，消费这里的输出。
 * 见 AGENTS.md「SEO（核心目标）」与「结构化数据」。
 */
import { SITE, NAP, absoluteUrl } from "@/lib/site";

/** Open Graph 类型，按需扩展（Phase 1 多为 website / article）。 */
export type OgType = "website" | "article" | "product";

/** 页面传入的原始 SEO 输入（绝大多数字段可省，缺省走默认值）。 */
export interface SeoInput {
  /** 页面标题；缺省回落到站点名。会自动补 " | Maywood Flooring" 后缀（首页除外）。 */
  title?: string;
  /** meta description；缺省回落到 SITE.defaultDescription。 */
  description?: string;
  /** 当前页路径（如 "/contact"），用于推导 canonical / og:url。 */
  path: string;
  /** 显式 canonical（绝对 URL）；用于近重复页指向主版本（见 ADR-0001）。 */
  canonical?: string;
  /** OG 图（相对或绝对）；缺省回落到 SITE.defaultOgImage。 */
  image?: string;
  /** OG 类型；缺省 "website"。 */
  type?: OgType;
  /** 是否输出 noindex；缺省 false。 */
  noindex?: boolean;
}

/** 解析后的最终 meta/OG 值，供 SeoHead 直接渲染。 */
export interface ResolvedSeoMeta {
  title: string;
  description: string;
  canonical: string;
  noindex: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: OgType;
  ogUrl: string;
  ogSiteName: string;
}

/**
 * 组装最终页面标题：`"<title> | <站点名>"`。
 * 若 title 缺省或已等于站点名，则只用站点名，避免 "Maywood Flooring | Maywood Flooring" 这类重复。
 */
function composeTitle(title: string | undefined): string {
  const trimmed = title?.trim();
  if (!trimmed || trimmed === SITE.name) return SITE.name;
  return `${trimmed} | ${SITE.name}`;
}

/**
 * 从 props + 站点默认值解析出每页唯一的 meta/OG。
 * 设计为「缺字段不报错」：除 `path` 外全部可省，未提供即回落到站点级默认。
 */
export function resolveSeoMeta(input: SeoInput): ResolvedSeoMeta {
  const title = composeTitle(input.title);
  const description = input.description?.trim() || SITE.defaultDescription;
  const canonical = input.canonical
    ? absoluteUrl(input.canonical)
    : absoluteUrl(input.path);
  const ogImage = absoluteUrl(input.image ?? SITE.defaultOgImage);
  const ogType: OgType = input.type ?? "website";

  return {
    title,
    description,
    canonical,
    noindex: input.noindex ?? false,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType,
    ogUrl: canonical,
    ogSiteName: SITE.name,
  };
}

/** schema.org PostalAddress（嵌入 LocalBusiness）。 */
export interface PostalAddressJsonLd {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

/** schema.org LocalBusiness（站点级，单实例）。 */
export interface LocalBusinessJsonLd {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  name: string;
  url: string;
  telephone: string;
  email: string;
  address: PostalAddressJsonLd;
  areaServed: string[];
}

/**
 * 构造站点级 LocalBusiness 结构化数据，NAP 取自 site.ts 单一来源。
 * 全站每页注入（见 AGENTS.md「结构化数据：全站 LocalBusiness」）。
 */
export function buildLocalBusinessJsonLd(): LocalBusinessJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE.name,
    url: SITE.url,
    telephone: NAP.phone,
    email: NAP.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: NAP.address.street,
      addressLocality: NAP.address.locality,
      addressRegion: NAP.address.region,
      postalCode: NAP.address.postalCode,
      addressCountry: NAP.address.country,
    },
    areaServed: [...NAP.areaServed],
  };
}

/** 一个面包屑项：展示名 + 路径（相对或绝对均可）。 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** schema.org BreadcrumbList 的单个 ListItem。 */
export interface BreadcrumbListItemJsonLd {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

/** schema.org BreadcrumbList。 */
export interface BreadcrumbListJsonLd {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: BreadcrumbListItemJsonLd[];
}

/**
 * 从有序面包屑项生成 BreadcrumbList 结构化数据。
 * position 从 1 起连续编号；item URL 统一解析为绝对 URL。
 * 空数组合法（返回空 itemListElement，不抛错）。
 */
export function buildBreadcrumbListJsonLd(
  items: BreadcrumbItem[]
): BreadcrumbListJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}
