# Maywood Flooring 重建 Agent 规范

# Maywood Flooring 重建 Agent 规范

本文档用于指导后续 Agent 按当前 Wix 站点的风格、结构和组件颗粒度，使用 Astro + React islands + Sanity + Cloudflare Pages 完成重建和部署。

## 当前站点证据

以线上 Wix 站点作为视觉、内容和结构参考：

- 生产站点：`https://www.maywoodflooring.com.au/`
- 观察到的 Wix site id：`b1855223-a67e-4f4d-be0c-81f43e1652ee`
- 托管证据：Wix/Pepyaka、Wix Thunderbolt runtime、`static.parastorage.com`、`static.wixstatic.com`
- DNS 证据：WHOIS 显示 nameserver 为 `ns8.wixdns.net` 和 `ns9.wixdns.net`

2026-06-03 已在本地捕获的参考材料：

- `/Users/luiszeng/Desktop/maywood-home-full.png`
- `/Users/luiszeng/Desktop/maywood-category-engineered-full.png`
- `/Users/luiszeng/Desktop/maywood-product-blackbutt-full.png`
- `/Users/luiszeng/Desktop/maywood-contact-full.png`
- `/Users/luiszeng/Desktop/.playwright-mcp/page-2026-06-03T04-39-58-881Z.yml`
- `/Users/luiszeng/Desktop/.playwright-mcp/page-2026-06-03T04-41-25-137Z.yml`
- `/Users/luiszeng/Desktop/.playwright-mcp/page-2026-06-03T04-41-42-438Z.yml`
- `/Users/luiszeng/Desktop/.playwright-mcp/page-2026-06-03T04-41-58-428Z.yml`

如果 Wix 站点后续发生变化，开发前需要重新抓取截图、sitemap 和页面结构。

## Wix 迁移边界

不要围绕“导出 Wix 代码”来设计迁移方案。

Wix 官方说明中，Wix 站点依赖 Wix 自有技术和服务器运行。浏览器里可以看到渲染后的 HTML/CSS/JS，但这不是可维护源码，也不能作为 Cloudflare/Vercel 可部署项目的基础。

允许作为迁移输入的内容：

- 公开页面截图。
- 公开 DOM 和文本快照。
- 公开 sitemap URL。
- 确认归属后，从 Wix Media Manager 或当前站点下载的图片素材。
- 可从 Wix CMS 或 Wix Stores 导出的 CSV 数据。
- 手动整理的业务文案、SEO metadata、产品参数和联系方式。

禁止作为实现基础的内容：

- Wix Thunderbolt bundles。
- `static.parastorage.com` 运行时代码。
- 生产环境热链 Wix 图片。
- 按 Wix 自动生成的 DOM id/class 设计新项目架构。

## 产品定位

这是一个内容驱动的获客网站，不是复杂 Web App。

主要任务：

- 呈现 Maywood Flooring 作为高端 timber/flooring supplier 的品牌形象。
- 支持 wholesale、trade 和澳洲本地 SEO 获客。
- 让非技术人员在 Sanity 后台维护产品、系列、案例、博客、资源、FAQ 和地区 SEO 页面。
- 通过 email、phone、WhatsApp 和 sample request 收集销售线索。
- 保留当前用户可见的页面结构和品牌风格。

近期范围：

- 仅英语。
- 强化澳洲 SEO。
- Email 和 WhatsApp 获客。
- Sample request CTA。
- 产品、系列、图库、资源/博客、关于、可持续、联系页。

未来预留：

- i18n 路由和多语言内容。
- CRM 集成。
- 自动报价请求。
- 样品申请流程。
- 预约流程。
- 澳洲 suburb/city 地区落地页。

## 视觉方向

保留当前站点克制、高端、木地板行业相关的视觉语言。

观察到的风格特征：

- 黑色高对比 header 和 footer。
- 白色、近白色页面背景。
- 大量自然木纹、室内空间、仓库/展厅图片。
- 大留白，节奏慢，偏 editorial。
- Serif 主导的高端感，尤其是 logo 和大标题。
- 小型深色圆角 CTA 按钮。
- 产品卡片极简，以方形或矩形木纹图和低调标签为主。
- 大面积居中品牌叙事区。
- 页脚包含大 logo、quick links、联系方式、社媒图标和 ATFA badge。

不要把站点改成通用 SaaS/AI landing page 风格。避免紫色渐变、默认 dashboard 卡片、泛用 icon wall、无关 hero mockup 和随意动画。

允许的优化：

- 改善 responsive design。
- 改善 accessibility。
- 改善 SEO 语义。
- 修复明显影响专业度的拼写错误，例如 `Gallary` 应改为 `Gallery`，除非必须为旧 URL 保留拼写。
- 优化 spacing consistency，但保持原有视觉节奏。
- 优化图片加载和压缩。

## 组件拆分

必须以可复用组件重建网站，不要把页面做成一次性大块。

全局组件：

- `SiteHeader`
- `Logo`
- `PrimaryNav`
- `SampleRequestButton`
- `MobileNav`
- `SiteFooter`
- `SocialLinks`
- `AtfaBadge`
- `Breadcrumbs`
- `SeoHead`
- `StructuredData`

首页组件：

- `HomeHero`
- `ProductSelectionGrid`
- `ProductSelectionCard`
- `PartnerNarrativeSection`
- `SilentFoundationSection`
- `SignatureCollectionsSection`
- `SignatureCollectionCard`
- `BrandStatementSection`
- `GalleryFeedSection`
- `HomeCtaSection`

分类/产品列表组件：

- `CategoryHero`
- `CategorySidebar`
- `CategorySidebarGroup`
- `ProductGrid`
- `ProductCard`
- `ProductCount`
- `CategoryIntro`

产品详情组件：

- `ProductBreadcrumbs`
- `ProductImageGallery`
- `ProductTitle`
- `ProductSpecList`
- `ProductSpecItem`
- `ProductInquiryCta`
- `RelatedProducts`

Contact 页面组件：

- `ContactHeroFormSplit`
- `ContactForm`
- `ContactInfoColumns`
- `OpeningHours`
- `MapEmbed`
- `WhatsAppCta`

内容页组件：

- `RichTextRenderer`
- `HeroImageSection`
- `EditorialTextBlock`
- `ImageTextSplit`
- `GalleryGrid`
- `FaqAccordion`
- `CaseStudyCard`
- `BlogCard`
- `LocationSeoContent`

React islands：

- `ContactFormIsland`
- `SampleRequestIsland`
- `ProductFilterIsland`
- `ImageGalleryIsland`
- `FaqAccordionIsland`
- 后续需要时报价规划组件 `QuotePlannerIsland`

默认使用 Astro 静态组件。只有需要浏览器状态、事件、表单交互、筛选、轮播、折叠等能力时才使用 React。

## 当前 URL 清单

原则：尽量保留当前公开 URL。除非有明确 SEO 或产品结构理由，否则不要改 URL。若必须改，必须添加 301 redirect。

sitemap 中观察到的类型：

- `store-products-sitemap.xml`
- `store-categories-sitemap.xml`
- `store-sub-categories-sitemap.xml`
- `booking-services-sitemap.xml`
- `dynamic-projects_p_f4d70d85_73d9_40f5_a0c5_ae1a80c5ba64_0_5000-sitemap.xml`
- `pages-sitemap.xml`

普通页面：

- `/`
- `/resources`
- `/gallery`
- `/book-online`
- `/contact`
- `/bushland`
- `/inquiry-services-page`
- `/bellavale`
- `/manor`
- `/about-us`
- `/sustainability`
- `/puregrain`

主分类：

- `/category/sustainable-flooring`
- `/category/engineered-flooring`
- `/category/solid-flooring`

子分类：

- `/category/aquaglow-72hr`
- `/category/bushland`
- `/category/hydrocore`
- `/category/mtf-24hr-water-resistant`
- `/category/guardian`
- `/category/puregrain`
- `/category/manor`
- `/category/duro-plus`
- `/category/bellavale`

服务/预约页面：

- `/service-page/flooring-workshop`
- `/service-page/sample-viewing`
- `/service-page/flooring-consultation`
- `/service-page/flooring-consultation-1`
- `/service-page/installation-workshop`

项目页面：

- `/projects/zero-carbon-world`
- `/projects/desert-wildlife-conservation`
- `/projects/renewable-energy-program`
- `/projects/rainforest-action-initiative`

产品详情页面较多，已观察到 73 个左右。实现时应重新从 sitemap 拉取完整列表，至少覆盖所有现有 `/product-page/[slug]` 路由。

## 页面结构要求

首页：

- 黑色 Header，大号 Maywood logo，导航链接，sample request CTA。
- Hero 使用生活方式室内图，叠加白色内容面板、H1、tagline、段落和 `READ MORE` CTA。
- Product selection 区块包含四个入口：Timber Flooring、Laminate Flooring、Hybrid Flooring、Accessories。
- Professional partner 双栏区块，包含仓库/门店图片和品牌叙事。
- `The Silent Foundation` 编辑性文字区块。
- 灰色背景的 signature collections 区块，包含居中堆叠的 collection cards。
- Brand philosophy 叙事区块。
- Gallery/social feed 区块。
- Footer。

分类页：

- Header。
- Breadcrumbs。
- 宽幅 muted category hero image。
- H1 和分类描述。
- 左侧 `Browse by` sidebar。
- Product count。
- 桌面端三列产品网格。
- 产品卡片包含图片和名称。
- Footer。

产品详情页：

- Header。
- Breadcrumbs：Home > All Products > Product。
- 大产品图片。
- 产品标题。
- 纵向规格列表。
- 保留字段：Type、Dimension、Pack Size、Pack Weight、Finish、Bevel、Profile、Grade、Environmental Rate。
- Footer。

Contact 页面：

- Header。
- 上半区为左右分栏：左侧图片叠加标题，右侧联系表单。
- 表单字段：First Name、Last Name、Email、Message、Send。
- `Contact Us` 区块包含 Address、Contact、Opening Hours。
- Map embed 或静态地图。
- Footer。

## Sanity CMS 模型

Sanity 用于所有非技术内容管理。

必需 document types：

- `siteSettings`
- `navigation`
- `homePage`
- `page`
- `product`
- `productCategory`
- `productCollection`
- `caseStudy`
- `blogPost`
- `resource`
- `faq`
- `locationPage`
- `service`
- `galleryImage`
- `redirect`
- `seoSettings`

`product` 字段：

- `title`
- `slug`
- `legacyPath`
- `status`
- `category`
- `collection`
- `shortDescription`
- `mainImage`
- `gallery`
- `type`
- `dimensions`
- `packSize`
- `packWeight`
- `finish`
- `bevel`
- `profile`
- `grade`
- `environmentalRate`
- `waterResistance`
- `material`
- `colourTone`
- `installationMethod`
- `applications`
- `downloads`
- `relatedProducts`
- `seo`

`productCategory` 字段：

- `title`
- `slug`
- `legacyPath`
- `description`
- `heroImage`
- `parent`
- `children`
- `sortOrder`
- `seo`

`caseStudy` 字段：

- `title`
- `slug`
- `location`
- `projectType`
- `productsUsed`
- `summary`
- `body`
- `images`
- `seo`

`blogPost` / `resource` 字段：

- `title`
- `slug`
- `excerpt`
- `heroImage`
- `body`
- `category`
- `relatedProducts`
- `faqs`
- `publishedAt`
- `seo`

`locationPage` 字段：

- `title`
- `slug`
- `city`
- `state`
- `serviceArea`
- `intro`
- `body`
- `relatedProducts`
- `relatedCaseStudies`
- `faqs`
- `seo`

`seo` object 字段：

- `metaTitle`
- `metaDescription`
- `canonicalUrl`
- `ogImage`
- `noIndex`
- `structuredDataType`

Sanity 编辑体验要求：

- 非技术人员必须能在 Sanity Studio 里创建和编辑产品、分类、案例、博客、FAQ 和页面，不需要接触 GitHub。
- 字段 label 和 description 要清晰。
- 重要页面的 SEO 字段要加 validation。
- 免费层下优先使用 public dataset，除非后续引入私有内容。
- Studio 可以使用 Sanity 托管，也可以单独部署；不要要求编辑人员运行本地命令。

## 路由设计

优先保留当前 Wix 路由结构：

- `src/pages/index.astro`
- `src/pages/resources.astro`
- `src/pages/gallery.astro`
- `src/pages/book-online.astro`
- `src/pages/contact.astro`
- `src/pages/about-us.astro`
- `src/pages/sustainability.astro`
- `src/pages/[slug].astro`，用于 `bushland`、`bellavale`、`manor`、`puregrain` 等 collection landing pages
- `src/pages/category/[slug].astro`
- `src/pages/product-page/[slug].astro`
- `src/pages/projects/[slug].astro`
- `src/pages/service-page/[slug].astro`

如果后续引入更干净的 URL，需要保留旧路径或添加 301 redirect。

## SEO 要求

SEO 是核心目标，不是上线后的附加项。

每个页面必须包含：

- 唯一 title。
- 唯一 meta description。
- canonical URL。
- Open Graph metadata。
- 响应式图片和有意义的 alt text。
- 一个逻辑清晰的 H1。
- 语义化 landmarks：`header`、`nav`、`main`、`footer`。
- 分类页和产品页需要 breadcrumb schema。

结构化数据：

- 首页/全站：`LocalBusiness` 或相关 subtype。
- 产品详情页：`Product`。
- 分类页/产品页：`BreadcrumbList`。
- FAQ 内容：`FAQPage`。
- 博客/资源：`Article` 或 `BlogPosting`。

澳洲 SEO：

- 使用澳洲拼写和本地行业表达。
- 在自然语境中提及 Melbourne、Keysborough、VIC、Australia。
- 支持未来 location landing pages，不要做低质量重复内容。
- 保持 NAP 一致：
    - Phone：`03 8753 5522`
    - Email：`sales@maywoodflooring.com.au`
    - Address：`49-51 Keysborough Ave, Keysborough, VIC 3173`

必须生成：

- `sitemap.xml`
- `robots.txt`
- 404 页面。
- 旧 Wix URL 的 redirect map。

## 表单和获客

Phase 1：

- Contact form 发送询盘邮件。
- Request sample CTA 打开 sample request 表单或跳转到 sample request 页面。
- 提供 phone、email、WhatsApp CTA。

Phase 2：

- Cloudflare Pages Function 处理表单提交。
- Turnstile 防垃圾提交。
- Resend 发送邮件通知。
- 除非明确需要，不存储敏感数据。

Phase 3：

- CRM 集成。
- 自动报价请求。
- 样品申请追踪。
- 预约功能。

环境变量：

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `SANITY_API_READ_TOKEN`，仅在需要 private draft/preview 时使用
- `RESEND_API_KEY`
- `LEADS_TO_EMAIL`
- `TURNSTILE_SECRET_KEY`
- `PUBLIC_TURNSTILE_SITE_KEY`

不要提交 secrets 到 GitHub。

## 实现标准

使用 TypeScript。

Astro：

- 默认静态生成。
- public 页面在 build time 从 Sanity 拉取内容。
- 使用 Astro layouts 和 Astro components 处理静态页面结构。
- 只在需要交互时使用 React islands。
- SEO 页面不要做成 client-side routing。

React：

- 只用于需要状态、事件、表单交互、筛选、轮播、折叠的局部组件。
- 不要把整个站包成 React app。
- 不要默认添加不必要的 `useMemo` 和 `useCallback`。
- islands 保持小而独立。

CSS：

- 使用 CSS variables 定义设计 token。
- 优先使用 Astro scoped styles 或少量全局 stylesheet。
- 不要引入笨重 UI framework。
- Tailwind 可以使用，但前提是项目明确选择，并且不能破坏对当前 Wix 视觉结构的复刻。

图片：

- 生产环境不要热链 Wix 图片。
- 确认归属后，把图片下载/导出并上传到 Sanity，或在适合时放入 repo。
- 使用响应式、压缩后的图片输出。
- 保留当前图片调性：暖色室内、木纹质感、展厅、仓库、项目场景。

Accessibility：

- 导航和表单支持键盘操作。
- 有清晰 focus state。
- 对比度达标。
- 每个表单字段有 label。
- 链接和按钮语义正确。
- 所有有意义图片都有 alt text。

Performance：

- 不引入 Wix runtime scripts。
- 不引入不必要的第三方脚本。
- below-the-fold 图片 lazy load。
- JS 尽量少。
- 合理使用 Cloudflare caching。

## 建议仓库结构

如果 Sanity Studio 单独部署，建议 monorepo：

```
apps/
  web/
    src/
      components/
      layouts/
      pages/
      lib/
      styles/
      content/
    public/
    astro.config.mjs
  studio/
    schemaTypes/
    sanity.config.ts
    sanity.cli.ts
packages/
  shared/
docs/
  migration/
  seo/
  qa/
```

如果项目保持小规模，也可以使用单个 Astro 项目并在其中放 `studio/` 文件夹。

## 构建和部署

Cloudflare Pages：

- Build command：`npm run build`
- Output directory：单 Astro app 使用 `dist`；monorepo 使用 `apps/web/dist`
- Production branch：`main`
- Preview deployments：开启。

Sanity：

- 配置 Sanity publish webhook，触发 Cloudflare Pages rebuild。
- CORS origins 仅允许本地开发、preview URL、production domain 和 Studio domain。

DNS 切换：

- Cloudflare Pages 站点验证完成前，保持 Wix 站在线。
- 先在 Cloudflare Pages 添加 production domain。
- 验证 SSL。
- 表单、redirect、sitemap 全部测试后再切 DNS。

上线后：

- 在 Google Search Console 提交 sitemap。
- 如果使用 GA/GTM，验证埋点。
- 监控 404。
- 保留 Wix 一段时间作为视觉对照和 fallback。

## QA Checklist

上线前必须检查：

- 首页、分类页、产品页、Contact、Gallery、About、Sustainability、Resources 的桌面截图对比。
- 同一批页面的移动端截图对比。
- sitemap 中所有路由都能渲染或正确 redirect。
- 所有 nav/footer link 正确。
- contact form 能送达。
- sample request CTA 可用。
- phone/email/WhatsApp 链接可用。
- sitemap 和 robots 正确。
- metadata 和 structured data 正确。
- Lighthouse performance/accessibility/SEO 达标。
- 生产环境不依赖 Wix scripts 或 Wix runtime。
- 没有 broken images。
- 没有 placeholder text。
- 404 页面可用。
- Cloudflare preview 和 production deployment 正常。

验收标准：

- 当前站点结构在组件颗粒度上得到保留。
- 非技术人员可以在 Sanity 管理产品、案例、博客/资源、FAQ 和图库内容。
- Cloudflare Pages 正式承载生产站点。
- DNS 指向 Cloudflare。
- 只有在上线后检查完成后，才考虑取消 Wix hosting。

## Agent 工作流

后续 Agent 处理该项目时必须遵守：

1. 如果涉及视觉或内容一致性，编码前先检查当前线上站点。
2. 如果 Wix 站点可能变化，先刷新 sitemap 和截图。
3. 先做可复用组件，不要复制粘贴页面区块。
4. 可重复内容优先建模到 Sanity，不要硬编码。
5. 保留 legacy URL，或添加 redirect。
6. 除非功能明确需要 runtime，否则保持静态站点。
7. 结束前测试桌面和移动端。
8. 明确说明任何和 Wix 视觉结构不一致的地方。
9. 不要声称 Wix 代码可以导出，除非同时从 Wix 官方文档和实际后台验证。
10. 没有用户明确批准，不要修改 DNS、账单或域名设置。

## 待确认事项

- 是否能从 Wix Media Manager 下载所有用户自有图片。
- 产品数据是否能从 Wix Stores/CMS 导出 CSV。
- 现有 booking/service 页面是否仍需要保留，还是 redirect 到 contact/sample request。
- WhatsApp 号码。
- Sanity Studio 放在 `studio.maywoodflooring.com.au`，还是使用 Sanity 默认托管。
- 旧 URL 是否全部原样保留，还是引入更干净的新 URL 并做 301 redirect。