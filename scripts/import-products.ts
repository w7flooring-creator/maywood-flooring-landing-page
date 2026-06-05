/**
 * 从 Wix 导出的 catalog CSV 迁移产品到 Sanity（#10 数据 + #11 图片）。
 *
 * 运行（机器已 sanity login）：
 *   npm run import:products            # 默认读 ~/Downloads/catalog_products.csv
 *   PRODUCTS_CSV=/path/to.csv LIMIT=3 npm run import:products   # 指定文件 / 只导前 N 个测试
 *
 * 做的事：
 * - 解析 CSV（PRODUCT 行 + 同 handle 的 MEDIA 行）。
 * - 规格从 plainDescription 的 HTML 解析（粗体标签 → 下一段值）；标签含西里尔形近字，已归一化。
 * - 分类法：categorySlugs 较脏（多 collection / 跨族 / 缺族 slug）→ 由 collection 的已知父类推导 category。
 * - slug：尽量用线上 store-products-sitemap 的 legacy slug（slugify(name) + -N 去重），保留 /product-page/* URL（ADR-0001）。
 * - 图片：按 wixstatic id 下载 → 上传 Sanity 资产（Sanity 按内容 hash 去重，幂等）。
 * - 写入：确定性 _id（product.<wix-uuid>）+ createOrReplace，幂等可重跑。
 *
 * 鉴权：复用 Sanity CLI 登录 token（~/.config/sanity/config.json authToken，含写权限）。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";

const CSV_PATH =
  process.argv[2] ||
  process.env.PRODUCTS_CSV ||
  join(homedir(), "Downloads", "catalog_products.csv");
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";

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

// ── CSV parser (RFC4180-ish：引号、转义引号、字段内换行) ──
function parseCSV(input: string): string[][] {
  let s = input;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const rows: string[][] = [];
  let row: string[] = [],
    f = "",
    i = 0,
    q = false;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          f += '"';
          i += 2;
          continue;
        }
        q = false;
        i++;
        continue;
      }
      f += c;
      i++;
      continue;
    }
    if (c === '"') {
      q = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(f);
      f = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
      i++;
      continue;
    }
    f += c;
    i++;
  }
  if (f.length || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── 西里尔形近字 → 拉丁（标签如 "Туре" → "Type") ──
const CYR: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  Х: "X",
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
};
const deCyr = (s: string) => s.replace(/[А-я]/g, (ch) => CYR[ch] ?? ch);
const stripTags = (h: string) => h.replace(/<[^>]+>/g, "");
const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

const SPEC_LABELS: Record<string, string> = {
  type: "type",
  dimension: "dimensions",
  dimensions: "dimensions",
  packsize: "packSize",
  packweight: "packWeight",
  finish: "finish",
  bevel: "bevel",
  profile: "profile",
  grade: "grade",
  environmentalrate: "environmentalRate",
};

function parseSpecs(html: string): Record<string, string> {
  const blocks = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => decode(stripTags(m[1])).replace(/ /g, " ").trim())
    .filter((t) => t !== "");
  const out: Record<string, string> = {};
  for (let i = 0; i < blocks.length; i++) {
    const key = deCyr(blocks[i])
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const field = SPEC_LABELS[key];
    if (field && blocks[i + 1]) {
      out[field] = blocks[i + 1];
      i++;
    }
  }
  return out;
}

async function fetchLegacySlugs(): Promise<string[]> {
  try {
    const xml = await fetch(
      "https://www.maywoodflooring.com.au/store-products-sitemap.xml"
    ).then((r) => r.text());
    return [...xml.matchAll(/\/product-page\/([^<\s]+)/g)].map((m) => m[1]);
  } catch {
    console.warn("⚠️ 拉取 sitemap 失败，回退到 slugify(name) 生成 slug");
    return [];
  }
}

async function uploadImage(
  client: SanityClient,
  mediaId: string,
  filename: string
): Promise<string | null> {
  if (!mediaId) return null;
  const url = `https://static.wixstatic.com/media/${mediaId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  图片 ${res.status}: ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Sanity 按内容 sha1 去重 → 重跑同图复用同 asset，幂等。
    const asset = await client.assets.upload("image", buf, { filename });
    return asset._id;
  } catch (e) {
    console.warn(`  图片下载/上传失败 ${url}: ${(e as Error).message}`);
    return null;
  }
}

async function run(): Promise<void> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  // 分类法 slug → _id（权威，来自 Sanity；mtf-24hr-water-resistant→collection.mtf-24hr 等）
  const cols: { _id: string; slug: string; cat: string }[] = await client.fetch(
    '*[_type=="productCollection"]{_id,"slug":slug.current,"cat":category._ref}'
  );
  const colBySlug = new Map(cols.map((c) => [c.slug, c]));
  const FAMILY_TO_CAT: Record<string, string> = {
    "engineered-flooring": "category.engineered",
    "solid-flooring": "category.laminate",
    "sustainable-flooring": "category.hybrid",
  };

  const rows = parseCSV(readFileSync(CSV_PATH, "utf8"));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i])) as Record<
    string,
    number
  >;
  const data = rows.slice(1).filter((r) => r.length > 1);
  const products = data.filter((r) => r[idx.fieldType] === "PRODUCT");
  // handle → media id（同 handle 的 MEDIA 行）
  const mediaByHandle = new Map<string, string>();
  for (const r of data)
    if (r[idx.fieldType] === "MEDIA")
      mediaByHandle.set(
        r[idx.handle],
        (r[idx.media] || "").split(";")[0].trim()
      );

  // legacy slug 分配：按 base 分组，按 CSV 顺序消费 {base, base-1, base-2...}
  const legacy = await fetchLegacySlugs();
  const legacyByBase = new Map<string, string[]>();
  for (const sl of legacy) {
    const base = sl.replace(/-\d+$/, "");
    if (!legacyByBase.has(base)) legacyByBase.set(base, []);
    legacyByBase.get(base)!.push(sl);
  }
  // 每组按数字后缀排序（base 在前）
  for (const arr of legacyByBase.values())
    arr.sort((a, b) => {
      const na = a.match(/-(\d+)$/),
        nb = b.match(/-(\d+)$/);
      return (na ? +na[1] : 0) - (nb ? +nb[1] : 0);
    });
  const usedSlugs = new Set<string>();
  function assignSlug(name: string): string {
    const base = slugify(name);
    const pool = legacyByBase.get(base);
    if (pool) {
      const next = pool.find((s) => !usedSlugs.has(s));
      if (next) {
        usedSlugs.add(next);
        return next;
      }
    }
    // 回退：base / base-2 / base-3 …
    let s = base,
      n = 1;
    while (usedSlugs.has(s)) s = `${base}-${++n}`;
    usedSlugs.add(s);
    return s;
  }

  const slice = products.slice(0, LIMIT);
  console.log(
    `导入 ${slice.length}/${products.length} 个产品 → ${PROJECT_ID}/${DATASET}\n`
  );

  let ok = 0;
  const warnings: string[] = [];
  for (const r of slice) {
    const name = r[idx.name];
    const handle = r[idx.handle];
    const uuid = handle.replace(/^Product_/, "");
    const slugs = (r[idx.categorySlugs] || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    const familyCat = slugs.map((s) => FAMILY_TO_CAT[s]).find(Boolean);
    const collSlugs = slugs.filter((s) => colBySlug.has(s));
    // 主 collection：若有 family slug，优先选父类匹配该 family 的；否则取第一个
    let primary =
      collSlugs.find((s) => colBySlug.get(s)!.cat === familyCat) ??
      collSlugs[0];
    if (!primary) {
      warnings.push(
        `跳过「${name}」：无可识别 collection（${JSON.stringify(slugs)}）`
      );
      continue;
    }
    const coll = colBySlug.get(primary)!;
    const catId = coll.cat;
    const specs = parseSpecs(r[idx.plainDescription] || "");
    const slug = assignSlug(name);

    process.stdout.write(`• ${name}  →  ${slug}  [${primary}]  下载图…`);
    const assetId = await uploadImage(
      client,
      mediaByHandle.get(handle) || "",
      `${slug}.jpg`
    );
    process.stdout.write(assetId ? " ✓\n" : " (无图)\n");

    const doc: Record<string, unknown> = {
      _id: `product.${uuid}`,
      _type: "product",
      title: name,
      slug: { _type: "slug", current: slug },
      legacyPath: `/product-page/${slug}`,
      status: r[idx.visible] === "false" ? "draft" : "published",
      category: { _type: "reference", _ref: catId },
      collection: { _type: "reference", _ref: coll._id },
      ...(specs.type ? { shortDescription: specs.type } : {}),
      ...specs,
      ...(assetId
        ? {
            mainImage: {
              _type: "image",
              asset: { _type: "reference", _ref: assetId },
            },
          }
        : {}),
    };
    await client.createOrReplace(doc as never);
    ok++;
  }

  console.log(`\n完成：写入 ${ok} 个产品。`);
  if (warnings.length)
    console.log("警告:\n" + warnings.map((w) => "  - " + w).join("\n"));
  const total = await client.fetch<number>('count(*[_type=="product"])');
  const withImg = await client.fetch<number>(
    'count(*[_type=="product" && defined(mainImage)])'
  );
  console.log(`dataset 现有 product = ${total}（其中带图 ${withImg}）`);
}

run().catch((e: unknown) => {
  console.error("导入失败：", e);
  process.exit(1);
});
