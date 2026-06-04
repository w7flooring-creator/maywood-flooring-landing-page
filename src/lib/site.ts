/**
 * 站点常量 —— 全站 NAP（Name / Address / Phone）的单一来源。
 *
 * AGENTS.md「关键业务事实」要求 NAP 必须全站一致：SeoHead、LocalBusiness
 * 结构化数据、Footer、Contact 等都从这里取值，禁止在各处硬编码。
 * Phase 1 先硬编码；Phase 2/#11 接入 Sanity `siteSettings` 后由此处统一切换数据源。
 */

/** 地址（拆字段，便于 schema.org PostalAddress 复用）。 */
export const ADDRESS = {
  street: "49-51 Keysborough Ave",
  locality: "Keysborough",
  region: "VIC",
  postalCode: "3173",
  /** ISO 3166-1 alpha-2，schema.org 推荐用国家码。 */
  country: "AU",
} as const;

/** NAP + 地理服务范围 + 联系渠道，全站一致。 */
export const NAP = {
  phone: "03 8753 5522",
  email: "sales@maywoodflooring.com.au",
  address: ADDRESS,
  /** 地理 SEO / LocalBusiness areaServed（见 AGENTS.md 地理关键词）。 */
  areaServed: ["Melbourne", "Victoria", "Australia"],
  /** WhatsApp 用国际格式 61422709709（见已敲定决策）。 */
  whatsappUrl: "https://wa.me/61422709709",
} as const;

/** 站点级元信息与 SEO 默认值。 */
export const SITE = {
  name: "Maywood Flooring",
  /** 生产域名，无尾斜杠（astro.config.mjs 的 `site` 同值）。 */
  url: "https://www.maywoodflooring.com.au",
  /** 缺 meta description 时的站点级回落文案（澳洲拼写）。 */
  defaultDescription:
    "Maywood Flooring is a premium timber, laminate and hybrid flooring supplier in Keysborough, Melbourne — serving trade, wholesale and homeowners across Victoria.",
  /** 缺 OG 图时的站点级回落（相对路径，由 absoluteUrl 解析为绝对）。 */
  defaultOgImage: "/og-default.jpg",
} as const;

/**
 * 把路径解析为站点绝对 URL。
 * - 已是绝对 URL（http/https）时原样返回。
 * - 相对路径补 `SITE.url` 前缀；自动规整前导斜杠，避免双斜杠或缺斜杠。
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE.url}${path}`;
}
