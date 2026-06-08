/**
 * 灌入首页 / 招牌系列配图到 Sanity（#59 Wix 对齐）。
 *
 * 运行（机器已 sanity login）：
 *   npm run import:home-images
 *
 * 做的事：
 * - 下载站主自有的 Wix 原图（去 /v1/fill 变换 = 原图）→ 上传 Sanity（sha1 去重，幂等）。
 * - homePage 单例（_id="homePage"，createOrReplace）：heroImage / partnerImage / accessoriesImage。
 * - 招牌系列 productCollection（按 slug patch）：heroImage（puregrain / bushland / bellavale）。
 *   → 首页 hero / 专业伙伴 / 产品入口(Accessories) / 招牌系列卡 + 各系列落地页 hero 自动「亮起」。
 *
 * 图片来源：站主自有 AI 生成的站点图（已确认无商用风险，2026-06-07）。生产不热链 Wix。
 * Manor 系列图暂缺（carousel 未能确认），其卡片/落地页继续优雅降级，后续补。
 *
 * 鉴权：复用 Sanity CLI 登录 token（~/.config/sanity/config.json authToken），同 import-products.ts。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";

/** homePage 单例的三张图（Wix media id + alt）。 */
const HOME_IMAGES = {
  heroImage: {
    mediaId: "eb4477_0fe79e8b32504a228a60582f039e378d~mv2.png",
    alt: "Maywood timber flooring in a light-filled luxury living room, Melbourne.",
  },
  partnerImage: {
    mediaId: "eb4477_11176d4ec26a4a4d86039aa935829606~mv2.jpg",
    alt: "Maywood Flooring Melbourne warehouse for trade pick-up and timber supply.",
  },
  accessoriesImage: {
    mediaId: "eb4477_024ef0a911f14ebf885ec5a66ac5ccd0~mv2.jpg",
    alt: "Maywood colour-matched timber floor trims and scotia for seamless perimeter detailing.",
  },
} as const;

/** 招牌系列配图（slug → Wix media id + alt）。Manor 暂缺。 */
const COLLECTION_IMAGES: Record<string, { mediaId: string; alt: string }> = {
  puregrain: {
    mediaId: "eb4477_b04d5095bb7d40d283b5ba6dd884a7b4~mv2.png",
    alt: "Maywood PureGrain wide-plank engineered timber flooring in a contemporary architectural residence.",
  },
  bushland: {
    mediaId: "eb4477_6b153f1d5d5743c890e20ac8bbfabe0c~mv2.png",
    alt: "Maywood Bushland engineered Spotted Gum Australian native timber flooring in a luxury living room.",
  },
  bellavale: {
    mediaId: "eb4477_522449e7180a4137ad8ca4745b1daa1d~mv2.png",
    alt: "Maywood Bellavale European Oak Chevron parquetry flooring in a luxury interior.",
  },
};

/**
 * 产品入口卡 / 分类页 hero 配图（category slug → Wix media id + alt）。
 * 取自 Wix 首页「Our Products Selection」四卡（按几何位置映射到各卡标签）。
 * Wix 复用了部分系列图（Timber=Bushland 图、Laminate=PureGrain 图等）——照搬以对齐 Wix。
 * 设为 productCategory.heroImage → 同时点亮首页产品入口卡 + 分类页 hero。
 */
const CATEGORY_IMAGES: Record<string, { mediaId: string; alt: string }> = {
  "engineered-flooring": {
    mediaId: "eb4477_6b153f1d5d5743c890e20ac8bbfabe0c~mv2.png",
    alt: "Maywood engineered timber flooring in a warm, light-filled Melbourne interior.",
  },
  "solid-flooring": {
    mediaId: "eb4477_b04d5095bb7d40d283b5ba6dd884a7b4~mv2.png",
    alt: "Maywood laminate flooring in a bright contemporary Melbourne living space.",
  },
  // 注：此图 node 端从 Wix 下载常被限流（abort）；已用浏览器侧 fetch 取回原图入 Sanity，
  // 资产已在库。脚本保留此条作来源记录；重跑若下载失败为非破坏式跳过（保留已设值）。
  "sustainable-flooring": {
    mediaId: "eb4477_1dfc7b8c2395445ba52c4ab74a9ca50d~mv2.png",
    alt: "Maywood hybrid flooring in a cosy, light-filled Melbourne interior.",
  },
};

/**
 * 内容页 hero（page slug → Wix media id）来源记录（已入 Sanity：page.<slug>.heroImage）：
 *  - about-us       eb4477_ce0c5acaae0c479fb8288a5314c8e616~mv2.jpg（showroom interior）
 *  - sustainability eb4477_7fe5b26b266747c8b19b9fee0a4a0428~mv2.png（eco / sourced timber）
 *  - contact        eb4477_591a3fffdd654779ad329a3fea1d9dca~mv2.png（contemporary interior）
 * 这三张经 curl(rendered URL) 取回上传，page 文档已建（minimal：title+slug+heroImage，
 * 正文仍走各页静态 fallback）。如需重灌，按上述 id + page.<slug> 写 heroImage 即可。
 */

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 带超时地抓一个 URL；失败/超时返回 null。 */
async function fetchBuffer(url: string): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      console.warn(`  图片 ${res.status}: ${url}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn(`  抓取失败 ${url}: ${(e as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadImage(
  client: SanityClient,
  mediaId: string
): Promise<string | null> {
  // 优先 Wix 大尺寸渲染 URL（1800px、q_85，体积小、最稳）；原图 base 作回退。
  // 反正会重新入 Sanity + 由 sanity-image 再优化，渲染版足够清晰。
  const rendered = `https://static.wixstatic.com/media/${mediaId}/v1/fill/w_1800,h_1350,al_c,q_85/${mediaId}`;
  const base = `https://static.wixstatic.com/media/${mediaId}`;
  let buf: Buffer | null = null;
  for (let attempt = 0; attempt < 2 && !buf; attempt++) {
    if (attempt > 0) await sleep(2000);
    buf = (await fetchBuffer(rendered)) ?? (await fetchBuffer(base));
  }
  if (!buf) return null;
  try {
    const asset = await client.assets.upload("image", buf, {
      filename: mediaId,
    });
    return asset._id;
  } catch (e) {
    console.warn(`  上传失败 ${mediaId}: ${(e as Error).message}`);
    return null;
  }
}

/** 复用已存在的 Sanity 资产（按 originalFilename），否则从 Wix 下载上传。 */
async function ensureAsset(
  client: SanityClient,
  mediaId: string
): Promise<string | null> {
  const existing: string | null = await client.fetch(
    `*[_type=="sanity.imageAsset" && originalFilename==$f]|order(_createdAt desc)[0]._id`,
    { f: mediaId }
  );
  if (existing) return existing;
  return uploadImage(client, mediaId);
}

function imageField(assetId: string, alt: string) {
  return {
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
    alt,
  };
}

async function run(): Promise<void> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  console.log(`灌入首页/系列配图 → Sanity（${PROJECT_ID}/${DATASET}）`);

  // 1) homePage 单例 —— 非破坏式：先确保文档存在，再逐字段 patch.set
  //    （某张图失败不会清掉已成功的字段，幂等可重跑补齐）。
  await client.createIfNotExists({ _id: "homePage", _type: "homePage" });
  for (const [field, { mediaId, alt }] of Object.entries(HOME_IMAGES)) {
    const assetId = await uploadImage(client, mediaId);
    if (assetId) {
      await client
        .patch("homePage")
        .set({ [field]: imageField(assetId, alt) })
        .commit();
      console.log(`  ✓ homePage.${field}`);
    } else {
      console.warn(`  ✗ homePage.${field} 跳过（图片失败，保留原值）`);
    }
  }

  // 2) 招牌系列 heroImage（按 slug patch 已有 productCollection）
  for (const [slug, { mediaId, alt }] of Object.entries(COLLECTION_IMAGES)) {
    const id: string | null = await client.fetch(
      `*[_type=="productCollection" && slug.current==$s][0]._id`,
      { s: slug }
    );
    if (!id) {
      console.warn(`  ✗ collection "${slug}" 未找到，跳过`);
      continue;
    }
    const assetId = await uploadImage(client, mediaId);
    if (!assetId) {
      console.warn(`  ✗ collection "${slug}" 图片失败，跳过`);
      continue;
    }
    await client
      .patch(id)
      .set({ heroImage: imageField(assetId, alt) })
      .commit();
    console.log(`  ✓ collection "${slug}".heroImage`);
  }

  // 3) 产品入口卡 / 分类页 hero —— 设 productCategory.heroImage（按 slug patch）
  for (const [slug, { mediaId, alt }] of Object.entries(CATEGORY_IMAGES)) {
    const id: string | null = await client.fetch(
      `*[_type=="productCategory" && slug.current==$s][0]._id`,
      { s: slug }
    );
    if (!id) {
      console.warn(`  ✗ category "${slug}" 未找到，跳过`);
      continue;
    }
    const assetId = await ensureAsset(client, mediaId);
    if (!assetId) {
      console.warn(`  ✗ category "${slug}" 图片失败，跳过`);
      continue;
    }
    await client
      .patch(id)
      .set({ heroImage: imageField(assetId, alt) })
      .commit();
    console.log(`  ✓ category "${slug}".heroImage`);
  }

  console.log("完成。注：Manor 系列图暂缺，后续补。");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
