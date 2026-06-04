/**
 * Service / booking 页的数据与纯逻辑层（issue #20）。
 *
 * 已敲定决策（见 AGENTS.md「booking/service 页」+ ADR-0001）：
 * Phase 1 保留 legacy URL，但把 Wix Bookings 日历 / 收款**降级**为静态服务介绍 + CTA 分流，
 * 不重建日历，不展示价格，预约 + 支付留 Phase 3。
 *
 * 因此这是一份**静态清单**（无需 Sanity）：5 个已知服务的 slug / 标题 / 时长 / 介绍 /
 * 「what's involved」，外加由服务类型派生的 CTA 落点：
 *   - consultation / workshop → /contact（询盘 / 预约咨询）
 *   - sample-viewing         → /request-sample（样品申请）
 *
 * slug 与时长核对自线上 Wix 站点（/booking-calendar/<slug>）：consultation 1hr、
 * sample-viewing 1.5hr；线上页面无文案，故介绍 / what's involved 为本项目静态撰写
 * （澳洲拼写、克制、与 editorial 调性一致，不编造价格 / 库存承诺）。
 *
 * 纯常量 + 纯函数（可单测、不触网）：getStaticPaths→paths 映射、面包屑、SEO 输入、
 * CTA 解析都在这里；.astro 页面只做薄渲染。
 */
import type { BreadcrumbItem, SeoInput } from "@/lib/seo";
import { SAMPLE_REQUEST } from "@/lib/site";

/** CTA 分流类型：决定服务页 / 卡片的行动按钮指向哪里。 */
export type ServiceCtaType = "contact" | "sample";

/** 单个服务（静态清单的一项）。 */
export interface Service {
  /** legacy slug（= Wix /booking-calendar/<slug>，原样保留，见 ADR-0001）。 */
  slug: string;
  /** 展示标题（澳洲拼写）。 */
  title: string;
  /** 时长（核对自线上 Wix；如 "1 hr"、"1.5 hr"）；线上未标时长则为 null。 */
  duration: string | null;
  /** 列表卡片用的一句话摘要。 */
  summary: string;
  /** 服务页正文介绍段落。 */
  intro: string;
  /** 「What's involved」要点（服务页列出，列表页不展示）。 */
  whatsInvolved: string[];
  /**
   * CTA 分流类型：
   *  - "sample"  → 样品查看类，导向 /request-sample；
   *  - "contact" → 咨询 / workshop 类，导向 /contact。
   */
  ctaType: ServiceCtaType;
}

/** CTA 落点解析结果（label + href），供页面 / 卡片直接渲染。 */
export interface ServiceCta {
  label: string;
  href: string;
}

/**
 * 静态服务清单 —— /service-page/[slug] 与 /book-online 的单一来源。
 *
 * 顺序即 /book-online 列表展示顺序（对齐线上 Wix book-online 页）。
 * 注意线上确实有两条 "Flooring Consultation"（slug `flooring-consultation` 与
 * `flooring-consultation-1`）——legacy slug 原样保留，第二条标注 In-Store 以便区分。
 */
export const SERVICES: readonly Service[] = [
  {
    slug: "flooring-consultation",
    title: "Flooring Consultation",
    duration: "1 hr",
    summary:
      "A one-on-one session to match the right timber, laminate or hybrid floor to your project.",
    intro:
      "Sit down with our team for a focused, one-hour consultation. We'll talk through your space, your budget and how the room is used, then narrow the field to the timber, laminate or hybrid floors that suit it best. It's an unhurried conversation, not a sales pitch — you leave with clear direction, not a pile of brochures.",
    whatsInvolved: [
      "A one-hour, one-on-one discussion of your project and space",
      "Guidance on engineered timber, laminate and hybrid options",
      "Advice on durability, finish, grade and suitability for the room",
      "Next steps for samples, measurements and supply",
    ],
    ctaType: "contact",
  },
  {
    slug: "flooring-workshop",
    title: "Flooring Workshop",
    duration: null,
    summary:
      "A hands-on workshop covering how our floors are made, graded and chosen.",
    intro:
      "Our flooring workshop is a hands-on introduction to what sets a quality floor apart. We walk through how engineered, laminate and hybrid boards are made, how grade and finish change the look underfoot, and what to look for when you compare ranges. Ideal for homeowners and trade who want to buy with confidence.",
    whatsInvolved: [
      "An overview of engineered, laminate and hybrid construction",
      "How grade, finish and bevel change the final look",
      "Hands-on time with boards from our signature collections",
      "Time for questions specific to your project",
    ],
    ctaType: "contact",
  },
  {
    slug: "installation-workshop",
    title: "Installation Workshop",
    duration: null,
    summary:
      "A practical workshop on subfloor prep, acclimatisation and laying technique.",
    intro:
      "The installation workshop is for trade and confident DIYers who want to lay our floors well. We cover subfloor preparation, acclimatisation, expansion gaps and the laying techniques that keep a floor flat and quiet for years. Bring your questions — this is a practical, no-nonsense session run by people who fit floors every week.",
    whatsInvolved: [
      "Subfloor assessment and preparation",
      "Acclimatisation and moisture considerations",
      "Expansion gaps, underlay and laying patterns",
      "Common installation mistakes and how to avoid them",
    ],
    ctaType: "contact",
  },
  {
    slug: "flooring-consultation-1",
    title: "Flooring Consultation (In-Store)",
    duration: "1 hr",
    summary:
      "An in-store consultation at our Keysborough showroom, surrounded by full-size displays.",
    intro:
      "Prefer to talk it through in person? Book an in-store consultation at our Keysborough showroom and see full-size displays as we go. We'll compare colours and finishes in real light, feel the grain underfoot and shortlist the floors that fit your space — all in one focused hour with our team.",
    whatsInvolved: [
      "A one-hour consultation at our Keysborough showroom",
      "Full-size displays across timber, laminate and hybrid ranges",
      "Side-by-side comparison of colour, finish and texture",
      "A shortlist and clear next steps before you leave",
    ],
    ctaType: "contact",
  },
  {
    slug: "sample-viewing",
    title: "Sample Viewing",
    duration: "1.5 hr",
    summary:
      "An extended session to view and compare samples before you decide.",
    intro:
      "Take your time with the samples that matter. This relaxed, hour-and-a-half session lets you view and compare boards side by side — checking colour, grain and finish against your own swatches and ideas. When you've found the floor that's right, our team will help you arrange samples to take home.",
    whatsInvolved: [
      "An extended, unhurried session to compare boards",
      "Colour, grain and finish viewed side by side",
      "Guidance matching samples to your space and styling",
      "Help arranging samples to take home",
    ],
    ctaType: "sample",
  },
] as const;

/** 全部服务 slug（getStaticPaths / 测试用）。 */
export const SERVICE_SLUGS: readonly string[] = SERVICES.map((s) => s.slug);

/** 按 slug 取服务，不存在返回 undefined。 */
export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

/**
 * 由服务类型解析 CTA（label + href）。
 *  - "sample"  → /request-sample（取自 site.ts 单一来源，全站一致）。
 *  - "contact" → /contact。
 * 集中在此，页面 / 卡片不各自判断分流，避免落点漂移。
 */
export function resolveServiceCta(service: Service): ServiceCta {
  if (service.ctaType === "sample") {
    return { label: SAMPLE_REQUEST.label, href: SAMPLE_REQUEST.href };
  }
  return { label: "Get in touch", href: "/contact" };
}

/**
 * 生成 /service-page/[slug] 的 getStaticPaths 数组（纯映射，便于单测）。
 * 每个服务 → { params: { slug }, props: { service } }；只映射有 slug 的项。
 */
export function toServiceStaticPaths(
  services: readonly Service[] = SERVICES
): Array<{ params: { slug: string }; props: { service: Service } }> {
  return services
    .filter((s) => s.slug.length > 0)
    .map((service) => ({ params: { slug: service.slug }, props: { service } }));
}

/** 服务页面包屑：Home > Our Services > {Service}。 */
export function buildServiceBreadcrumbs(service: Service): BreadcrumbItem[] {
  return [
    { name: "Home", url: "/" },
    { name: "Our Services", url: "/book-online" },
    { name: service.title, url: `/service-page/${service.slug}` },
  ];
}

/**
 * 服务页 SEO 输入。canonical 自指 /service-page/<slug>（legacy URL，见 ADR-0001）。
 * title 用服务名；description 用摘要 + 一句符合事实的地理 / 渠道说明（澳洲拼写）。
 */
export function buildServiceSeo(service: Service): SeoInput {
  const path = `/service-page/${service.slug}`;
  return {
    title: service.title,
    description: `${service.summary} Book your ${service.title.toLowerCase()} with Maywood Flooring at our Keysborough showroom, Melbourne.`,
    path,
    canonical: path,
  };
}

/** /book-online 列表页 SEO 输入（canonical 自指）。 */
export function buildBookOnlineSeo(): SeoInput {
  const path = "/book-online";
  return {
    title: "Our Services",
    description:
      "Book a flooring consultation, workshop or sample viewing with Maywood Flooring. Talk timber, laminate and hybrid floors with our team at our Keysborough showroom in Melbourne.",
    path,
    canonical: path,
  };
}
