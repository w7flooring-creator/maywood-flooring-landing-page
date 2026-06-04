/**
 * Legacy URL redirect map —— 生成 Cloudflare Static Assets 的 `_redirects` 文件。
 *
 * 策略（ADR-0001）：Phase 1 把现有 Wix 站点全部**内容** legacy URL 1:1 保留
 * （同 slug，不改不 301）——这些**不需要**任何 redirect。本模块只处理**例外**：
 *
 *   1. `/booking-calendar/*` —— Wix 旧的交易预约 funnel，本次**不迁**（见已敲定决策）。
 *      逐个具体 service slug → 对应 `/service-page/<slug>`（Phase 1 已降级为静态服务介绍页），
 *      其余未知子路径用通配兜底 → `/contact`。全部 301（永久，传递 SEO 权重）。
 *   2. 编辑维护的 redirect —— Sanity `redirect` 文档（见 studio/schemaTypes/redirect.ts），
 *      让非技术编辑无需碰 GitHub 即可增删跳转。
 *
 * 设计要点：
 * - 纯函数 + 常量可单测、不触网；`get*` 前缀的函数才真正用 `getSanityClient()`。
 * - 合并时**静态规则优先**，编辑规则不得覆盖（clobber）同源静态规则。
 * - 守卫 1:1 保留路由：任何命中 PRESERVED_PREFIXES 或保留页面的编辑规则一律丢弃，
 *   避免误伤 SEO 关键的内容 URL（见 ADR-0001）。
 *
 * Cloudflare `_redirects` 行格式：`<from> <to> <status>`，首条命中生效，支持 `*` 通配。
 *
 * 本模块**纯逻辑、零依赖**（不 import Sanity client），故可被 astro.config 在
 * 配置加载阶段安全引入。真正的 Sanity 拉取在 scripts/generate-redirects.ts，
 * 用 REDIRECTS_QUERY + buildRedirectsFile 组装产物。
 */

/** 解析后的单条重定向规则（已定状态码，可直接序列化）。 */
export interface RedirectRule {
  /** 源路径，以 / 开头，可含尾部 `*` 通配。 */
  from: string;
  /** 目标路径（站内，以 / 开头）。 */
  to: string;
  /** HTTP 状态码：301 永久 / 302 临时。 */
  status: 301 | 302;
}

/** Sanity `redirect` 文档投影（编辑维护）。 */
export interface RedirectDoc {
  from?: string | null;
  to?: string | null;
  /** 缺省视为 true（301）；false → 302。 */
  permanent?: boolean | null;
}

/**
 * 静态重定向规则 —— ADR-0001 的 booking-calendar 例外。
 * 5 个 service slug 核对自线上 booking-services-sitemap.xml（2026-06-04）。
 * 通配兜底必须排在所有具体规则**之后**（Cloudflare 首条命中）。
 */
export const STATIC_REDIRECTS: readonly RedirectRule[] = [
  // 具体 service slug → 对应 service 页（Phase 1 静态服务介绍页 + CTA）
  {
    from: "/booking-calendar/flooring-consultation",
    to: "/service-page/flooring-consultation",
    status: 301,
  },
  {
    from: "/booking-calendar/flooring-consultation-1",
    to: "/service-page/flooring-consultation-1",
    status: 301,
  },
  {
    from: "/booking-calendar/sample-viewing",
    to: "/service-page/sample-viewing",
    status: 301,
  },
  {
    from: "/booking-calendar/flooring-workshop",
    to: "/service-page/flooring-workshop",
    status: 301,
  },
  {
    from: "/booking-calendar/installation-workshop",
    to: "/service-page/installation-workshop",
    status: 301,
  },
  // 兜底：任何其它（未知 / 新增）booking-calendar 子路径 → Contact
  { from: "/booking-calendar/*", to: "/contact", status: 301 },
] as const;

/**
 * 1:1 保留的内容路由前缀（ADR-0001）—— 这些**前缀**下的 URL 永不作为重定向源，
 * 任何命中的编辑规则一律丢弃，防止误伤 SEO 关键内容 URL。
 */
export const PRESERVED_PREFIXES: readonly string[] = [
  "/category/",
  "/product-page/",
  "/service-page/",
  "/projects/",
] as const;

/**
 * 1:1 保留的精确路由（顶层页面 + 营销落地页）—— 同样禁止作为重定向源。
 * 注：`/` 根路径单独在校验里处理。
 */
const PRESERVED_EXACT: ReadonlySet<string> = new Set([
  "/",
  "/resources",
  "/gallery",
  "/book-online",
  "/contact",
  "/about-us",
  "/sustainability",
  "/request-sample",
  // Signature Collection 营销落地页（/<slug>）
  "/puregrain",
  "/bushland",
  "/manor",
  "/bellavale",
]);

/** GROQ：取全部编辑维护的 redirect 文档（纯静态字符串，不插值）。 */
export const REDIRECTS_QUERY = `*[_type == "redirect" && defined(from) && defined(to)]{
  from,
  to,
  permanent
}`;

/** 把 Sanity `redirect` 文档转成一条规则（定状态码、trim 空白）。 */
export function redirectDocToRule(doc: RedirectDoc): RedirectRule {
  return {
    from: (doc.from ?? "").trim(),
    to: (doc.to ?? "").trim(),
    // permanent 缺省（null/undefined）按 301 处理；仅显式 false → 302
    status: doc.permanent === false ? 302 : 301,
  };
}

/** 序列化单条规则为 `_redirects` 行：`<from> <to> <status>`。 */
export function serialiseRule(rule: RedirectRule): string {
  return `${rule.from} ${rule.to} ${rule.status}`;
}

/** 该 from 是否命中 1:1 保留路由（禁止作为重定向源）。 */
function isPreservedSource(from: string): boolean {
  if (PRESERVED_EXACT.has(from)) return true;
  return PRESERVED_PREFIXES.some((prefix) => from.startsWith(prefix));
}

/** 编辑规则是否有效（非空、合法、不破坏保留路由、非自环）。 */
function isValidEditorRule(rule: RedirectRule): boolean {
  if (!rule.from.startsWith("/")) return false;
  if (!rule.to.startsWith("/")) return false;
  if (rule.from === rule.to) return false; // 自环无意义
  if (isPreservedSource(rule.from)) return false; // 守卫 1:1 保留路由
  return true;
}

const FILE_HEADER = `# Cloudflare Static Assets _redirects —— 由 scripts/generate-redirects.ts 在 build 时生成。
# 请勿手改本文件：静态例外见 src/lib/redirects.ts，编辑维护的跳转见 Sanity「重定向 (Redirect)」。
# 格式：<from> <to> <status>（首条命中生效，* 为通配）。
#
# 策略（ADR-0001）：Phase 1 全部内容 legacy URL 1:1 保留，不在此列。
# 下方仅为例外：/booking-calendar/* 交易 funnel 不迁 → 301 到对应 service 页 / Contact。`;

/**
 * 生成完整 `_redirects` 文件内容。
 *
 * @param editorDocs Sanity `redirect` 文档（默认空，纯静态时可不传）
 * @returns 文件全文（含注释头，末尾带换行）
 *
 * 合并规则：
 * - 静态规则永远在前且不可被覆盖；
 * - 编辑规则按出现顺序去重（同源保留首条），且跳过命中静态源 / 保留路由 / 非法的项。
 */
export function buildRedirectsFile(editorDocs: RedirectDoc[] = []): string {
  const seen = new Set<string>(STATIC_REDIRECTS.map((r) => r.from));
  const editorRules: RedirectRule[] = [];

  for (const doc of editorDocs) {
    const rule = redirectDocToRule(doc);
    if (!isValidEditorRule(rule)) continue;
    if (seen.has(rule.from)) continue; // 不覆盖静态规则，也不重复同源编辑规则
    seen.add(rule.from);
    editorRules.push(rule);
  }

  const sections: string[] = [FILE_HEADER, ""];

  sections.push("# --- 静态例外（booking-calendar，ADR-0001） ---");
  for (const rule of STATIC_REDIRECTS) {
    sections.push(serialiseRule(rule));
  }

  if (editorRules.length > 0) {
    sections.push("");
    sections.push("# --- 编辑维护（Sanity redirect 文档） ---");
    for (const rule of editorRules) {
      sections.push(serialiseRule(rule));
    }
  }

  return sections.join("\n") + "\n";
}
