/**
 * FAQ 的数据与纯逻辑层 —— 查询、归一化、Portable Text → HTML 序列化、FAQPage JSON-LD。
 *
 * 拆分原则同 content-pages.ts / collection-landing.ts：
 *  - GROQ 字符串、归一化、序列化、JSON-LD 构造都是纯函数/常量（可单测、不触网）；
 *  - 只有 `getFaqs()` 才真正用 getSanityClient() 发请求。
 *
 * 为何在此手写一个小而专的 Portable Text → HTML 序列化器（见 AGENTS.md「组件策略：
 * 自己写是最后手段」）：
 *  - `RichTextRenderer.astro`（#18）是 **Astro** 组件，只能在 `.astro` 上下文渲染；
 *    本 issue 的答案需要既能注入 React island（FaqAccordionIsland 接收预序列化 HTML 字符串），
 *    又能进 FAQPage JSON-LD 的 acceptedAnswer.text —— 两处都在非 Astro 上下文。
 *  - 项目未装 `@portabletext/to-html`，且目标是「不新增依赖」（见 PR 说明 / lock 备注）。
 *  - faq.answer 的 schema 仅 `{ type: "block" }`：段落、标题、列表、行内 strong/em/链接，
 *    范围窄且固定 → 一个聚焦的序列化器足够，且全部可单测（含转义 / 防 XSS）。
 *  - 链接的内外链处理镜像 PortableTextLink.astro（外链加 rel/target，内链不加）。
 *
 * 「内容尚未灌入」是常态：缺字段一律收敛为 ""/null/[]，由页面优雅降级（空状态），绝不输出 lorem。
 * 术语见 CONTEXT.md；SEO（FAQPage）见 AGENTS.md「结构化数据」。
 */
import { getSanityClient } from "@/lib/sanity";
import type { PortableTextBlock, PortableTextSpan } from "@portabletext/types";

/** 归一化后的单条 FAQ（页面 / island / JSON-LD 共用）。 */
export interface Faq {
  _id: string;
  /** 问题原文（编辑必填；缺省收敛为空串，由调用方过滤）。 */
  question: string;
  /** 答案 Portable Text 数组（缺省收敛为空数组）。 */
  answer: PortableTextBlock[];
  /** 可选归类标签（如 Samples / Delivery）；编辑留空收敛为 null。 */
  category: string | null;
}

/** 全部 FAQ，按 question A→Z 稳定排序（answer 原样取 Portable Text 块数组）。 */
export const FAQS_QUERY = `*[_type == "faq"] | order(question asc){
  _id,
  question,
  answer,
  category
}`;

/** 把空字符串 / 全空白收敛为 null。 */
function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** answer 归一化：非数组（缺省 / null）一律收敛为空数组。 */
function normaliseAnswer(raw: unknown): PortableTextBlock[] {
  return Array.isArray(raw) ? (raw as PortableTextBlock[]) : [];
}

/** 归一化一条 faq 投影：缺字段收敛为 ""/[]/null，绝不编造内容。 */
export function normaliseFaq(raw: Record<string, unknown>): Faq {
  return {
    _id: String(raw._id ?? ""),
    question: typeof raw.question === "string" ? raw.question : "",
    answer: normaliseAnswer(raw.answer),
    category: emptyToNull(raw.category),
  };
}

// ────────────────────────────────────────────────────────────────
// Portable Text → HTML（聚焦 faq.answer 的 block 子集）
// ────────────────────────────────────────────────────────────────

/** HTML 文本节点转义（防 XSS / 防破坏结构）。 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** href 属性值转义（在文本转义基础上确保引号 / 尖括号不逃逸属性）。 */
function escapeAttr(value: string): string {
  return escapeHtml(value);
}

/** markDef 形状（仅用到 link）。 */
interface LinkMarkDef {
  _key: string;
  _type: string;
  href?: string;
}

/** 渲染单个 span 文本，按 marks 逐层包裹（strong / em / link）。 */
function renderSpan(span: PortableTextSpan, markDefs: LinkMarkDef[]): string {
  let html = escapeHtml(span.text ?? "");
  for (const mark of span.marks ?? []) {
    if (mark === "strong") {
      html = `<strong>${html}</strong>`;
    } else if (mark === "em") {
      html = `<em>${html}</em>`;
    } else {
      // 非装饰 mark → 查 markDefs 看是否链接。
      const def = markDefs.find((d) => d._key === mark);
      if (def && def._type === "link") {
        const href = def.href ?? "#";
        const isExternal = /^https?:\/\//i.test(href);
        const attrs = isExternal
          ? ` target="_blank" rel="noopener noreferrer"`
          : "";
        html = `<a href="${escapeAttr(href)}"${attrs}>${html}</a>`;
      }
      // 未知 mark：忽略包裹，仅保留文本（已转义）。
    }
  }
  return html;
}

/** 渲染一个块的内联内容（拼接其所有 span）。 */
function renderInline(block: PortableTextBlock): string {
  const markDefs = (block.markDefs ?? []) as LinkMarkDef[];
  const children = (block.children ?? []) as PortableTextSpan[];
  return children.map((span) => renderSpan(span, markDefs)).join("");
}

/** 块级标签：标题样式映射到 h2/h3/h4，其余正常块为 p。 */
function blockTag(style: string | undefined): string {
  if (style === "h2" || style === "h3" || style === "h4") return style;
  return "p";
}

interface ListItemBlock extends PortableTextBlock {
  listItem: "bullet" | "number";
}

/** 判断一个块是否为列表项。 */
function isListItem(block: PortableTextBlock): block is ListItemBlock {
  const li = (block as ListItemBlock).listItem;
  return li === "bullet" || li === "number";
}

/**
 * 把 faq.answer 的 Portable Text 序列化为安全 HTML 字符串。
 *  - block（normal/h2/h3/h4）→ <p>/<h2>/<h3>/<h4>；
 *  - listItem=bullet/number → 合并相邻同型项为 <ul>/<ol>，每项 <li>；
 *  - 行内 strong/em/link mark → <strong>/<em>/<a>（外链加 rel/target）；
 *  - 所有文本 / 属性值转义。范围之外的块（如 image）此处不出现（schema 仅 block）。
 *
 * 空 / 非数组 → 返回空字符串（由调用方据此判空降级）。
 */
export function portableTextToHtml(value: PortableTextBlock[]): string {
  if (!Array.isArray(value) || value.length === 0) return "";

  const out: string[] = [];
  let i = 0;
  while (i < value.length) {
    const blk = value[i];

    if (isListItem(blk)) {
      // 收集相邻同型列表项，合并为一个 <ul>/<ol>。
      const listType = blk.listItem;
      const tag = listType === "bullet" ? "ul" : "ol";
      const items: string[] = [];
      while (i < value.length) {
        const cur = value[i];
        if (!isListItem(cur) || cur.listItem !== listType) break;
        items.push(`<li>${renderInline(cur)}</li>`);
        i++;
      }
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    // 普通块（含标题）。仅处理 _type === "block"；其它块类型忽略（schema 内不应出现）。
    if (blk._type === "block") {
      const tag = blockTag(blk.style);
      out.push(`<${tag}>${renderInline(blk)}</${tag}>`);
    }
    i++;
  }

  return out.join("");
}

/**
 * 把 faq.answer 序列化为纯文本（去标签）—— 供需要无标签文本的场景使用。
 * 块间以单个空格分隔。
 */
export function portableTextToPlainText(value: PortableTextBlock[]): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value
    .map((blk) =>
      ((blk.children ?? []) as PortableTextSpan[])
        .map((span) => span.text ?? "")
        .join("")
    )
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(" ");
}

// ────────────────────────────────────────────────────────────────
// FAQPage 结构化数据（见 AGENTS.md「结构化数据：FAQ FAQPage」）
// ────────────────────────────────────────────────────────────────

/** schema.org Answer（嵌入 Question）。text 允许基本 HTML（Google FAQPage 规范）。 */
export interface AnswerJsonLd {
  "@type": "Answer";
  text: string;
}

/** schema.org Question（FAQPage 的 mainEntity 项）。 */
export interface QuestionJsonLd {
  "@type": "Question";
  name: string;
  acceptedAnswer: AnswerJsonLd;
}

/** schema.org FAQPage。 */
export interface FaqPageJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: QuestionJsonLd[];
}

/**
 * 从一组 FAQ 构造 FAQPage 结构化数据。
 *  - 跳过 question 为空或 answer 序列化后为空的条目（不产出残缺 Question）；
 *  - acceptedAnswer.text 用 HTML 序列化（与页面 / island 渲染一致）；
 *  - 转义由序列化器负责；最终注入仍经 StructuredData（`<` → <）。
 * 空列表 → mainEntity 为空数组（合规对象，调用方据此决定是否注入）。
 */
export function buildFaqPageJsonLd(faqs: Faq[]): FaqPageJsonLd {
  const mainEntity: QuestionJsonLd[] = [];
  for (const faq of faqs) {
    const name = faq.question.trim();
    const text = portableTextToHtml(faq.answer);
    if (name.length === 0 || text.length === 0) continue;
    mainEntity.push({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text },
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

/** 取全部 FAQ（build 时调用），已归一化、已排序。 */
export async function getFaqs(): Promise<Faq[]> {
  const raw =
    await getSanityClient().fetch<Record<string, unknown>[]>(FAQS_QUERY);
  return (raw ?? []).map(normaliseFaq);
}
