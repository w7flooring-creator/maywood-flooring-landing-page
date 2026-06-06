/**
 * 清洗 Sanity 产品规格里的西里尔形近字（#59 对齐项 / 内容债）。
 *
 * 背景：从 Wix HTML 解析规格时，部分值混入了与拉丁字母形近的西里尔字符
 * （如 bevel 的 "Місrо" 实为 "Micro"，М/і/с/о 是西里尔）。import-products.ts 当时
 * 只归一化了规格「标签」，未归一化「值」→ 36 个产品的 bevel 等字段带脏字符。
 *
 * 本脚本把指定文本规格字段里的西里尔形近字替换回拉丁字母，仅 patch 有变化的文档。
 * 幂等：清洗后再跑为 no-op。
 *
 * 运行（机器已 sanity login 或设 SANITY_API_READ/WRITE token）：
 *   npm run fix:cyrillic            # 实际写入
 *   DRY_RUN=1 npm run fix:cyrillic  # 只打印将要改的，不写入
 *
 * 鉴权：复用 Sanity CLI 登录 token（~/.config/sanity/config.json authToken），同 import-products.ts。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@sanity/client";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";
const DRY_RUN = process.env.DRY_RUN === "1";

/** 需清洗的产品文本规格字段（不含 slug / 引用 / 图片）。 */
const TEXT_FIELDS = [
  "title",
  "shortDescription",
  "type",
  "dimensions",
  "packSize",
  "packWeight",
  "finish",
  "bevel",
  "profile",
  "grade",
  "environmentalRate",
  "waterResistance",
  "material",
  "colourTone",
  "installationMethod",
] as const;

/**
 * 西里尔 → 拉丁「形近字」映射（仅收录视觉上与拉丁字母几乎一致的常见混淆字）。
 * 英文规格值里出现这些西里尔字符必为解析/编码假象，安全替换。
 */
const HOMOGLYPHS: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  Ѕ: "S",
  І: "I",
  Ј: "J",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
  Ё: "E",
  а: "a",
  е: "e",
  ѕ: "s",
  і: "i",
  ј: "j",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  ё: "e",
};

const CYRILLIC = /[Ѐ-ӿ]/;

function normalise(value: string): string {
  return value.replace(/[Ѐ-ӿ]/g, (ch) => HOMOGLYPHS[ch] ?? ch);
}

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

async function run(): Promise<void> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  const fieldList = TEXT_FIELDS.join(", ");
  const products: Array<Record<string, unknown>> = await client.fetch(
    `*[_type=="product"]{ _id, ${fieldList} }`
  );

  let patched = 0;
  let leftover = 0;
  for (const p of products) {
    const set: Record<string, string> = {};
    for (const f of TEXT_FIELDS) {
      const v = p[f];
      if (typeof v === "string" && CYRILLIC.test(v)) {
        const fixed = normalise(v);
        if (fixed !== v) set[f] = fixed;
      }
    }
    if (Object.keys(set).length === 0) continue;
    // 若清洗后仍残留西里尔（未覆盖的字符），告警以便补充映射。
    for (const [f, val] of Object.entries(set)) {
      if (CYRILLIC.test(val)) {
        leftover++;
        console.warn(`  ⚠️ 仍有未映射西里尔：${p._id}.${f} = ${val}`);
      }
    }
    console.log(
      `  ${DRY_RUN ? "[dry]" : "✓"} ${p._id}: ${Object.entries(set)
        .map(([f, val]) => `${f}→"${val}"`)
        .join(", ")}`
    );
    if (!DRY_RUN) {
      await client
        .patch(p._id as string)
        .set(set)
        .commit();
    }
    patched++;
  }
  console.log(
    `完成：${patched} 个产品${DRY_RUN ? "（dry-run，未写入）" : "已清洗"}${
      leftover ? `，${leftover} 处仍有未映射西里尔` : ""
    }。`
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
