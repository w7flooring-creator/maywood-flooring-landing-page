# SEO + GEO audit — 2026-07-18

Production: <https://www.maywoodflooring.com.au/>  
Code baseline: `main@3f90ed822da9b359b83739d26547314450012505`  
Research basis: [official-source research](./seo-geo-official-research-2026-07-18.md)

## Executive assessment

Maywood starts this phase from a sound technical baseline, not from an SEO repair state. A live crawl on 18 July 2026 found 112/112 sitemap URLs returning HTTP 200, with exactly one H1, a canonical URL, a unique title and a unique meta description on every page. All JSON-LD blocks parsed successfully. The apex host preserves path and query while redirecting to the canonical `www` host, production is crawlable, representative Lighthouse SEO scores are 100, and the new sitemap index is accepted in Search Console.

The next gains are therefore unlikely to come from rewriting metadata or manufacturing more landing pages. The strongest opportunities are to make the existing business and product entities more explicit, improve factual information depth and internal relationships in Sanity, publish trustworthy update signals, and monitor real search/local/AI citation data as it becomes available.

## Evidence snapshot

- Live `robots.txt` contains Cloudflare Managed Content Signals: `search=yes, ai-train=no, use=reference`; `ai-input` is omitted. It separately disallows `Google-Extended` and `GPTBot`, but does not disallow `Googlebot`, `bingbot`, `OAI-SearchBot`, or `ChatGPT-User`.
- Search crawling, generative-answer grounding, user-triggered fetches and model training are separate uses. See the crawler matrix in the official research note.
- The sitemap contains 112 canonical URLs and zero `<lastmod>` values.
- Live crawl: zero non-200 sitemap URLs, zero missing/duplicate titles or descriptions, zero invalid JSON-LD blocks, and zero pages with missing or multiple H1s.
- Current site-wide `LocalBusiness` includes name, URL, telephone, email, postal address and `areaServed`, but no stable `@id`, description/image, `contactPoint`, or verified social `sameAs` links.
- Pages without a page-specific image emit `og:image=https://www.maywoodflooring.com.au/og-default.jpg`, but that URL returns HTTP 404. This is a real sharing/entity-image defect missed by the earlier presence-only crawl.
- Product nodes contain name, URL, brand name, description/image/category when present, and intentionally contain no fabricated `Offer`, price, availability, ratings or reviews.
- There are 73 product pages, 13 category/collection store pages and 8 resource-detail pages. Many pages have little unique prose beyond shared navigation/footer: the thinnest store/resource pages were roughly 96–106 extracted words. This is a prioritisation signal, not an automatic quality verdict.
- Four signature store views intentionally canonicalise to richer marketing pages under ADR-0001. Protected legacy slugs remain unchanged.
- Local facts are visible in server-rendered HTML: Keysborough address, Melbourne/Victoria service context, phone, email, trade/wholesale positioning and verified social links. Opening hours are visible on Contact and documented as copied from the live Wix site in June 2026.
- Launch lab baseline: production mobile Performance 90–94 on representative Home/Contact/Category/Product pages, with SEO 100. Field CWV is not yet available from the newly verified GSC property.

## Priority matrix

| Priority | Issue / hypothesis | Evidence | Expected benefit | Cost | Risk | Verification | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Strengthen the business entity graph with a stable `@id` and only verified facts | The same basic anonymous `LocalBusiness` object is repeated across pages; verified social URLs and visible hours are not connected to it | Clearer entity reconciliation for search and answer engines; stronger NAP/social consistency | Low | Low if every field remains visible and factual | Unit tests; JSON parse; Schema Markup Validator/Rich Results Test; inspect live HTML | Revert the schema-only commit |
| P0 | Link Product entities to the same Maywood entity ID | Product `brand` currently contains only a name | Makes brand/product relationships machine-readable without inventing commerce data | Low | Low | Product unit/render tests; validate representative Product JSON-LD | Revert Product JSON-LD fields |
| P0 | Replace the broken default Open Graph image | The emitted `/og-default.jpg` returns 404 in production | Reliable social previews and a valid default image signal | Low | Low if an owned Sanity image is used | Assert the resolved URL; HTTP 200 check; inspect representative `og:image` | Restore the prior value (not recommended) or replace with another owned image |
| P0 | Keep the current crawler policy unchanged while documenting its exact meaning | `search=yes`, `ai-train=no`, `use=reference`; `ai-input` omitted; Google-Extended/GPTBot blocked | Avoids accidental Search/AI citation loss or unintended training permission | None | Misstating omission as allow/deny would create governance error | Fetch live robots; compare with Cloudflare official definitions | No change required |
| P1 | Add accurate sitemap `lastmod` from content provenance | 112 URLs have zero `lastmod`; Astro routes combine Sanity and repo-authored content | Better refresh hints for Google/Bing and future IndexNow; more trustworthy freshness | Medium | High if every build fabricates a new timestamp or canonicalised duplicates are mishandled | Build XML assertions; compare Sanity `_updatedAt`; crawl only canonical/indexable URLs | Remove custom serialization and return to current sitemap |
| P1 | Deepen thin Category/Collection/Resource pages through Sanity, not template filler | Several pages have only ~96–106 extracted words; four collection pairs are intentionally near-duplicate | More useful answers, stronger topical differentiation and long-tail relevance | Medium–high editorial work | Medium: boilerplate/keyword stuffing or unsupported claims | Content inventory; human fact review; query-level GSC/Bing monitoring; re-crawl similarity | Unpublish/revert individual CMS revisions |
| P1 | Improve Category → Collection → Product → Resource/Project internal relationships | Product breadcrumbs say “All Products”; related products/resources exist but are optional and projects are currently absent from the production sitemap | Clearer topical graph, better crawl paths and answer-engine context | Medium | Low–medium: wrong taxonomy links or overlinking | Link graph crawl; orphan/depth report; template tests; click QA | Revert component/query change |
| P1 | Add answer-first, factual summaries and stable headings/anchors to high-value templates | Product specs are extractable, but many descriptions are terse type labels; resource pages are often download-oriented and thin | Better snippet/AI extraction and user comprehension | Medium, primarily Sanity modelling/content | Medium: templated claims or duplication | Server HTML extraction; heading/anchor tests; editorial review; query/citation monitoring | Remove optional summary fields/sections; retain existing content |
| P1 | Establish GSC/GBP/Bing/AI citation monitoring after data matures | GSC property and sitemap were only verified/submitted on 18 July; no meaningful coverage/query data yet | Measures actual impressions, indexing, local relevance, CWV and citations instead of proxy scores | Low recurring | Low; external setup needs approval | Monthly snapshot with query/page/device/location, CWV and AI citation deltas | Stop reporting or remove integrations/verification only with approval |
| P2 | Evaluate Bing Webmaster Tools and event-driven IndexNow | Microsoft documents IndexNow as discovery/freshness notification, not a guarantee | Faster Bing/Copilot discovery for real Sanity publishes | Medium | Key/config maintenance; noisy submissions; no ranking guarantee | Submit only changed canonical URLs; inspect Bing URL/crawl reports | Disable notifications and remove key/config with approval |
| P2 | Measure and improve field CWV, prioritising mobile LCP variance | Lighthouse Performance is 90–94; prior Contact mobile LCP varied between 2.4s and 4.1s | Better real user experience and possible search benefit | Medium | Optimising one lab run can regress visual quality or caching | GSC CrUX field LCP/INP/CLS; repeated mobile lab runs; visual QA | Revert each isolated performance change |
| P2 | Add real project evidence and local case studies when supplied | Production sitemap has no project detail URLs despite a model/template existing | First-hand local proof, useful internal links and stronger prominence/relevance | High editorial/business input | High if locations, products or outcomes are invented | Source records, client approval, visible facts, schema validation | Unpublish the case study |
| P3 | Optional `llms.txt` experiment | Google explicitly ignores it for Search; no reviewed OpenAI/Microsoft publisher requirement | Possible convenience for unsupported/experimental consumers only | Low | Creates stale duplicate guidance and false expectations | Server logs/referrals; no ranking claim | Delete file |

## Template findings

### Home and Contact

The homepage already states the business category, product families, Keysborough/Melbourne location and trade/wholesale audience in server-rendered text. Contact visibly exposes NAP, showroom context, a map and opening hours. The low-risk improvement is entity consistency, not additional keyword paragraphs.

### Category and Collection

Titles, descriptions and canonicals are distinct. The four signature store views correctly canonicalise to their marketing landing pages, but several store views carry very little unique context. Preserve every legacy URL. Enrich the canonical marketing page with factual collection positioning and use the store view for browse/filter intent; do not copy the same prose to both.

### Product

The 73 pages expose a product name, taxonomy context, image and specification list in HTML. Product JSON-LD is conservative and honest. The main content limitation is that many short descriptions repeat only a product type. Future Sanity work should capture verified material, applications, installation method, water resistance and downloadable evidence where applicable; templates must omit unknown fields.

### Resources and Projects

Eight resource detail routes exist, but several are primarily short download gateways and currently emit only Breadcrumb schema. Use `Article` only where a genuine editorial resource has visible author/date/body facts. Project schemas and templates exist, but there are no production project URLs; do not create placeholder cases.

### FAQ

The FAQ page contains visible questions and matching JSON-LD. Google removed FAQ rich results in May 2026, so retain FAQs for visitors and extractability, not for a rich-result promise. Add only questions the business can substantiate and maintain.

## Crawler and rights assessment — no production change

| Control | Current value | Practical effect | GEO implication |
| --- | --- | --- | --- |
| Googlebot | Allowed by `User-agent: *` | Google Search discovery/indexing remains allowed | Google AI Search eligibility derives from ordinary Search indexing; `Google-Extended` is not the control for this |
| Google-Extended | Disallowed | Opts out of documented Gemini training/grounding uses; Google says Search inclusion/ranking is unaffected | Rights/use choice, not an SEO defect |
| OAI-SearchBot | Not disallowed | Eligible for ChatGPT Search crawling, subject to provider compliance and other Cloudflare controls | Relevant OpenAI search citation crawler |
| GPTBot | Disallowed | Expresses opt-out from potential OpenAI foundation-model training | Independent of ChatGPT Search eligibility |
| ChatGPT-User | Not disallowed | User-triggered fetch; OpenAI says robots may not apply in the same way | Server-rendered accessible pages remain important |
| bingbot | Not disallowed | Bing indexing remains allowed | Bing index freshness supports Bing/Copilot surfaces |
| Cloudflare Content Signals | `search=yes, ai-train=no, use=reference`; no `ai-input` | Allows ordinary search/reference, denies training; omission neither grants nor restricts AI input through this signal | Do not describe current policy as explicit permission for AI summaries |

Any future Cloudflare policy proposal must show the exact old value, exact new value, benefit, copyright/training/citation risk, verification and rollback, then wait for explicit approval.

## Recommended implementation scope for this PR

1. Replace the broken default Open Graph URL with an owned, existing Sanity image.
2. Add stable, tested entity IDs and verified `description`, image, `sameAs`, `contactPoint` and visible opening-hour data to the LocalBusiness node.
3. Reference the same entity ID from Product `brand` and give Product nodes stable IDs.
4. Add regression tests for factual values, entity relationships and absence of fabricated offers/reviews.
5. Keep sitemap `lastmod`, large CMS content enrichment, IndexNow, `llms.txt`, crawler policy and external dashboards as documented follow-ups. Accurate per-route modification provenance requires a separate design rather than a build timestamp shortcut.

## Validation plan

- Run `npm test`, `npm run check`, `npx prettier --check .`, `npm run build`, and `npm audit --omit=dev`.
- Validate Home, Contact, Category, Collection, Product, Resources and one content page in desktop and mobile layouts.
- Crawl all 112 URLs on the candidate environment for status, canonical, indexability, H1, title, description and valid JSON-LD.
- Run representative desktop/mobile Lighthouse on the candidate environment. Treat preview `X-Robots-Tag: noindex` separately from production SEO.
- After deployment, verify live schema and crawler behaviour without submitting either form.

## External follow-ups requiring approval

- Cloudflare Managed Content Signals / AI crawler controls.
- Bing Webmaster Tools verification, IndexNow key or production submission.
- GSC historical sitemap removal or URL inspection submissions.
- Google Business Profile edits, review workflows or local listing changes.
- Sanity production content edits, Worker variables, DNS, Resend and email records.
