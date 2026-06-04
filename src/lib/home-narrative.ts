/**
 * 首页下半区块（#16）的静态 editorial 文案 —— 单一来源。
 *
 * 文案核实自线上 Wix 首页（2026-06-03 DOM 快照 page-2026-06-03T04-39-58）。
 * 与上半 home.ts 同思路：把 label/标题/正文/href 放这里（而非组件内），
 * 便于单测钉死文案与链接，防止改动时漂移；组件只负责版式与降级。
 *
 * 这些是「品牌叙事」类静态文案（非结构化可重复内容），按 #16 验收要求
 * 保留在前端、不建 homePage schema。可重复的「招牌系列卡」改由 Sanity
 * （getSignatureCollections）驱动，见 SignatureCollectionsSection。
 *
 * 注：Wix 原页 “Gallary” 为拼写错误，按 AGENTS.md 允许的拼写修复改作 “Gallery”。
 * 澳洲拼写（personalised / specialise 等）。
 */

/** 单个文字段落区块（标题 + 多段正文 + 可选 CTA）。 */
export interface NarrativeBlock {
  /** 区块标题（serif，渲染为 h2）。 */
  heading: string;
  /** 标题上方的小字 eyebrow（可选，克制使用）。 */
  eyebrow?: string;
  /** 正文段落（按数组逐段渲染，澳洲拼写）。 */
  paragraphs: readonly string[];
}

/** 站内 CTA（label + 站内相对路径，保留 legacy URL）。 */
export interface NarrativeCta {
  label: string;
  href: string;
}

/**
 * Professional partner 双栏 —— 品牌作为「专业供应伙伴」的叙事。
 * 标题与两段正文核实自线上首页 “Your Professional Partner in Timber Supply”。
 */
export const PARTNER_NARRATIVE: NarrativeBlock = {
  eyebrow: "Maywood Flooring",
  heading: "Your Professional Partner in Timber Supply",
  paragraphs: [
    "We deliver high-performance timber solutions to the building industry by merging traditional artistry with precision manufacturing. Every stage — from raw timber selection to final finishing — undergoes rigorous quality control to ensure every plank aligns with your project specifications.",
    "Our collections are designed for diverse architectural styles and backed by technical expertise and efficient wholesale service. We build lasting partnerships beyond the point of sale, ensuring a seamless experience from initial specification to project completion.",
  ],
} as const;

/**
 * “The Silent Foundation” editorial 文字区 —— 品牌核心叙事。
 * 单段长文，核实自线上首页同名区块。
 */
export const SILENT_FOUNDATION: NarrativeBlock = {
  heading: "The Silent Foundation",
  paragraphs: [
    "A floor is the silent foundation of a home’s character. At Maywood, we curate timber that speaks to the senses — blending the raw, organic beauty of European Oak with a refined minimalist sensibility. We believe that true luxury lies in the details: the subtle brush of a grain, the soft glow of a matte finish, and the enduring strength of precision engineering. Beyond supplying premium planks, we are dedicated to crafting the backdrop for life’s most meaningful moments, providing an architectural canvas that inspires both the designer and the dweller.",
  ],
} as const;

/** 灰底招牌系列区块标题（卡片本身由 Sanity 驱动，见组件）。 */
export const SIGNATURE_COLLECTIONS_HEADING = "Maywood Signature Collections";

/**
 * Brand philosophy（品牌理念）—— 收尾前的简短信念陈述。
 * 核实自线上首页 “At Maywood Flooring, we believe that quality flooring …”。
 */
export const BRAND_STATEMENT: NarrativeBlock = {
  heading:
    "Quality flooring is vital in bringing a space to life. Feel welcomed with every step, and get inspired with the Maywood Flooring range.",
  eyebrow: "Our Philosophy",
  paragraphs: [],
} as const;

/**
 * Gallery / social feed 区块文案。
 * 真正的 galleryImage Sanity 类型尚未建模（#8 并行）→ 本区块只渲染克制的
 * 静态 strip + 一句导览文案 + “View Gallery” CTA，留好接真实图廊的插槽。
 * 文案核实自线上首页（“…make your flooring journey seamless and stress-free…”）。
 */
export const GALLERY_FEED: NarrativeBlock & { cta: NarrativeCta } = {
  heading: "Gallery",
  paragraphs: [
    "Whether you’re a homeowner, designer or builder, we’re here to make your flooring journey seamless and stress-free. Explore the personalised support we offer at every step.",
  ],
  cta: { label: "View Gallery", href: "/gallery" },
} as const;

/**
 * 收尾 CTA 区块 —— 引导到 Contact 询盘。
 * Phase 1 主转化路径是 Contact（见 SAMPLE_REQUEST / 已敲定决策）。
 */
export const HOME_CTA: NarrativeBlock & { cta: NarrativeCta } = {
  heading: "Ready to start your flooring project?",
  paragraphs: [
    "Speak with the Maywood team about supply, specification and samples for your next residential or commercial project across Melbourne and Victoria.",
  ],
  cta: { label: "Get in Touch", href: "/contact" },
} as const;
