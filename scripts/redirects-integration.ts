import type { AstroIntegration } from "astro";
import { generateRedirectsFile } from "./generate-redirects.ts";

/**
 * Astro 集成：在 build 开始前（`astro:config:setup`）生成 `public/_redirects`，
 * 把 Sanity 编辑维护的 redirect 文档合并进静态 booking-calendar 例外（见 scripts/generate-redirects.ts）。
 *
 * 选 `astro:config:setup` 而非 `astro:build:done`：`public/` 在构建早期就被复制进 `dist/`，
 * 必须在那之前写好 `public/_redirects`，Astro 才会把它一并复制到产物。
 * dev 模式同样会跑一次，便于本地核对生成结果。
 */
export function redirectsIntegration(): AstroIntegration {
  return {
    name: "maywood-redirects",
    hooks: {
      "astro:config:setup": async ({ logger }) => {
        try {
          await generateRedirectsFile();
        } catch (error) {
          // 不阻断构建：静态 _redirects 已随仓库提交，最坏退化为仓库内版本。
          logger.warn(
            `生成 _redirects 失败，沿用仓库内已提交版本：${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    },
  };
}
