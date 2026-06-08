/**
 * 首页配置 —— 首页上半区块（Hero + ProductSelectionGrid）的静态数据单一来源。
 *
 * 文案与入口对照线上 Wix 首页（2026-06-03 DOM 快照核实）。
 *  - Hero：H1「Welcome to Maywood Flooring」+ tagline + 简介段 + READ MORE。
 *  - 产品入口四张卡：Timber / Laminate / Hybrid / Accessories。
 *
 * 入口的 slug 误导问题（solid-flooring=Laminate、sustainable-flooring=Hybrid）
 * 是 ADR-0001 故意保留的 legacy URL，禁止顺手改。Accessories 暂无 Category，
 * Phase 1 指向 Contact 询盘（见已敲定决策）。
 *
 * 数据放这里（而非组件内）以便单测钉死 label / href，防止入口指错。
 */

/** 首页 hero 文案（澳洲拼写，editorial 调性，对照线上首页）。 */
export const HOME_HERO = {
  /** 全页唯一 H1。 */
  heading: "Welcome to Maywood Flooring",
  /** serif 大标题下的一行 tagline（对齐 Wix 品牌标语；SEO 关键词保留在下方简介段）。 */
  tagline: "Precision Supply, Timeless Design",
  /** hero 白色面板内的简介段（克制、品牌化，源自线上首页文案）。 */
  intro:
    "A premier timber flooring supplier trusted by the Melbourne community, Maywood delivers premium product across bespoke homes, luxury townhouses, multi-residential apartments and high-volume commercial developments. As a proud ATFA member, our work is backed by industry-certified standards, superior product quality and consultative service.",
  /** READ MORE CTA —— Phase 1 指向 About Us（品牌故事），legacy nav 一致。 */
  cta: {
    label: "Read More",
    href: "/about-us",
  },
} as const;

/** 单个产品入口卡。`href` 为站内相对路径（保留 legacy URL，见 ADR-0001）。 */
export type ProductSelectionEntry = {
  /** 展示文案（澳洲拼写）。 */
  label: string;
  /** 站内相对路径（3 个 Category 视图 + Accessories→Contact）。 */
  href: string;
  /** 图片 alt（editorial、含产品语境）；无图时仍用于可达性回落。 */
  imageAlt: string;
};

/**
 * 首页四个产品入口 —— ProductSelectionGrid 的单一来源。
 * 顺序对照线上首页：Timber / Laminate / Hybrid / Accessories。
 * Timber 是 Engineered Category 的营销别名（见 CONTEXT.md）。
 */
export const PRODUCT_SELECTION: readonly ProductSelectionEntry[] = [
  {
    label: "Timber",
    href: "/category/engineered-flooring",
    imageAlt:
      "Maywood engineered timber flooring installed in a light-filled luxury living room.",
  },
  {
    label: "Laminate",
    // ⚠️ legacy slug 误导（solid-flooring 实为 Laminate）—— ADR-0001，禁止改。
    href: "/category/solid-flooring",
    imageAlt: "Maywood laminate flooring in a contemporary interior.",
  },
  {
    label: "Hybrid",
    // ⚠️ legacy slug 误导（sustainable-flooring 实为 Hybrid）—— ADR-0001，禁止改。
    href: "/category/sustainable-flooring",
    imageAlt: "Maywood hybrid flooring with a durable, water-resistant finish.",
  },
  {
    label: "Accessories",
    // Phase 1 无 Accessories Category → 指向 Contact 询盘（见已敲定决策）。
    href: "/contact",
    imageAlt:
      "Maywood colour-matched timber trims and scotia for seamless floor transitions.",
  },
] as const;
