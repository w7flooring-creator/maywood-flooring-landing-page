/**
 * 灌入 #59 第二批 Wix 对齐图片到 Sanity（站主提供、站主自有素材）。
 *
 * 运行（机器已 sanity login 或设 SANITY_API_WRITE_TOKEN）：
 *   npm run import:wix-align-images
 *
 * 覆盖的图片 → 落点（均站主自有，生产走 Sanity CDN，不热链 Wix）：
 *  - Manor 系列卡/落地页配图          → productCollection(slug "manor").heroImage
 *  - 首页 Sustainability 区块配图      → homePage.sustainabilityImage
 *  - The Silent Foundation 品牌标记图  → homePage.silentFoundationImage
 *  - About「Trusted Partner」图文分栏  → page(slug "about-us").sectionImages[0]
 *  - Sustainability 三大支柱配图        → page(slug "sustainability").sectionImages[0..2]
 *  - Gallery 顶部 hero 横幅            → page(slug "gallery").heroImage（按需建文档）
 *  - Resources 8 张资源卡             → 8 个 resource 文档（createIfNotExists + 配图/文案）
 *
 * 鲁棒性：优先用本地已下载副本（IMAGES_DIR，默认 /tmp/wiximg），缺失则按 Wix 渲染
 * URL 下载（带重试/超时）。Sanity 资产按 stable filename 去重（originalFilename），
 * 文档写入幂等（patch by 已知 _id / slug；resource 用 createIfNotExists 不覆盖站主编辑）。
 *
 * 鉴权：复用 Sanity CLI 登录 token（~/.config/sanity/config.json authToken），同其它 import 脚本。
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";
const IMAGES_DIR = process.env.IMAGES_DIR ?? "/tmp/wiximg";

/** 一张待导入图片：本地副本 + Wix 渲染 URL 兜底 + 稳定 Sanity 文件名 + alt。 */
interface ImageSpec {
  /** IMAGES_DIR 下的本地文件名（优先）。 */
  local: string;
  /** 缺本地副本时的 Wix 渲染 URL 兜底。 */
  url: string;
  /** Sanity 资产 originalFilename（去重键，稳定、可重跑）。 */
  filename: string;
  /** 替代文字（无障碍 + SEO，澳洲拼写）。 */
  alt: string;
}

const IMAGES = {
  manor: {
    local: "u1_kitchen.png",
    url: "https://static.wixstatic.com/media/eb4477_eaddbf1f0dba4e9993e876817ae3e5d4~mv2.png/v1/crop/x_60,y_0,w_1172,h_928/fill/w_1018,h_806,al_c,q_90,enc_avif,quality_auto/x.png",
    filename: "maywood-manor-collection.png",
    alt: "Maywood Manor engineered oak flooring in an elegant, light-filled kitchen, Melbourne.",
  },
  homeSustainability: {
    local: "u2_screenshot.png",
    url: "https://static.wixstatic.com/media/eb4477_f48e289cc9c84f179b9597061a678159~mv2.png/v1/fill/w_523,h_567,al_c,q_85,enc_avif,quality_auto/x.png",
    filename: "maywood-home-sustainability.png",
    alt: "A koala in a eucalyptus tree — Maywood sources timber from responsibly managed plantation forests.",
  },
  silentFoundation: {
    local: "u3_maywood_mark.png",
    url: "https://static.wixstatic.com/media/eb4477_3887da9e9a5b4ea4863e4459af1d7f68~mv2.png/v1/fill/w_1042,h_844,al_c,q_90,enc_avif,quality_auto/MAYWOOD.png",
    filename: "maywood-wordmark-forest.png",
    alt: "Maywood wordmark set over an Australian forest.",
  },
  aboutTrustedPartner: {
    local: "u4_dscf0667.jpg",
    url: "https://static.wixstatic.com/media/eb4477_ce0c5acaae0c479fb8288a5314c8e616~mv2.jpg/v1/crop/x_161,y_0,w_6079,h_4022/fill/w_1250,h_832,al_c,q_85,enc_avif,quality_auto/x.jpg",
    filename: "maywood-showroom-sample-wall.jpg",
    alt: "Maywood showroom display wall of herringbone timber flooring samples, Melbourne.",
  },
  sustainability1: {
    local: "s2.png",
    url: "https://static.wixstatic.com/media/eb4477_6803431f21e84044a3ea4ca651708537~mv2.png/v1/fill/w_719,h_403,al_c,q_85,enc_avif,quality_auto/x.png",
    filename: "maywood-sustainability-1.png",
    alt: "Responsibly managed plantation forest — the source of Maywood's certified timber.",
  },
  sustainability2: {
    local: "s3.png",
    url: "https://static.wixstatic.com/media/eb4477_dd18724ed9174b58a4e4b1a7af6a5b10~mv2.png/v1/fill/w_720,h_443,al_c,q_85,enc_avif,quality_auto/x.png",
    filename: "maywood-sustainability-2.png",
    alt: "Maywood engineered timber flooring detail.",
  },
  sustainability3: {
    local: "s4.png",
    url: "https://static.wixstatic.com/media/eb4477_7aa4a8e4e22f46cbb988dec0f001350a~mv2.png/v1/fill/w_718,h_480,al_c,q_85,enc_avif,quality_auto/x.png",
    filename: "maywood-sustainability-3.png",
    alt: "Cross-section detail of Maywood engineered oak board construction.",
  },
  galleryHero: {
    local: "g1_galleryhero.png",
    url: "https://static.wixstatic.com/media/eb4477_c0b458a36b24464692475acd65510aff~mv2.png/v1/fill/w_1520,h_443,al_c,q_90,enc_avif,quality_auto/x.png",
    filename: "maywood-gallery-hero.png",
    alt: "Maywood timber flooring in a luxury Melbourne interior.",
  },
} satisfies Record<string, ImageSpec>;

/** 8 张资源卡（顺序对照 #59 Resources：8 类）。 */
interface ResourceSpec {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  /** 倒序发布时间，保证 order(publishedAt desc) 下与 #59 列表顺序一致。 */
  publishedAt: string;
  image: ImageSpec;
}

const RESOURCES: ResourceSpec[] = [
  {
    id: "resource.brochures",
    title: "Brochures",
    category: "Brochures",
    excerpt:
      "Browse the Maywood range — collection overviews, timber species, finishes and specifications in one place.",
    publishedAt: "2026-06-08T00:00:00Z",
    image: {
      local: "r1_brochures.png",
      url: "https://static.wixstatic.com/media/eb4477_e6d022a37b2843c7b832b6b3716639a9~mv2.png/v1/crop/x_0,y_516,w_912,h_755/fill/w_806,h_668,al_c,q_90,enc_avif,quality_auto/x.png",
      filename: "maywood-resource-brochures.png",
      alt: "Maywood timber flooring brochure cover.",
    },
  },
  {
    id: "resource.technical-data-sheets",
    title: "Technical Data Sheets",
    category: "Product Data",
    excerpt:
      "Detailed technical specifications — dimensions, construction, wear layer, finish and performance data for every collection.",
    publishedAt: "2026-06-07T00:00:00Z",
    image: {
      local: "r2_techdata.png",
      url: "https://static.wixstatic.com/media/eb4477_01646320998f448abe169cc719fde905~mv2.png/v1/crop/x_0,y_88,w_1024,h_849/fill/w_806,h_668,al_c,q_90,enc_avif,quality_auto/x.png",
      filename: "maywood-resource-technical-data.png",
      alt: "Maywood flooring technical data sheet cover.",
    },
  },
  {
    id: "resource.installation-instruction",
    title: "Installation Instruction",
    category: "Installation",
    excerpt:
      "Step-by-step guidance for floating and direct-stick installation, subfloor preparation and acclimatisation.",
    publishedAt: "2026-06-06T00:00:00Z",
    image: {
      local: "r3_install_clean.jpg",
      url: "https://static.wixstatic.com/media/eb4477_39409000efcc4eec9f9e1fd24270d09f~mv2.png/v1/crop/x_0,y_88,w_1024,h_849/fill/w_806,h_668,al_c,q_90,quality_auto/x.jpg",
      filename: "maywood-resource-installation.jpg",
      alt: "Maywood flooring installation guide cover.",
    },
  },
  {
    id: "resource.care-maintenance",
    title: "Care & Maintenance",
    category: "Care & Maintenance",
    excerpt:
      "How to clean and protect your Maywood floor for lasting beauty — recommended products and everyday care.",
    publishedAt: "2026-06-05T00:00:00Z",
    image: {
      local: "r4_care.jpg",
      url: "https://static.wixstatic.com/media/eb4477_17875097839845b89416707446900b77~mv2.jpg/v1/crop/x_49,y_0,w_927,h_768/fill/w_806,h_668,al_c,q_85,enc_avif,quality_auto/x.jpg",
      filename: "maywood-resource-care.jpg",
      alt: "Maywood flooring care and maintenance guide cover.",
    },
  },
  {
    id: "resource.warranty-guide",
    title: "Warranty Guide",
    category: "Warranty",
    excerpt:
      "Maywood warranty terms and coverage for residential and commercial timber, laminate and hybrid flooring.",
    publishedAt: "2026-06-04T00:00:00Z",
    image: {
      local: "r2_techdata.png",
      url: "https://static.wixstatic.com/media/eb4477_01646320998f448abe169cc719fde905~mv2.png/v1/crop/x_0,y_88,w_1024,h_849/fill/w_806,h_668,al_c,q_90,enc_avif,quality_auto/x.png",
      filename: "maywood-resource-warranty.png",
      alt: "Maywood flooring warranty guide cover.",
    },
  },
  {
    id: "resource.fire-test-report",
    title: "Fire Test Report",
    category: "Compliance",
    excerpt:
      "Independent fire performance test results for Maywood flooring, for specification and building compliance.",
    publishedAt: "2026-06-03T00:00:00Z",
    image: {
      local: "r6_firetest.png",
      url: "https://static.wixstatic.com/media/eb4477_96ee205a6ecc42daa2cd04867de5e111~mv2.png/v1/crop/x_0,y_1052,w_3136,h_2599/fill/w_806,h_668,al_c,q_90,enc_avif,quality_auto/x.png",
      filename: "maywood-resource-fire-test.png",
      alt: "Maywood flooring fire test report cover.",
    },
  },
  {
    id: "resource.slip-test-report",
    title: "Slip Test Report",
    category: "Compliance",
    excerpt:
      "Slip resistance test results to support safe specification across residential and commercial applications.",
    publishedAt: "2026-06-02T00:00:00Z",
    image: {
      local: "r7_sliptest_clean.jpg",
      url: "https://static.wixstatic.com/media/eb4477_c58eb7fc38444449871050bf93d6dd11~mv2.png/v1/crop/x_0,y_88,w_1024,h_849/fill/w_806,h_668,al_c,q_90,quality_auto/x.jpg",
      filename: "maywood-resource-slip-test.jpg",
      alt: "Maywood flooring slip test report cover.",
    },
  },
  {
    id: "resource.voc-emission",
    title: "VOC Emission",
    category: "Compliance",
    excerpt:
      "Low-VOC and E1 formaldehyde emission test results — healthier indoor air quality for your project.",
    publishedAt: "2026-06-01T00:00:00Z",
    image: {
      local: "r8_voc.png",
      url: "https://static.wixstatic.com/media/eb4477_c9a596e7aa8c4829b9584cc22652639e~mv2.png/v1/crop/x_0,y_88,w_1024,h_849/fill/w_806,h_668,al_c,q_90,enc_avif,quality_auto/x.png",
      filename: "maywood-resource-voc.png",
      alt: "Maywood flooring VOC emission test report cover.",
    },
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** 读取图片字节：优先本地副本，缺失则按 URL 下载（带一次重试）。 */
async function loadBytes(spec: ImageSpec): Promise<Buffer | null> {
  const localPath = join(IMAGES_DIR, spec.local);
  if (existsSync(localPath)) return readFileSync(localPath);
  let buf: Buffer | null = null;
  for (let attempt = 0; attempt < 2 && !buf; attempt++) {
    if (attempt > 0) await sleep(2000);
    buf = await fetchBuffer(spec.url);
  }
  return buf;
}

/** 按 stable filename 去重；存在则复用，否则上传本地/远程字节。 */
async function ensureAsset(
  client: SanityClient,
  spec: ImageSpec
): Promise<string | null> {
  const existing: string | null = await client.fetch(
    `*[_type=="sanity.imageAsset" && originalFilename==$f]|order(_createdAt desc)[0]._id`,
    { f: spec.filename }
  );
  if (existing) return existing;
  const bytes = await loadBytes(spec);
  if (!bytes) {
    console.warn(`  ✗ 无字节，跳过 ${spec.filename}`);
    return null;
  }
  try {
    const asset = await client.assets.upload("image", bytes, {
      filename: spec.filename,
    });
    return asset._id;
  } catch (e) {
    console.warn(`  上传失败 ${spec.filename}: ${(e as Error).message}`);
    return null;
  }
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

  console.log(`灌入 #59 第二批配图 → Sanity（${PROJECT_ID}/${DATASET}）`);

  // 先把所有图片上传/复用为资产，拿到 assetId。
  const ids: Record<string, string | null> = {};
  for (const [key, spec] of Object.entries(IMAGES)) {
    ids[key] = await ensureAsset(client, spec as ImageSpec);
    console.log(`  ${ids[key] ? "✓" : "✗"} ${key} → ${spec.filename}`);
  }

  // 1) Manor 系列 heroImage。
  if (ids.manor) {
    const manorId: string | null = await client.fetch(
      `*[_type=="productCollection" && slug.current=="manor"][0]._id`
    );
    if (manorId) {
      await client
        .patch(manorId)
        .set({ heroImage: imageField(ids.manor, IMAGES.manor.alt) })
        .commit();
      console.log("  ✓ productCollection(manor).heroImage");
    } else {
      console.warn("  ✗ 未找到 manor 系列文档");
    }
  }

  // 2/3) 首页 homePage 单例：sustainabilityImage + silentFoundationImage。
  {
    const patch: Record<string, unknown> = {};
    if (ids.homeSustainability)
      patch.sustainabilityImage = imageField(
        ids.homeSustainability,
        IMAGES.homeSustainability.alt
      );
    if (ids.silentFoundation)
      patch.silentFoundationImage = imageField(
        ids.silentFoundation,
        IMAGES.silentFoundation.alt
      );
    if (Object.keys(patch).length) {
      await client.createIfNotExists({ _id: "homePage", _type: "homePage" });
      await client.patch("homePage").set(patch).commit();
      console.log(`  ✓ homePage ← ${Object.keys(patch).join(", ")}`);
    }
  }

  // 4) About「Trusted Partner」分区配图。
  if (ids.aboutTrustedPartner) {
    const aboutId: string | null = await client.fetch(
      `*[_type=="page" && slug.current=="about-us"][0]._id`
    );
    if (aboutId) {
      await client
        .patch(aboutId)
        .set({
          sectionImages: [
            imageField(ids.aboutTrustedPartner, IMAGES.aboutTrustedPartner.alt),
          ],
        })
        .commit();
      console.log("  ✓ page(about-us).sectionImages[0]");
    } else {
      console.warn("  ✗ 未找到 about-us page 文档");
    }
  }

  // 5) Sustainability 三大支柱分区配图（按顺序）。
  {
    const pillars = [
      ids.sustainability1 &&
        imageField(ids.sustainability1, IMAGES.sustainability1.alt),
      ids.sustainability2 &&
        imageField(ids.sustainability2, IMAGES.sustainability2.alt),
      ids.sustainability3 &&
        imageField(ids.sustainability3, IMAGES.sustainability3.alt),
    ].filter(Boolean);
    const susId: string | null = await client.fetch(
      `*[_type=="page" && slug.current=="sustainability"][0]._id`
    );
    if (susId && pillars.length) {
      await client.patch(susId).set({ sectionImages: pillars }).commit();
      console.log(`  ✓ page(sustainability).sectionImages × ${pillars.length}`);
    } else if (!susId) {
      console.warn("  ✗ 未找到 sustainability page 文档");
    }
  }

  // 6) Gallery 顶部 hero 横幅：按需建 page 文档（纯数据容器，不生成路由），patch heroImage。
  if (ids.galleryHero) {
    await client.createIfNotExists({
      _id: "page.gallery",
      _type: "page",
      title: "Gallery",
      slug: { _type: "slug", current: "gallery" },
      legacyPath: "/gallery",
    });
    await client
      .patch("page.gallery")
      .set({ heroImage: imageField(ids.galleryHero, IMAGES.galleryHero.alt) })
      .commit();
    console.log("  ✓ page(gallery).heroImage");
  }

  // 7) Resources 8 张资源卡：createIfNotExists（不覆盖站主编辑）+ patch 配图/文案。
  for (const r of RESOURCES) {
    const assetId = await ensureAsset(client, r.image);
    await client.createIfNotExists({
      _id: r.id,
      _type: "resource",
      title: r.title,
      slug: { _type: "slug", current: r.id.replace(/^resource\./, "") },
      category: r.category,
      excerpt: r.excerpt,
      publishedAt: r.publishedAt,
    });
    const patch: Record<string, unknown> = {
      title: r.title,
      category: r.category,
      excerpt: r.excerpt,
      publishedAt: r.publishedAt,
    };
    if (assetId) patch.heroImage = imageField(assetId, r.image.alt);
    await client.patch(r.id).set(patch).commit();
    console.log(`  ✓ ${r.id}${assetId ? " (+img)" : ""}`);
  }

  console.log("完成。");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
