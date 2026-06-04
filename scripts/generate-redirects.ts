/**
 * Build 时生成 `public/_redirects`：把 Sanity 编辑维护的 `redirect` 文档
 * 与 src/lib/redirects.ts 的静态例外（booking-calendar，ADR-0001）合并。
 *
 * 触发方式：
 * - Astro 集成 `redirectsIntegration`（astro.config.mjs）在 `astro:config:setup`
 *   阶段调用，确保写好的 `public/_redirects` 被 Astro 复制进 `dist/`。
 * - 也可独立运行：`node --experimental-strip-types scripts/generate-redirects.ts`。
 *
 * 健壮性：拉取 Sanity 失败（缺 token / 网络问题）时退化为「仅静态规则」，
 * 不让构建因可选的编辑跳转而失败——静态 booking-calendar 例外永远写出。
 *
 * 注意：本脚本读 `process.env`（Astro 集成内可用），不依赖 `import.meta.env` 别名，
 * 以便脱离 Astro 也能独立运行；序列化逻辑全部复用 src/lib/redirects.ts 的纯函数。
 */
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";
import {
  buildRedirectsFile,
  REDIRECTS_QUERY,
  type RedirectDoc,
} from "../src/lib/redirects.ts";

/** 目标文件：public/_redirects（被 Astro 复制进 dist/）。 */
const OUTPUT_PATH = fileURLToPath(
  new URL("../public/_redirects", import.meta.url)
);

/** 根目录 .env 路径。 */
const ENV_PATH = fileURLToPath(new URL("../.env", import.meta.url));

/**
 * 最小化加载根 `.env` 到 `process.env`（无新依赖）。
 * 本集成在 `astro:config:setup` 阶段跑，此时 Astro 尚未把 dotenv 注入 `process.env`，
 * 而我们需要 PUBLIC_SANITY_* 才能拉编辑维护的 redirect。已存在的真实 env（CI/Cloudflare）
 * 优先，不被覆盖。解析失败（无 .env）静默忽略——退化为仅静态规则。
 */
function loadDotEnv(): void {
  let raw: string;
  try {
    raw = readFileSync(ENV_PATH, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue; // 不覆盖既有 env
    let value = trimmed.slice(eq + 1).trim();
    // 去掉成对引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/** 从 Sanity 拉编辑维护的 redirect 文档；任何失败都回退空数组。 */
async function fetchRedirectDocs(): Promise<RedirectDoc[]> {
  loadDotEnv();
  const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.PUBLIC_SANITY_DATASET ?? "production";
  if (!projectId) {
    console.warn(
      "[generate-redirects] 缺 PUBLIC_SANITY_PROJECT_ID，仅写静态规则。"
    );
    return [];
  }
  try {
    const token = process.env.SANITY_API_READ_TOKEN;
    const client = createClient({
      projectId,
      dataset,
      apiVersion: "2025-01-01",
      token: token || undefined,
      useCdn: !token,
    });
    const docs = await client.fetch<RedirectDoc[]>(REDIRECTS_QUERY);
    return Array.isArray(docs) ? docs : [];
  } catch (error) {
    console.warn(
      "[generate-redirects] 拉取 Sanity redirect 失败，仅写静态规则：",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/** 生成并写出 public/_redirects；返回写入的文件内容。 */
export async function generateRedirectsFile(): Promise<string> {
  const docs = await fetchRedirectDocs();
  const content = buildRedirectsFile(docs);
  await writeFile(OUTPUT_PATH, content, "utf8");
  console.log(
    `[generate-redirects] 已写 public/_redirects（编辑维护规则 ${docs.length} 条 + 静态例外）。`
  );
  return content;
}

// 直接运行（非被 import）时执行一次生成。
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateRedirectsFile().catch((error) => {
    console.error("[generate-redirects] 生成失败：", error);
    process.exitCode = 1;
  });
}
