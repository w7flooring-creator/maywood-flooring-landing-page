# Maywood Flooring — 官网重建

将现有 Wix 站点 [`maywoodflooring.com.au`](https://www.maywoodflooring.com.au/) 按其视觉、结构与
组件颗粒度，用 **Astro + React islands + Sanity + Cloudflare Workers（Static Assets）** 重建。这是一个
**内容驱动的澳洲本地 SEO 获客站**（高端 timber / flooring supplier），不是 Web App。

> 状态：**内容与功能基本就绪**（截至 2026-06-10）。CI + 自动部署运行中，生产站：
> `https://maywood-flooring-landing-page.w7flooring.workers.dev`。全部页面上线；**73 产品 + 图片已迁入
> Sanity**（#10/#11）；**Wix 视觉对齐清单 69/69 完成**（#59）；**表单后端已上线**（#25：Worker +
> Turnstile + Resend，过渡态收件 gmail，见 #73）；Sanity 发布自动重建（webhook → Deploy Hook）。
> **仍待办（HITL）**：DNS 迁 Cloudflare + Resend 域名验证（#73，#27 前置）→ 上线 QA + Lighthouse + DNS 切换（#27）。

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 框架 | [Astro](https://astro.build/)（默认静态生成），仅交互处用 React island |
| 语言 | TypeScript |
| CMS | [Sanity](https://www.sanity.io/)（非技术人员维护内容，public dataset 优先） |
| 组件 | **一套开源库优先：shadcn/ui + Radix**；专项用 Embla / react-hook-form；自己写是最后手段 |
| 样式 | 设计 token（CSS variables）单一来源 + Tailwind（随 shadcn）+ Astro scoped styles |
| 部署 | Cloudflare Workers（Static Assets，`wrangler.jsonc` 发布 `dist/`；prod branch `main`，preview 开启，见 ADR-0002） |
| 表单 | ✅ 同 Worker 加 routes（`worker/index.ts`）+ Turnstile + Resend（#25 已上线；域名验证待 #73） |

## 文档地图

| 文件 | 用途 |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | **Agent 指南单一来源** —— 边界、组件策略、路由、Sanity 模型、SEO、QA、工作流 |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code 入口，`@AGENTS.md` 引入，内容以 AGENTS.md 为准 |
| [`Maywood Flooring 重建 Agent 规范 …md`](./Maywood%20Flooring%20%E9%87%8D%E5%BB%BA%20Agent%20%E8%A7%84%E8%8C%83%203742c25c6ff38140a573e8716eb9c031.md) | 原始完整规范（背景文档） |

开始任何开发前，请先读 [`AGENTS.md`](./AGENTS.md)。

## 组件取用原则

能用一套现成开源组件就用一套，保持交互与风格一致；**自己写组件是最后手段**。
默认套件为 **shadcn/ui（Radix primitives + Tailwind）**，所有外部组件必须 retheme 到品牌
token——看起来要像 Wix 上克制高端的木地板 editorial 品牌，而不是通用 SaaS。
取用优先级与组件→来源映射见 [`AGENTS.md` › 组件策略](./AGENTS.md)。

## 快速开始

```bash
npm install
npm run dev        # 本地开发（http://localhost:4321）
npm run build      # 生产构建（Cloudflare Pages：输出 dist/）
npm run preview    # 本地预览构建产物
npm run check      # astro check 类型检查
```

Sanity Studio 独立安装/启动，见 [`studio/README.md`](./studio/README.md)。

环境变量（写入 `.env`，**不要提交 secrets**）：

```
PUBLIC_SANITY_PROJECT_ID=
PUBLIC_SANITY_DATASET=
SANITY_API_READ_TOKEN=        # 仅 private draft/preview 需要
RESEND_API_KEY=
LEADS_TO_EMAIL=
TURNSTILE_SECRET_KEY=
PUBLIC_TURNSTILE_SITE_KEY=
```

## 关键业务信息（NAP，必须全站一致）

- **电话**：03 8753 5522
- **邮箱**：sales@maywoodflooring.com.au
- **地址**：49-51 Keysborough Ave, Keysborough, VIC 3173
- **WhatsApp**：0422 709 709（+61 422 709 709）

## 部署

Cloudflare Pages：`npm run build` → 输出 `dist/`（单项目）或 `apps/web/dist`（monorepo）；
production branch `main`，preview deployments 开启。Sanity publish webhook 触发 rebuild。
DNS 切换前保持 Wix 在线，待表单 / redirect / sitemap 全部测试通过后再切。
详见 [`AGENTS.md` › 构建 / 部署](./AGENTS.md)。
