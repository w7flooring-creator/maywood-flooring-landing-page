// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Phase 1：纯静态（SSG）。Cloudflare Pages 直接托管 dist/，无需 adapter。
// 若以后需要 SSR / on-demand 渲染，再加 @astrojs/cloudflare。
// 表单（Phase 2）走 Cloudflare Pages Functions（/functions 目录），与此独立。
export default defineConfig({
  site: "https://www.maywoodflooring.com.au",
  output: "static",
  integrations: [
    react(),
    // @astrojs/sitemap 在 build 后自动发现已生成的静态路由，产出
    // sitemap-index.xml + sitemap-0.xml（见 AGENTS.md「SEO：必须产出 sitemap.xml」）。
    // 排除内部参考页（/style-guide，已 noindex）与 404（非可索引路由）。
    sitemap({
      filter: (page) =>
        !page.includes("/style-guide") && !page.includes("/404"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
