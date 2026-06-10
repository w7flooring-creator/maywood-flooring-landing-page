/**
 * 灌入 #59 Wix 对齐的「高置信度文本内容」到 Sanity（不依赖图片素材）。
 *
 * 运行（机器已 sanity login）：
 *   npm run seed:wix-align
 *
 * 做的事（全部 patch by slug，幂等；只 set，不删其它字段）：
 *  1. 三个分类的 intro 描述（productCategory.description）。
 *     - Laminate（solid-flooring）/ Hybrid（sustainable-flooring）用**修正后**文案，
 *       不照抄 Wix 的内容债（“solid timber” / “sustainable… managed forests”）。
 *  2. 招牌系列 tagline（productCollection.tagline）—— 四条全部灌入。
 *     PureGrain / Bushland 源自 #59 清单；Manor / Bellavale 于 2026-06 从 Wix
 *     首页 Signature 卡 + 各自 collection 落地页 hero 双源核对取得（见 #13）。
 *  3. Bushland 系列叙事（productCollection.description）—— 基于**已核实事实**
 *     （Blackbutt / Spotted Gum / Herringbone 澳洲原生材、engineered 多层结构、matte 饰面）
 *     的克制 editorial 文案；不编造未核实规格（如确切 wear layer mm / 树种）。
 *  4. toffee-chervon 产品 surfaceCoating = "UV Lacquer"（#59 清单确认的 Wix 规格行）。
 *
 * 鉴权：复用 Sanity CLI 登录 token（~/.config/sanity/config.json authToken），
 * 同 import-home-images.ts / import-products.ts。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";

/** 分类 intro 描述（按 slug）。Laminate/Hybrid 为修正后准确文案。 */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "engineered-flooring":
    "Maywood's engineered timber flooring pairs a genuine hardwood wear surface with a dimensionally stable multi-layer core, delivering the warmth and grain of natural timber with far greater resistance to Australia's changing climate. It suits both floating and direct-stick installation across bespoke homes, apartments and commercial fit-outs.",
  // 修正内容债：Laminate ≠ “solid timber”。准确描述层压地板构造。
  "solid-flooring":
    "Maywood's laminate flooring recreates the look of natural timber through a high-definition decorative layer fused to a dense HDF core and sealed beneath a tough, scratch-resistant wear layer. Hard-wearing and easy to maintain, it is a cost-effective choice for busy residential and commercial spaces.",
  // 修正内容债：Hybrid ≠ “sustainable… managed forests”。准确描述硬芯防水构造。
  "sustainable-flooring":
    "Maywood's hybrid flooring unites the water resistance of vinyl with the rigidity of laminate in a single rigid-core plank. Fully waterproof and built for heavy traffic, temperature change and everyday spills, it is engineered for the realities of Australian homes — including kitchens, laundries and other wet areas.",
};

/** 招牌系列 tagline（按 slug）。四条均经 Wix 双源核对（#13）。 */
const COLLECTION_TAGLINES: Record<string, string> = {
  puregrain: "The Purest Expression of Timber",
  bushland: "The Essence of the Australian Landscape",
  manor: "The Timeless Art of Geometry",
  bellavale: "Architectural Precision & Perspective",
};

/** 系列叙事（按 slug）。基于已核实事实，避免未核实规格。 */
const COLLECTION_DESCRIPTIONS: Record<string, string> = {
  bushland:
    "The Bushland Series draws its character from the Australian landscape — the warm tones, open grain and quiet strength of our native hardwoods. The range captures that spirit in species such as Blackbutt and Spotted Gum, including a refined herringbone format for more considered spaces.\n\nBuilt as an engineered floor, every plank pairs a genuine timber wear surface with a dimensionally stable multi-layer core, so the natural beauty of Australian timber stays settled through our changing climate. A soft matte finish keeps the look honest and contemporary, letting the grain — not the gloss — lead.",
};

/** 产品 surfaceCoating（按 slug）。 */
const PRODUCT_SURFACE_COATING: Record<string, string> = {
  "toffee-chervon": "UV Lacquer",
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

/** 按 _type + slug 取文档 _id（不存在则 null）。 */
async function idBySlug(
  client: SanityClient,
  type: string,
  slug: string
): Promise<string | null> {
  return client.fetch<string | null>(
    `*[_type == $type && slug.current == $slug][0]._id`,
    { type, slug }
  );
}

/** 对一组「slug → 字段值」做幂等 patch（仅当文档存在）。 */
async function patchBySlug(
  client: SanityClient,
  type: string,
  field: string,
  bySlug: Record<string, string>
): Promise<void> {
  for (const [slug, value] of Object.entries(bySlug)) {
    const id = await idBySlug(client, type, slug);
    if (!id) {
      console.warn(`  ⚠ 跳过：找不到 ${type} slug="${slug}"`);
      continue;
    }
    await client
      .patch(id)
      .set({ [field]: value })
      .commit();
    console.log(`  ✓ ${type}/${slug} .${field} 已写入`);
  }
}

async function main(): Promise<void> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  console.log("[1/4] 分类 intro 描述（含 Laminate/Hybrid 修正文案）");
  await patchBySlug(
    client,
    "productCategory",
    "description",
    CATEGORY_DESCRIPTIONS
  );

  console.log("[2/4] 招牌系列 tagline（PureGrain / Bushland）");
  await patchBySlug(
    client,
    "productCollection",
    "tagline",
    COLLECTION_TAGLINES
  );

  console.log("[3/4] Bushland 系列叙事 description");
  await patchBySlug(
    client,
    "productCollection",
    "description",
    COLLECTION_DESCRIPTIONS
  );

  console.log("[4/4] toffee-chervon surfaceCoating = UV Lacquer");
  await patchBySlug(
    client,
    "product",
    "surfaceCoating",
    PRODUCT_SURFACE_COATING
  );

  console.log("完成。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
