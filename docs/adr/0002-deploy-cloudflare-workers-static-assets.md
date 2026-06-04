# 用 Cloudflare Workers（Static Assets）部署，而非 Pages

规范原定用 Cloudflare Pages，但 2026 年 Cloudflare 控制台已把建站流程统一到 **Workers**（创建时显示 “Set up your application / Configure your Worker project”，Deploy command = `npx wrangler deploy`），不再提供独立的 Pages 创建路径。因此改用 **Workers + Static Assets**：仓库根的 `wrangler.jsonc` 设 `assets.directory = ./dist`（assets-only，无 Worker 入口脚本），由 `npx wrangler deploy` 把 Astro 构建出的 `dist/` 作为静态资源发布；非生产分支用 `npx wrangler versions upload` 出预览版本。

这是 Cloudflare 当前推荐做法，对纯静态 SSG 站完全适用，并保留了 preview 部署与未来表单能力。

## Consequences

- 站点本质仍是静态（Astro `output: 'static'`），**无需** Astro 的 Cloudflare adapter；`wrangler.jsonc` 只声明静态资源目录。
- **Phase 2 表单**：不再用 “Pages Functions”，改为在同一个 Worker 加入口脚本（`main` + routes）或独立 Worker 处理提交 + Turnstile + Resend。
- 部署命令：生产 `npx wrangler deploy`；预览 `npx wrangler versions upload`（Cloudflare Workers Builds 在 PR / 非 main 分支触发）。
- 构建环境变量（`PUBLIC_SANITY_PROJECT_ID` 等）在 Workers 项目设置里配置；CI 用 GitHub Actions Variables（已设 `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET`）。
