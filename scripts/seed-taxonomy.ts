/**
 * 种子脚本：把 Category（3）+ Collection（9）写入 Sanity production dataset。
 *
 * 运行（项目根目录，机器已用 Sanity CLI 登录）：
 *   npm run seed:taxonomy
 *   # 等价于：node --experimental-strip-types scripts/seed-taxonomy.ts
 *
 * 为什么不用 `sanity exec --with-user-token`：本仓库 studio/ 是 ESM 包
 * （package.json "type":"module"），而 `sanity exec` 用 esbuild-register 的
 * CJS require 钩子加载脚本，对 ESM 图不生效——即使最简单的
 * `import {getCliClient} from "sanity/cli"` 也会报 "Cannot find module 'sanity/cli'"。
 * 故改用 @sanity/client（web 端已依赖）直连，token 取自 Sanity CLI 登录态。
 *
 * 鉴权：复用 Sanity CLI 的登录 token（~/.config/sanity/config.json 的 authToken），
 * 也可用环境变量 SANITY_AUTH_TOKEN 覆盖。无需在仓库存任何 secret。
 *
 * 幂等：种子用确定性 _id（category.* / collection.*）+ createOrReplace，
 * 可安全重复执行——只覆盖这 12 个文档，不触碰其它文档，不产生重复。
 *
 * 数据单一来源：src/lib/taxonomy-seed.ts（同被单元测试消费），本脚本不复制数据。
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@sanity/client";
import { buildSeedDocuments } from "../src/lib/taxonomy-seed.ts";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? "1soy4f28";
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? "production";

/** 取写入用 token：优先环境变量，否则回落到 Sanity CLI 登录态。 */
function resolveToken(): string {
  const fromEnv =
    process.env.SANITY_AUTH_TOKEN ?? process.env.SANITY_API_WRITE_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    const cfgPath = join(homedir(), ".config", "sanity", "config.json");
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as {
      authToken?: string;
    };
    if (cfg.authToken) return cfg.authToken;
  } catch {
    // 落到下方报错
  }
  throw new Error(
    "找不到写入 token：请先 `sanity login`，或设置 SANITY_AUTH_TOKEN 环境变量。"
  );
}

async function run(): Promise<void> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: "2025-01-01",
    token: resolveToken(),
    useCdn: false,
  });

  const docs = buildSeedDocuments();
  console.log(
    `写入 ${docs.length} 个分类法文档到 ${PROJECT_ID}/${DATASET}（createOrReplace，幂等）…`
  );

  // 事务一次性 createOrReplace：要么全成要么全败。
  let tx = client.transaction();
  for (const doc of docs) tx = tx.createOrReplace(doc);
  await tx.commit({ visibility: "sync" });

  for (const doc of docs) {
    const label =
      doc._type === "productCollection"
        ? `${doc.title} → ${doc.category._ref}${doc.isSignature ? " [招牌系列]" : ""}`
        : doc.title;
    console.log(`  ✓ ${doc._type}  ${doc._id}  ${label}`);
  }

  const [catCount, colCount, sigCount] = await Promise.all([
    client.fetch<number>('count(*[_type == "productCategory"])'),
    client.fetch<number>('count(*[_type == "productCollection"])'),
    client.fetch<number>(
      'count(*[_type == "productCollection" && isSignature == true])'
    ),
  ]);

  console.log("\n校验 dataset 实际计数：");
  console.log(`  productCategory      = ${catCount}（期望 3）`);
  console.log(`  productCollection    = ${colCount}（期望 9）`);
  console.log(`  Signature Collection = ${sigCount}（期望 4）`);

  if (catCount !== 3 || colCount !== 9 || sigCount !== 4) {
    throw new Error("校验失败：计数与期望不符。");
  }
  console.log("\n完成。种子幂等，可安全重复执行。");
}

run().catch((err: unknown) => {
  console.error("种子失败：", err);
  process.exit(1);
});
