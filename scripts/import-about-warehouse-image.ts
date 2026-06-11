/**
 * 补灌 About 页「Pure Oak. Pure Design.」区块配图到 Sanity（站主自有素材）。
 *
 * 背景：Wix About 页该区块右侧有一张仓库内景实拍（叉车 + 码垛木箱），
 * 但平迁时只导了第一张分区图（人字拼样板墙 → sectionImages[0]），仓库图漏了，
 * 导致生产站该段变成纯文字、留白过大。这里把仓库图追加为 sectionImages[1]。
 * 对应代码：about-us.astro 第二个 ImageTextSplit 接 sectionImages[1]（reverse 文左图右，对齐 Wix）。
 *
 * 运行（机器已 sanity login 或设 SANITY_API_WRITE_TOKEN）：
 *   npx tsx scripts/import-about-warehouse-image.ts
 *
 * 鲁棒/幂等：资产按 stable filename 去重；sectionImages 按 asset _ref 去重后追加，可重跑。
 * 图片来源：站主自有 Wix 原图（生产走 Sanity CDN，不热链 Wix）。优先本地副本（IMAGES_DIR）。
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";
const IMAGES_DIR = process.env.IMAGES_DIR ?? "/tmp";

const WAREHOUSE = {
  /** 本地副本（优先）：脚本预下载到 /tmp。 */
  local: "maywood-warehouse.jpg",
  /** Wix 原图 master（站主自有，无 transform = 原始字节）。 */
  url: "https://static.wixstatic.com/media/eb4477_fa8cf2354aa24d2f8f9facfeb19e8662~mv2.jpg",
  /** Sanity 资产 originalFilename（去重键，稳定、可重跑）。 */
  filename: "maywood-warehouse-interior.jpg",
  /** 替代文字（无障碍 + SEO，澳洲拼写）。 */
  alt: "Maywood Flooring's Melbourne warehouse interior, fully stocked with premium engineered European Oak planks and parquetry collections.",
};

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

async function loadBytes(): Promise<Buffer | null> {
  const localPath = join(IMAGES_DIR, WAREHOUSE.local);
  if (existsSync(localPath)) return readFileSync(localPath);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(WAREHOUSE.url, { signal: ctrl.signal });
    if (!res.ok) {
      console.warn(`  图片 ${res.status}: ${WAREHOUSE.url}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn(`  抓取失败: ${(e as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 按 stable filename 去重；存在则复用，否则上传字节。 */
async function ensureAsset(client: SanityClient): Promise<string | null> {
  const existing: string | null = await client.fetch(
    `*[_type=="sanity.imageAsset" && originalFilename==$f]|order(_createdAt desc)[0]._id`,
    { f: WAREHOUSE.filename }
  );
  if (existing) {
    console.log(`  ✓ 资产已存在，复用 ${WAREHOUSE.filename}`);
    return existing;
  }
  const bytes = await loadBytes();
  if (!bytes) {
    console.warn(`  ✗ 无字节，跳过 ${WAREHOUSE.filename}`);
    return null;
  }
  const asset = await client.assets.upload("image", bytes, {
    filename: WAREHOUSE.filename,
  });
  console.log(`  ✓ 上传 ${WAREHOUSE.filename} (${bytes.length} bytes)`);
  return asset._id;
}

interface SectionImage {
  _type: "image";
  _key?: string;
  asset: { _type: "reference"; _ref: string };
  alt?: string;
}

async function run(): Promise<void> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  console.log(`补灌 About 仓库图 → Sanity（${PROJECT_ID}/${DATASET}）`);

  const assetId = await ensureAsset(client);
  if (!assetId) throw new Error("资产上传失败，中止");

  const about = await client.fetch<{
    _id: string;
    sectionImages?: SectionImage[];
  } | null>(
    `*[_type=="page" && slug.current=="about-us"][0]{_id, sectionImages}`
  );
  if (!about?._id) throw new Error("未找到 about-us page 文档");

  const current = about.sectionImages ?? [];
  if (current.some((img) => img.asset?._ref === assetId)) {
    console.log("  ✓ sectionImages 已含仓库图，无需改动（幂等）");
    return;
  }

  // 保留既有项（补齐缺失 _key），追加仓库图为最后一项（= sectionImages[1]）。
  const next: SectionImage[] = [
    ...current.map((img, i) => ({ ...img, _key: img._key ?? `section-${i}` })),
    {
      _type: "image",
      _key: "warehouse-interior",
      asset: { _type: "reference", _ref: assetId },
      alt: WAREHOUSE.alt,
    },
  ];

  await client.patch(about._id).set({ sectionImages: next }).commit();
  console.log(
    `  ✓ page(about-us).sectionImages 现含 ${next.length} 张（追加 warehouse）`
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
