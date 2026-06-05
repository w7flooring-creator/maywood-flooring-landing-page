/**
 * 灌入初始 FAQ 到 Sanity `faq`（#8 内容）。内容由站主提供（2026-06-05）。
 *
 * 运行（机器已 sanity login）：
 *   npm run import:faqs
 *
 * 幂等策略：用 `createIfNotExists`（按确定性 _id）。
 *   → 首次创建这 5 条；之后编辑请在 **Sanity Studio** 内进行（Studio 为内容唯一来源），
 *     重跑脚本**不会覆盖**你在 Studio 的修改。如需用脚本改某条，先在 Studio/CLI 删掉再跑。
 *
 * answer 为 Portable Text（block 数组），与 schema 一致；/faqs 页在下次 build 自动「亮起」
 * 并输出 FAQPage 结构化数据（见 src/lib/faq.ts、AGENTS.md「SEO」）。
 *
 * 鉴权：复用 Sanity CLI 登录 token（~/.config/sanity/config.json authToken），同 import-products.ts。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";

interface FaqSeed {
  question: string;
  /** 答案；用 \n\n 分段（每段一个 Portable Text block）。 */
  answer: string;
  category: string;
}

/** 初始 FAQ（站主提供，澳洲拼写）。顺序仅作录入用；前端按 question A→Z 展示。 */
const FAQS: FaqSeed[] = [
  {
    question: "Are your products compatible with underfloor heating?",
    answer:
      "Yes. Due to our stable engineered construction, most of our collections (including Puregrain and Manor) are suitable for use with hydronic underfloor heating systems when installed according to our guidelines.",
    category: "Installation & Performance",
  },
  {
    question: "What is the Janka Hardness rating of your timber?",
    answer:
      "We supply high-density species including European Oak, Blackbutt, and Spotted Gum. Each species is tested for durability to ensure it meets the demands of high-traffic residential and commercial environments.",
    category: "Product Specifications",
  },
  {
    question:
      "Can your flooring be installed as a floating floor or direct stick?",
    answer:
      "Our engineered collections are versatile. They can be installed using the direct stick method for a solid feel and acoustic performance, or as a floating floor for a more efficient installation process.",
    category: "Installation & Performance",
  },
  {
    question: "What type of finish is used on Maywood timber?",
    answer:
      "Most of our collections feature a multi-layer UV Lacquer or UV Oil finish. This provides the organic look of natural timber with the added protection of a durable, easy-to-clean surface suitable for high-traffic areas.",
    category: "Product Specifications",
  },
  {
    question: "What is the timber grade of your collections?",
    answer:
      "We primarily offer Character Grade to celebrate the natural knots and grain variations of timber. This ensures an authentic, organic look that brings character to every room.",
    category: "Product Specifications",
  },
];

function resolveToken(): string {
  const env =
    process.env.SANITY_AUTH_TOKEN ?? process.env.SANITY_API_WRITE_TOKEN;
  if (env) return env;
  const cfg = JSON.parse(
    readFileSync(join(homedir(), ".config", "sanity", "config.json"), "utf8")
  ) as { authToken?: string };
  if (cfg.authToken) return cfg.authToken;
  throw new Error("找不到写入 token：先 `sanity login` 或设 SANITY_AUTH_TOKEN");
}

/** 由问题生成确定性 _id（幂等用同一 id）。 */
function docIdFor(question: string): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `faq.${slug}`;
}

/** 纯文本答案 → Portable Text block 数组（\n\n 分段）。 */
function toPortableText(answer: string, idPrefix: string) {
  return answer
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para, i) => ({
      _type: "block",
      _key: `${idPrefix}-b${i}`,
      style: "normal",
      markDefs: [],
      children: [
        { _type: "span", _key: `${idPrefix}-s${i}`, text: para, marks: [] },
      ],
    }));
}

async function run(): Promise<void> {
  const client: SanityClient = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  console.log(
    `灌入 ${FAQS.length} 条 FAQ → Sanity（${PROJECT_ID}/${DATASET}）`
  );
  let created = 0;
  let skipped = 0;
  for (const faq of FAQS) {
    const _id = docIdFor(faq.question);
    const before = await client.getDocument(_id);
    await client.createIfNotExists({
      _id,
      _type: "faq",
      question: faq.question,
      answer: toPortableText(faq.answer, _id),
      category: faq.category,
    });
    if (before) {
      skipped++;
      console.log(`  • 已存在，跳过：${_id}`);
    } else {
      created++;
      console.log(`  ✓ 创建：${_id}`);
    }
  }
  console.log(`完成：${created} 创建，${skipped} 已存在跳过。`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
