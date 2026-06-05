/**
 * 从 Wix gallery 页迁移图库图片到 Sanity `galleryImage`（#8 内容灌入）。
 *
 * 运行（机器已 sanity login）：
 *   npm run import:gallery
 *   ALT="自定义替代文字" npm run import:gallery   # 覆盖默认 alt
 *
 * 做的事：
 * - 对每张 Wix 原图（static.wixstatic.com/media/<id>，去掉 /v1/fill 变换后即原图）
 *   下载 → 上传 Sanity 资产（Sanity 按内容 sha1 去重，幂等）。
 * - createOrReplace `galleryImage` 文档：确定性 _id（galleryImage.wix-<hash>）+ alt + sortOrder，
 *   幂等可重跑。/gallery 页与首页 GalleryFeed 在下次 build 时自动「亮起」。
 *
 * 图片来源：https://www.maywoodflooring.com.au/gallery —— 站主自有照片，已确认无商用风险；
 * 2026-06-05 用浏览器渲染 + 滚动抓全确认共 21 张（页面无 load-more 分页）。
 * 生产不热链 Wix（AGENTS.md 硬规则）：原图入 Sanity，前端走 Sanity CDN（见 src/lib/sanity-image.ts）。
 *
 * 鉴权：复用 Sanity CLI 登录 token（~/.config/sanity/config.json authToken），同 import-products.ts。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";

/**
 * alt 默认值（schema 要求 image.alt 必填）。站主自有项目照片的笼统但真实的描述，
 * 不编造每张的具体内容；编辑可在 Studio 内逐张细化。
 */
const ALT = process.env.ALT ?? "Maywood Flooring flooring project, Melbourne";

/**
 * 21 张图库原图的 Wix media id（去掉 /v1/fill 变换后即原图）。
 * 抓取自线上 /gallery（见文件头说明）。数组顺序即默认 sortOrder。
 */
const WIX_GALLERY_MEDIA = [
  "eb4477_07f55debafa146c1aee5d985caf38159~mv2.jpg",
  "eb4477_0d268f3f589d4baa9058794c80981804~mv2.jpg",
  "eb4477_10f7b8706dff4ad895d9eb36f452482a~mv2.jpg",
  "eb4477_129af70519734e4581d432643d5f6809~mv2.jpg",
  "eb4477_14f5be3c05c84643962be30f442b44a4~mv2.jpg",
  "eb4477_169af6189234444f89ef3f960553877a~mv2.jpg",
  "eb4477_17b4284fd48f429fb6a4dcec96ae6c38~mv2.jpg",
  "eb4477_19d87fda12654a6bb17809d38c263ec3~mv2.jpg",
  "eb4477_2180cd8d538b4ac49535020bd7d07167~mv2.jpg",
  "eb4477_3a52286ef7614e78859116f453fbf5b0~mv2.jpg",
  "eb4477_58d6e21140d640219251cf84f08f0c35~mv2.jpg",
  "eb4477_59599b4df82c4eaf9ba96632ab330698~mv2.jpg",
  "eb4477_7a02b36a47a0484a89d388332c8dde9b~mv2.jpg",
  "eb4477_a55f4c85e7df40fa89ae075a0b593e51~mv2.jpg",
  "eb4477_b1ab0d21332c4285919c190d65f45752~mv2.jpg",
  "eb4477_c72403fe3ea0402184192cfdbb57c663~mv2.jpg",
  "eb4477_c9800b7d75e846cfb691bf80bddfb898~mv2.jpg",
  "eb4477_d05231ec90b941779c67d05c61f343f9~mv2.jpg",
  "eb4477_d07663a0877c46ec8740c4edda405d4b~mv2.jpg",
  "eb4477_df38f63627f1435daad46b22d9c606f5~mv2.jpg",
  "eb4477_e047e9b01a344226b89712be7672ba01~mv2.jpg",
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

/** 下载 Wix 原图并上传 Sanity，返回 asset._id（失败返回 null）。 */
async function uploadImage(
  client: SanityClient,
  mediaId: string
): Promise<string | null> {
  const url = `https://static.wixstatic.com/media/${mediaId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  图片 ${res.status}: ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Sanity 按内容 sha1 去重 → 重跑同图复用同 asset，幂等。
    const asset = await client.assets.upload("image", buf, {
      filename: mediaId,
    });
    return asset._id;
  } catch (e) {
    console.warn(`  图片下载/上传失败 ${url}: ${(e as Error).message}`);
    return null;
  }
}

/** 由 Wix media id 推出确定性文档 _id（幂等重跑用同一 id）。 */
function docIdFor(mediaId: string): string {
  const hash = mediaId.replace(/~mv2\..*$/, "").replace(/[^a-zA-Z0-9]/g, "-");
  return `galleryImage.wix-${hash}`;
}

async function run(): Promise<void> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  console.log(
    `导入 ${WIX_GALLERY_MEDIA.length} 张图库图片 → Sanity（${PROJECT_ID}/${DATASET}）`
  );
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < WIX_GALLERY_MEDIA.length; i++) {
    const mediaId = WIX_GALLERY_MEDIA[i];
    const assetId = await uploadImage(client, mediaId);
    if (!assetId) {
      failed++;
      continue;
    }
    const _id = docIdFor(mediaId);
    await client.createOrReplace({
      _id,
      _type: "galleryImage",
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
        alt: ALT,
      },
      sortOrder: i,
    });
    ok++;
    console.log(`  ✓ ${ok}/${WIX_GALLERY_MEDIA.length}  ${_id}`);
  }
  console.log(`完成：${ok} 创建/更新，${failed} 失败。`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
