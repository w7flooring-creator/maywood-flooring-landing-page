# AGENTS.md — Maywood Flooring 重建

> 本文件是所有 Agent 指南的**单一来源**。[`CLAUDE.md`](./CLAUDE.md) 仅 `@AGENTS.md` 引入本文件，
> 两者内容一致——规则只在此维护，不要在 CLAUDE.md 里另写。
> 完整背景见 [`Maywood Flooring 重建 Agent 规范.md`](./Maywood%20Flooring%20%E9%87%8D%E5%BB%BA%20Agent%20%E8%A7%84%E8%8C%83%203742c25c6ff38140a573e8716eb9c031.md)；
> 本文件是该规范的工作版精简与补充，两者冲突时以本文件为准。

## TL;DR

把现有 Wix 站点 `https://www.maywoodflooring.com.au/` 按其视觉、结构和组件颗粒度，用
**Astro（静态优先）+ React islands + Sanity CMS + Cloudflare Workers（Static Assets）** 重建。
这是一个**内容驱动的 SEO 获客站**，不是 Web App。保留品牌风格、保留 legacy URL、SEO 是核心目标。

| 维度 | 决策 |
| --- | --- |
| 框架 | Astro（默认 SSG），仅交互处用 React island |
| 语言 | TypeScript |
| CMS | Sanity（非技术人员维护内容，public dataset 优先） |
| 部署 | Cloudflare Workers（Static Assets，发布 `dist/`），prod branch = `main`，preview 开启（见 ADR-0002）|
| 表单 | Phase 2 用 Cloudflare Worker（同 Worker 加 routes 或独立 Worker）+ Turnstile + Resend |
| 语言范围 | 仅英语（澳洲拼写），i18n 预留不实现 |
| 组件 | **优先用一套开源库（默认 shadcn/ui + Radix），自己写是最后手段** —— 见「组件策略」 |
| 样式 | 设计 token（CSS variables）单一来源；随 shadcn 采用 Tailwind + Astro scoped styles |

## 当前状态（2026-06-04，活跃开发中）

**已是成熟代码库**（不再是空壳）：Astro 5 + Tailwind v4 + React islands + Sanity + Cloudflare Workers（Static Assets）；
CI（lint/typecheck/test/build）+ branch protection + 自动部署齐备；生产站在线：
`https://maywood-flooring-landing-page.w7flooring.workers.dev`。

**已完成（23 个 issue）**：设计 token/字体、全局 Header/Footer、SEO 基础（SeoHead + JSON-LD + Breadcrumbs）、
Sanity schema（分类法 + product + 其余 11 类）并 seed 分类法、首页、分类页、产品页、Signature 落地页、
Contact、Request-Sample、内容页（About/Sustainability/Resources）、Gallery、Service/booking 降级页、Projects、
FAQ、sitemap/robots/404、legacy redirect map。

**仍待办（HITL）**：
- **#10 / #11**：从 Wix 导出产品 CSV + 下载图片 → 灌入 Sanity。**分类/产品页目前是空网格，迁移后才有真实内容（~73 产品）。**
- **#25**：Contact/Sample 表单后端（Cloudflare Worker + Turnstile + Resend）。
- **#27**：上线 QA + Lighthouse + DNS 切换。

> 关键决策见 `docs/adr/`：ADR-0001（legacy URL 平迁）、0002（Workers Static Assets 部署）、0003（Sanity build read token）。
> Wix 参考素材（2026-06-03 抓取，**不在仓库内**）：`~/Desktop/` 截图 + `~/Desktop/.playwright-mcp/*.yml` DOM 快照。
> 若 Wix 站点可能已变化，复刻前先重新抓取截图 / sitemap / 页面结构。

## 关键业务事实（NAP — 必须全站一致）

- **Phone**：`03 8753 5522`
- **Email**：`sales@maywoodflooring.com.au`
- **Address**：`49-51 Keysborough Ave, Keysborough, VIC 3173`
- **地理 SEO 关键词**：Melbourne、Keysborough、VIC、Australia
- **行业 badge**：ATFA（页脚）
- 定位：高端 timber / flooring supplier，面向 wholesale、trade、澳洲本地获客
- **WhatsApp**：`0422 709 709`（国际 +61 422 709 709；`WhatsAppCta` 链接 `https://wa.me/61422709709`）

## 第一个 Agent 的起步顺序

1. 决定仓库形态：**单 Astro 项目内含 `studio/`**（小规模，推荐起步）或 **monorepo `apps/web` + `apps/studio`**。规范建议小规模用单项目。
2. 初始化 Astro + TypeScript 项目；Cloudflare 部署用 Workers Static Assets（`wrangler.jsonc` 指向 `dist/`，无需 Astro adapter；见 ADR-0002）。
3. 接入 Sanity client（build-time 拉取），建立 schema（见下）。
4. 先做**全局组件 + 设计 token**，再做页面。
5. 用截图逐页复刻，桌面 + 移动端都要对照。

## 不可逾越的边界（Wix 迁移）

**不要**围绕「导出 Wix 代码」设计方案。Wix 渲染后的 HTML/CSS/JS 不是可维护源码。

✅ 允许的迁移输入：公开截图、公开 DOM/文本快照、sitemap URL、确认归属后从 Wix Media Manager 下载的图片、Wix CMS/Stores 导出的 CSV、手工整理的文案/SEO/参数/联系方式。

🚫 禁止作为实现基础：Wix Thunderbolt bundles、`static.parastorage.com` 运行时代码、**生产环境热链 Wix 图片**、按 Wix 自动生成的 DOM id/class 设计架构。

## 视觉方向

保留克制、高端、editorial 的木地板行业语言。**不要**改成通用 SaaS/AI landing page（无紫色渐变、无 dashboard 卡片、无 icon wall、无无关 hero mockup、无随意动画）。

观察到的风格 → 建议设计 token 起点：

```css
:root {
  /* 颜色 */
  --color-ink: #000;            /* 黑色高对比 header/footer */
  --color-bg: #fff;             /* 白 / 近白页面背景 */
  --color-bg-muted: #f4f2ef;    /* signature collections 等灰背景区 */
  --color-cta: #1a1a1a;         /* 深色圆角小 CTA 按钮 */
  /* 字体 */
  --font-serif: /* 高端 serif，主导 logo 和大标题 */;
  --font-sans: /* 正文 */;
  /* 节奏 */
  --radius-cta: 4px;
  --space-section: clamp(4rem, 8vw, 8rem); /* 大留白，慢节奏 */
}
```

✅ 允许的优化：responsive、accessibility、SEO 语义、明显拼写修复（如 `Gallary` → `Gallery`，除非旧 URL 必须保留拼写）、spacing 一致性、图片压缩。

## 组件策略（自己写组件 = 最后手段）

核心原则：**能用一套现成开源组件就用一套，保持交互与风格一致；自己写是最后手段。**
所有外部组件合入前必须 retheme 到品牌 token，并通过这一关：
「它看起来像 Wix 上那个克制高端的木地板 editorial 品牌，而不是通用 SaaS landing page。」

### 选定的一套（默认）

- **shadcn/ui（基于 Radix UI primitives + Tailwind）** —— 作为**唯一**的交互/无障碍基础，
  覆盖 accordion、dialog、drawer/sheet、tabs、dropdown、tooltip、form 控件、button 等。
  - copy-in 模式：组件代码进 repo 由你拥有，不是笨重 runtime 依赖，符合规范「不引入笨重 UI framework」。
  - 完全可主题化：**必须**用品牌 token 重写，去掉 shadcn 默认中性灰外观，禁止 SaaS 渐变。
  - 工作于 React islands。
  - ⚠️ 选 shadcn = 正式采用 **Tailwind**（规范允许「项目明确选型」时使用）。Tailwind 必须消费同一套
    设计 token（CSS variables），与 Astro scoped styles 共存，token 保持单一来源。
  - 不想用 Tailwind 的 fallback：**Radix UI primitives（unstyled）+ 自写 scoped CSS** —— 仍是同一套
    行为/无障碍库，只是样式全自理。其余取用优先级不变。

> 硬规则：**全站只用一套 primitive 系统**。不要混用 Radix + Headless UI + MUI + Ant 等。

### 专项 headless 库（shadcn 不覆盖时）

- 轮播 / `ProductImageGallery` / `GalleryFeed` → **Embla Carousel**（轻量 headless，可主题化）。
- 图库 lightbox → **yet-another-react-lightbox** 或 **PhotoSwipe**。
- 表单逻辑与校验 → **react-hook-form + zod**（UI 用 shadcn form 控件）。
- 图标 → **lucide**（shadcn 默认配套）或静态页用 **astro-icon**；全站统一一套图标。
- 动效（克制使用）→ **Motion（Framer Motion）**，仅用于 editorial 风格的 scroll reveal / 渐入，
  不做花哨弹跳或自动播放动画。

### 「好看好玩」组件来源（谨慎挑选 + 必须 retheme）

仅用于特殊营销区块（hero、gallery feed、brand statement 等）。逐个挑选与 editorial 调性相符的，
**禁止**整套照搬、**禁止**霓虹渐变 SaaS 风：

- **Magic UI** / **Motion-Primitives** —— marquee、文字渐显、subtle reveal、image comparison。
- **Aceternity UI** —— 个别高级感效果，强 retheme 后才用。
- 选用前自检：暖色木纹 editorial？大留白慢节奏？serif 大标题？不符就不用。

### 组件取用优先级（从上往下，到最后才自己写）

1. **shadcn/ui (Radix)** —— 标准交互 primitive 先在这里找。
2. **专项 headless 库** —— Embla / lightbox / react-hook-form 等 shadcn 未覆盖的。
3. **curated「好看好玩」集合** —— 仅特殊区块，挑选 + retheme。
4. **自写组件** —— 以上都不合适时才写；必须达到品牌视觉 + a11y 标准，并在 PR 里说明为何无法复用现成件。

### 组件需求映射（建议落点）

| 需求 | 建议来源 |
| --- | --- |
| `FaqAccordion` / `FaqAccordionIsland` | shadcn Accordion (Radix) |
| `MobileNav` | shadcn Sheet / Radix Dialog |
| `ProductImageGallery` / `ImageGalleryIsland` | Embla Carousel + lightbox |
| `ProductFilterIsland` | Radix Select/Checkbox + 自有筛选逻辑 |
| `ContactFormIsland` / `SampleRequestIsland` | react-hook-form + zod + shadcn form 控件 |
| CTA / `SampleRequestButton` / `WhatsAppCta` | shadcn Button，retheme 成深色圆角小按钮 |
| `MapEmbed` | 原生 iframe / 静态地图，无需库 |

> 下面「组件颗粒度」是要落地的组件**清单**；实现每个时先按上面的优先级从现成库取，不要从零写。

## 组件颗粒度（必须可复用，禁止一次性大块页面）

**全局**：`SiteHeader` `Logo` `PrimaryNav` `SampleRequestButton` `MobileNav` `SiteFooter` `SocialLinks` `AtfaBadge` `Breadcrumbs` `SeoHead` `StructuredData`

**首页**：`HomeHero` `ProductSelectionGrid` `ProductSelectionCard` `PartnerNarrativeSection` `SilentFoundationSection` `SignatureCollectionsSection` `SignatureCollectionCard` `BrandStatementSection` `GalleryFeedSection` `HomeCtaSection`

**分类/列表**：`CategoryHero` `CategorySidebar` `CategorySidebarGroup` `ProductGrid` `ProductCard` `ProductCount` `CategoryIntro`

**产品详情**：`ProductBreadcrumbs` `ProductImageGallery` `ProductTitle` `ProductSpecList` `ProductSpecItem` `ProductInquiryCta` `RelatedProducts`

**Contact**：`ContactHeroFormSplit` `ContactForm` `ContactInfoColumns` `OpeningHours` `MapEmbed` `WhatsAppCta`

**内容页**：`RichTextRenderer` `HeroImageSection` `EditorialTextBlock` `ImageTextSplit` `GalleryGrid` `FaqAccordion` `CaseStudyCard` `BlogCard` `LocationSeoContent`

**React islands（仅交互处）**：`ContactFormIsland` `SampleRequestIsland` `ProductFilterIsland` `ImageGalleryIsland` `FaqAccordionIsland`，未来 `QuotePlannerIsland`

> 默认 Astro 静态组件。只有需要浏览器状态/事件/表单/筛选/轮播/折叠时才用 React。island 保持小而独立；不要默认加 `useMemo`/`useCallback`；不要把整站包成 React app。

## 路由（保留 Wix 结构，禁止随意改 URL）

```
src/pages/index.astro
src/pages/resources.astro
src/pages/gallery.astro
src/pages/book-online.astro
src/pages/contact.astro
src/pages/about-us.astro
src/pages/sustainability.astro
src/pages/[slug].astro              # collection landing: bushland, bellavale, manor, puregrain ...
src/pages/category/[slug].astro     # Category（3）+ Collection 的 store 视图（9）
src/pages/product-page/[slug].astro # 约 73 个产品，实现时从 sitemap 拉全量
src/pages/projects/[slug].astro
src/pages/service-page/[slug].astro
```

**Category（3 个；slug ⚠️ 与展示名不符——故意保留，见 ADR-0001，禁止顺手改）**：
- `engineered-flooring` → 展示「Engineered Flooring」（首页入口卡称 “Timber”）— 名实相符
- `solid-flooring` → 展示「**Laminate** Flooring」— ⚠️ slug 误导
- `sustainable-flooring` → 展示「**Hybrid** Flooring」— ⚠️ slug 误导

**Collection（9 个 = Wix 旧「子分类」；每个归属一个 Category，术语见 `CONTEXT.md`）**：
- Engineered：`puregrain` `bushland` `manor` `bellavale`（= 4 个 Signature Collection，另有营销落地页 `/<slug>`）
- Laminate：`aquaglow-72hr` `mtf-24hr-water-resistant` `hydrocore`
- Hybrid：`duro-plus` `guardian`

> **URL 策略见 ADR-0001**：Phase 1 全部 legacy URL 原样保留，**不改 slug、不 301**。术语 Category/Collection 见 `CONTEXT.md`。
> `/<collection>` 营销落地页与 `/category/<collection>` store 视图近重复 → 两者都留，用 `rel=canonical` 指向 `/<collection>`。
> **内容债（不动 URL、现在就修）**：Laminate 页 intro 误写 “solid timber”、Hybrid 页误写 “sustainable… managed forests”，改成与页面实际内容相符。
> booking/service 处理见底部「已敲定决策」。

## 页面结构要点

- **首页**：黑 Header + 大 logo + nav + sample CTA → Hero（室内图 + 白色内容面板 + H1 + tagline + `READ MORE`）→ Product selection 四入口（Timber / Laminate / Hybrid / Accessories）→ Professional partner 双栏 → `The Silent Foundation` 文字区 → 灰底 signature collections（居中堆叠卡片）→ Brand philosophy → Gallery/social feed → Footer。
- **分类页**：Header → Breadcrumbs → 宽幅 muted hero → H1 + 描述 → 左侧 `Browse by` sidebar → product count → 桌面三列网格（图 + 名）→ Footer。
- **产品详情**：Header → Breadcrumbs（Home > All Products > Product）→ 大图 → 标题 → 纵向规格列表 → Footer。规格字段：**Type、Dimension、Pack Size、Pack Weight、Finish、Bevel、Profile、Grade、Environmental Rate**。
- **Contact**：Header → 左右分栏（左图叠标题，右表单：First Name / Last Name / Email / Message / Send）→ `Contact Us`（Address / Contact / Opening Hours）→ Map embed → Footer。

## Sanity CMS 模型

非技术人员必须能在 Studio 内创建/编辑产品、分类、案例、博客、FAQ、页面，**无需接触 GitHub**。字段 label/description 清晰，重要页面 SEO 字段加 validation。免费层优先 public dataset。

**Document types**：`siteSettings` `navigation` `homePage` `page` `product` `productCategory` `productCollection` `caseStudy` `blogPost` `resource` `faq` `locationPage` `service` `galleryImage` `redirect` `seoSettings`

**`product`**：`title` `slug` `legacyPath` `status` `category` `collection` `shortDescription` `mainImage` `gallery` `type` `dimensions` `packSize` `packWeight` `finish` `bevel` `profile` `grade` `environmentalRate` `waterResistance` `material` `colourTone` `installationMethod` `applications` `downloads` `relatedProducts` `seo`

**`productCategory`**：`title` `slug` `legacyPath` `description` `heroImage` `parent` `children` `sortOrder` `seo`

**`caseStudy`**：`title` `slug` `location` `projectType` `productsUsed` `summary` `body` `images` `seo`

**`blogPost` / `resource`**：`title` `slug` `excerpt` `heroImage` `body` `category` `relatedProducts` `faqs` `publishedAt` `seo`

**`locationPage`**：`title` `slug` `city` `state` `serviceArea` `intro` `body` `relatedProducts` `relatedCaseStudies` `faqs` `seo`

**`seo` object**：`metaTitle` `metaDescription` `canonicalUrl` `ogImage` `noIndex` `structuredDataType`

## SEO（核心目标，非上线后附加项）

每页必须：唯一 title、唯一 meta description、canonical URL、Open Graph、响应式图 + 有意义 alt、唯一 H1、语义 landmarks（`header`/`nav`/`main`/`footer`）；分类页与产品页要 breadcrumb schema。

**结构化数据**：全站 `LocalBusiness`；产品页 `Product`；分类/产品页 `BreadcrumbList`；FAQ `FAQPage`；博客/资源 `Article`/`BlogPosting`。

**必须产出**：`sitemap.xml`、`robots.txt`、404 页、旧 Wix URL 的 redirect map。

**澳洲 SEO**：澳洲拼写与本地表达；自然语境提及 Melbourne/Keysborough/VIC/Australia；location landing 预留但不做低质重复内容；NAP 一致（见上）。

## 表单与获客（分阶段）

- **Phase 1**：Contact form 发询盘邮件；Request sample CTA 打开表单或跳转；提供 phone/email/WhatsApp CTA。
- **Phase 2**：Cloudflare Worker（Static Assets 同 Worker 加 routes，或独立 Worker）处理提交 + Turnstile 防垃圾 + Resend 发信；除非明确需要不存敏感数据。
- **Phase 3**：CRM、自动报价、样品追踪、预约。

**环境变量**（不要提交 secrets）：
`PUBLIC_SANITY_PROJECT_ID` `PUBLIC_SANITY_DATASET` `SANITY_API_READ_TOKEN`(build 时拉取内容必需，见 ADR-0003) `RESEND_API_KEY` `LEADS_TO_EMAIL` `TURNSTILE_SECRET_KEY` `PUBLIC_TURNSTILE_SITE_KEY`

## 实现标准

- **Astro**：默认 SSG；public 页 build-time 从 Sanity 拉；layouts + components 处理静态结构；SEO 页不做 client-side routing。
- **CSS / 组件**：设计 token（CSS variables）单一来源；随 shadcn 采用 Tailwind（配置消费同一 token）+ Astro scoped styles；交互组件**优先取自选定库**（见「组件策略」），不引入笨重 UI framework（MUI/Bootstrap 等），自己写组件是最后手段。
- **图片**：生产**不热链 Wix**；确认归属后下载/导出上传 Sanity 或入 repo；响应式 + 压缩；保留暖色室内/木纹/展厅/仓库/项目调性；below-the-fold lazy load。
- **A11y**：键盘可操作、清晰 focus、对比达标、每字段有 label、链接/按钮语义正确、有意义图片有 alt。
- **Performance**：不引入 Wix runtime / 不必要第三方脚本；JS 尽量少；合理用 Cloudflare caching。

## 建议仓库结构

```
# 小规模（推荐起步）：单 Astro 项目
src/{components,layouts,pages,lib,styles,content}/  public/  astro.config.mjs  studio/

# 大规模：monorepo
apps/web/{src,public,astro.config.mjs}  apps/studio/{schemaTypes,sanity.config.ts}  packages/shared/  docs/{migration,seo,qa}/
```

## 构建 / 部署

- Cloudflare Workers（Static Assets，见 ADR-0002）：build `npm run build`；`wrangler.jsonc` 的 `assets.directory=./dist`；prod 部署 `npx wrangler deploy`，预览 `npx wrangler versions upload`；prod branch `main`；preview 开启。构建 env 在 Workers 项目设置配置，CI 用 GitHub Actions Variables。
- Sanity：配置 publish webhook 触发 rebuild；CORS 仅允许本地/preview/production/Studio domain。
- DNS 切换：Cloudflare 验证完成前保持 Wix 在线 → 先加 production domain → 验 SSL → 表单/redirect/sitemap 全测后再切 DNS。上线后提交 sitemap 到 GSC、验埋点、监控 404、保留 Wix 作 fallback。

## QA Checklist（上线前）

桌面 + 移动逐页截图对比（首页/分类/产品/Contact/Gallery/About/Sustainability/Resources）；sitemap 全路由能渲染或正确 redirect；nav/footer link 正确；contact form 送达；sample CTA 可用；phone/email/WhatsApp 可用；sitemap/robots 正确；metadata/structured data 正确；Lighthouse perf/a11y/SEO 达标；**生产不依赖 Wix scripts**；无 broken images；无 placeholder；404 可用；preview + production deploy 正常。

## Agent 工作流（硬性规则）

1. 涉及视觉/内容一致性 → 编码前先看线上站点。
2. Wix 可能变化 → 先刷新 sitemap 和截图。
3. 先做可复用组件，不要复制粘贴页面区块。
4. 可重复内容优先建模到 Sanity，不要硬编码。
5. 保留 legacy URL，或加 redirect。
6. 除非功能明确需要 runtime，否则保持静态。
7. 结束前测桌面 + 移动端。
8. 明确说明任何与 Wix 视觉结构不一致之处。
9. 不要声称 Wix 代码可导出，除非同时由 Wix 官方文档和实际后台验证。
10. **没有用户明确批准，不要改 DNS、账单或域名设置。**

## 已敲定决策（2026-06-04，grill-with-docs，已核实线上站点）

- **术语模型**：Category（3，材质族）+ Collection（9，品牌系列）+ Signature Collection（4，有落地页）。详见 `CONTEXT.md`。Wix 旧「子分类」概念取消，并入 Collection。
- **URL 策略**：Phase 1 全部 legacy URL 原样保留，不改 slug、不 301（含 `solid-flooring`=Laminate、`sustainable-flooring`=Hybrid 的误导 slug）。详见 `docs/adr/0001-preserve-legacy-wix-urls.md`。
- **booking/service 页**：保留 URL，Phase 1 降级为静态服务介绍页 + CTA（consultation/workshop → Contact；sample-viewing → Sample Request），不重建 Wix Bookings 日历/收款，预约+支付留 Phase 3。`/booking-calendar/*` 纯交易 funnel 为 ADR-0001 例外，可不迁或 301 到对应 service 页。
- **Sanity dataset**：public dataset；但该项目匿名读实测返回空，**build 时改用只读 token**（`SANITY_API_READ_TOKEN`，服务端 only，存 CI/Cloudflare Secret），详见 `docs/adr/0003`。
- **Sanity Studio 托管**：Sanity 托管 `*.sanity.studio`，品牌子域以后再说。
- **图片来源**：可从 Wix Media Manager 下载原图 → 上传 Sanity（生产禁止热链 Wix）。
- **产品数据**：可从 Wix Stores/CMS 导出 CSV → 转 Sanity 文档。
- **Accessories 入口**：首页保留该入口，Phase 1 指向询盘/Contact（背后暂无 Category，不建空分类）。
- **WhatsApp 号码**：`0422 709 709`（国际 +61 422 709 709）；`WhatsAppCta` 用 `https://wa.me/61422709709`。

## 仍待补充

- （暂无。）

> ✅ 2026-06-10：Sanity publish webhook 已配置——Sanity webhook `cloudflare-rebuild`
> （id `AH1KFCiyqByUoW8A`，on create/update/delete，`includeDrafts: false`）POST 到
> Cloudflare Workers Builds Deploy Hook `sanity-publish`（branch `main`），发布内容即自动重建生产。
> Deploy Hook URL 即凭证，**不入仓**——在 Cloudflare dashboard（Settings → Builds → Deploy Hooks）
> 与 Sanity 管理界面可查。端到端已实测（投递 200 + 构建排队）。

## Agent skills

> 由 `setup-matt-pocock-skills` 写入。详细规则在 `docs/agents/*.md`，本块只是索引。

### Issue tracker（issue 跟踪）

issue 和 PRD 以 GitHub issues 形式管理，统一用 `gh` CLI。详见 `docs/agents/issue-tracker.md`。

### Triage labels（分流标签）

五个标准 triage 角色，使用默认 label 字符串（`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`）。详见 `docs/agents/triage-labels.md`。

### Domain docs（领域文档）

单上下文（single-context）：根目录一个 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。
