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

/** 单个导航条目。`href` 为站内相对路径（保留 legacy URL，见 ADR-0001）。 */
export type NavLink = {
  /** 展示文案（澳洲拼写）。 */
  label: string;
  /** 站内相对路径。 */
  href: string;
};

/**
 * 主导航 —— SiteHeader 桌面 nav 与 MobileNav 抽屉共用的单一来源。
 * 链接对照线上 Wix 站点：「Products」指向 engineered Category 视图
 * （legacy URL，slug 误导问题见 ADR-0001，禁止顺手改）。
 */
export const PRIMARY_NAV: readonly NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/category/engineered-flooring" },
  { label: "Resources", href: "/resources" },
  { label: "Gallery", href: "/gallery" },
  { label: "About Us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
] as const;

/**
 * 页脚导航 —— 在主导航基础上追加只在 footer 出现的入口。
 * 目前补 FAQ 入口（#59-#68 决策：加到页脚而非主导航）；/faqs 本就在 sitemap，
 * 此处只解决可发现性。后续 #4（footer Quick Links 含 T&C / Sustainability）在此扩展。
 */
export const FOOTER_NAV: readonly NavLink[] = [
  ...PRIMARY_NAV,
  { label: "FAQs", href: "/faqs" },
] as const;

/** Sample Request CTA —— 全站 “Request a Sample” 指向专属样品申请页（见 #26）。 */
export const SAMPLE_REQUEST = {
  label: "Request a Sample",
  href: "/request-sample",
} as const;

/** 单个社媒链接。`icon` 对应 lucide 图标名，供 SocialLinks 取用。 */
export type SocialLink = {
  /** 平台名，用作 aria-label / 可见文案回落。 */
  label: string;
  /** 外链绝对 URL。 */
  href: string;
  /** lucide 图标标识（Instagram / Facebook / Youtube）。 */
  icon: "instagram" | "facebook" | "youtube";
};

/**
 * 社媒账号 —— SocialLinks 的单一来源，链接核对自线上 Wix 站点 Social Bar。
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/maywood_au/",
    icon: "instagram",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61588526080799",
    icon: "facebook",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@maywood_au",
    icon: "youtube",
  },
] as const;

/**
 * 判断导航项相对当前路径是否「激活」（aria-current / 高亮）。
 * - Home（`/`）只在恰好处于站点根时激活，避免它在每页都高亮。
 * - 其余项：当前路径等于其 href，或是其子路径（如 `/category/...` 下的产品页）。
 */
export function isNavLinkActive(href: string, currentPath: string): boolean {
  const normalise = (p: string) =>
    p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  const target = normalise(href);
  const current = normalise(currentPath);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}
