# SEO + GEO official-source research — 2026-07-18

This note records current first-party guidance relevant to the Maywood Flooring audit. It separates traditional search indexing, generative-answer grounding, user-triggered access, and model training because the controls and expected outcomes are not interchangeable.

## Executive conclusions

1. **Search visibility and training permission are independent.** Googlebot controls Google Search. `Google-Extended` controls Gemini training and grounding uses but does not affect Google Search inclusion or ranking. OpenAI likewise separates `OAI-SearchBot` (ChatGPT Search) from `GPTBot` (potential foundation-model training).
2. **The safest GEO foundation is still high-quality SEO.** Google's July 2026 guide says AI Overviews and AI Mode use pages retrieved from the Google Search index through core ranking systems. It recommends unique, first-hand, non-commodity content, clear structure, crawlability, good page experience, accurate local/product data, and avoiding scaled query-variant pages.
3. **Cloudflare's current managed policy allows ordinary search and blocks named training/extended crawlers.** Its default managed block contains `search=yes, ai-train=no, use=reference`, allows `User-agent: *`, and separately disallows crawlers including `Google-Extended` and `GPTBot`. It does not state `ai-input=yes` or `ai-input=no`; under Cloudflare's own definition, omission neither grants nor restricts that use through the content signal. Standard `robots.txt` compliance remains voluntary.
4. **Do not infer that blocking `Google-Extended` blocks Google Search or AI Overviews.** Google says the token does not affect Search inclusion/ranking. Google's generative Search features are grounded in its Search index, so the Googlebot/Search controls remain the relevant indexing gate.
5. **Do not infer that allowing `OAI-SearchBot` permits training.** OpenAI documents the two choices as independent. `ChatGPT-User` is a user-triggered fetcher, not an automatic search crawler, and robots rules may not apply to those user-initiated requests.
6. **`llms.txt` is optional experimentation, not a ranking lever.** Google explicitly says it does not use the file and that maintaining one neither helps nor harms Google Search visibility or rankings. No reviewed first-party OpenAI or Microsoft publisher guidance makes it a requirement for search citation.
7. **FAQ rich-result value has changed.** Google stopped showing FAQ rich results on 7 May 2026 and removed the feature documentation in June. Genuine visible FAQs may still help users and page comprehension, but adding or manufacturing FAQs solely for a Google FAQ rich result has no current benefit.
8. **Structured data must reflect visible, factual content.** It can clarify entities and enable supported search features, but Google does not guarantee rich results and says no special schema is required for generative AI search.

## 1. Crawler and use-case matrix

| Ecosystem | Identity/control | Primary documented purpose | Search/index impact | Training/AI-input impact | Maywood interpretation |
| --- | --- | --- | --- | --- | --- |
| Google | `Googlebot` | Finds information for Google's Search indexes and Search features | Direct: its crawl preferences affect Google Search, Images, Video, News and Discover as applicable | Not a standalone training permission token | Keep crawlable; verify by rendered HTML, robots, response status and GSC rather than assuming Lighthouse alone proves indexing. |
| Google | `Google-Extended` | A robots product token controlling use for future Gemini training and for grounding in Gemini Apps / Vertex AI Google Search grounding | Google explicitly says it does **not** affect Search inclusion and is not a Search ranking signal | Controls the documented Gemini training and grounding uses | Current Cloudflare disallow is a rights/use choice, not a technical SEO block. Changing it would be an external policy decision requiring explicit approval. |
| OpenAI | `OAI-SearchBot` | Automatic crawler for surfacing sites in ChatGPT Search results | OpenAI says opted-out sites will not be shown in ChatGPT search answers, although navigational links may still appear | Independent of GPTBot training preference | Allowing it is the relevant ChatGPT Search citation control. Check actual production robots and Cloudflare enforcement separately. |
| OpenAI | `GPTBot` | Crawls content that may be used to train generative AI foundation models | Not the documented Search inclusion control | Disallow indicates content should not be used for foundation-model training | Current Cloudflare disallow protects against this documented training use without, by itself, opting out of OAI Search. |
| OpenAI | `ChatGPT-User` | Fetches a page for certain actions initiated by a ChatGPT or Custom GPT user | Not used to decide ChatGPT Search inclusion | Not an automatic web crawler; robots rules may not apply to user-triggered requests | Treat as immediate user access. Server/WAF policy and usable server-rendered pages matter; do not present robots as a guaranteed block. |
| Microsoft | `bingbot` | Discovers and refreshes documents in Bing's searchable index | Direct indexing crawler | Bing says indexed content and freshness support AI-powered experiences including Copilot; it does not document a separate answer-engine crawler in the reviewed publisher guidance | Keep Bing crawlable and monitor through Bing Webmaster Tools if approved. |
| Microsoft/IndexNow participants | IndexNow notification | Tells participating engines that a URL was added, updated, or deleted | Speeds discovery; it does not guarantee crawl, indexing, ranking, or citation | Microsoft says freshness can help AI systems reference current pages | Useful future automation around Sanity publishes, but account creation, key deployment, or production submission needs approval. |

Sources: [Google crawler overview](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers), [Google common crawlers and Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers), [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots), [Bingbot crawl purpose](https://blogs.bing.com/webmaster/october-2018/bingbot-Series-Maximizing-Crawl-Efficiency), [IndexNow guidance](https://blogs.bing.com/webmaster/September-2024/IndexNow-When-and-How-Websites-Should-Notify-Search-Engines), [Bing sitemaps and AI search](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search).

### Operational distinction

- **Search indexing:** crawler discovers a URL, processes canonical/indexing signals, and may add it to a searchable index. A sitemap or notification is a discovery hint, not a guarantee.
- **Generative-answer grounding/retrieval:** at answer time, a system retrieves current sources or indexed pages to support an answer. Google documents AI Search as retrieving from its Search index; Cloudflare calls this `ai-input`.
- **User-triggered access:** a person asks an agent to open a particular page. The request is not an automatic crawl and may not follow robots rules in the same way.
- **Model training/fine-tuning:** content may be used to improve future model generations. This is controlled separately by `Google-Extended`, `GPTBot`, and Cloudflare's `ai-train` signal in the reviewed policies.

These are related only insofar as a provider may reuse one fetched copy to avoid duplicate crawling. OpenAI explicitly says the policy choices remain independent even if it uses one crawl for both allowed purposes.

## 2. Cloudflare Managed Content Signals

Cloudflare documents the following meanings:

- `search`: build a search index and return links/short excerpts; Cloudflare explicitly excludes AI-generated summaries from this category.
- `ai-input`: feed content into a model at query time for RAG, grounding, or generative search answers.
- `ai-train`: train or fine-tune models.
- experimental `use=reference`: index, excerpt and link back; this is less permissive than `use=full` (summarize/reproduce) and more permissive than `use=immediate` (store/reuse nothing).

As documented on 1 July 2026, the managed block is:

```text
User-Agent: *
Content-signal: search=yes, ai-train=no, use=reference
Allow: /
```

It separately disallows named crawlers such as `Amazonbot`, `Applebot-Extended`, `Bytespider`, `CCBot`, `ClaudeBot`, `Google-Extended`, `GPTBot`, and `meta-externalagent`. Cloudflare prepends this managed content to an existing origin `robots.txt` that returns HTTP 200.

Important limits:

- Cloudflare says robots compliance is voluntary and does not technically prevent access. Enforcement requires a separate AI Crawl Control/blocking policy.
- The current signal omits `ai-input`. Cloudflare says omission neither grants nor restricts that use via the signal; it must not be described as an affirmative allow or deny.
- `search=yes` does not itself authorize AI summaries under Cloudflare's definitions.
- Provider-specific crawler rules may have different meanings. For example, blocking `Google-Extended` does not block Googlebot/Search, while blocking `GPTBot` does not block OAI-SearchBot.

Source: [Cloudflare managed robots.txt and Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/).

### Change-control template for a future policy decision

No Cloudflare crawler/content-signal setting should be changed in this audit. If a change is later considered, present:

| Field | Required content |
| --- | --- |
| Old value | Exact live managed robots content and dashboard toggles, captured immediately before change |
| Proposed value | Exact new search / ai-input / ai-train / use semantics and named crawler rules |
| Benefit | Which specific search, grounding, training, or user-access use becomes possible or restricted |
| Risk | Lost citation eligibility, broader model use, copyright/reuse exposure, crawler spoofing or policy non-compliance |
| Verification | Fetch live `robots.txt`; test relevant official user agents/IP ranges; inspect Cloudflare AI Crawl Control and logs; allow provider propagation time |
| Rollback | Restore exact prior dashboard settings/rules; fetch live robots again and recheck logs |

## 3. Google generative Search and GEO

Google's July 2026 official guide is unusually explicit:

- AI Overviews and AI Mode are rooted in core Search ranking and quality systems, using RAG and query fan-out against pages from the Search index.
- A page must be indexed and eligible for a normal Search snippet to be eligible for generative Search features; inclusion is never guaranteed.
- High-value actions are unique, first-hand, non-commodity content; logical sections/headings; relevant images/video; crawlability; low duplication; and good page experience.
- Local and product visibility should use accurate Google Business Profile and Merchant Center information where appropriate.
- Creating many pages for every query variation can violate scaled-content-abuse policy.
- There is no special generative-search schema. Structured data remains useful for ordinary SEO/rich-result eligibility, but overfocusing on it is not a GEO shortcut.
- Google Search ignores `llms.txt`; it neither helps nor harms rankings/visibility.

Source: [Google's guide to optimizing for generative AI Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

For Maywood, the evidence-based content direction is therefore to strengthen verifiable, site-specific knowledge: factual product specifications, installation/use constraints when supplied by the business, real project details, comparison criteria, showroom/contact facts, and natural Melbourne/Keysborough context. It is not to mass-produce suburb or query-variant pages.

## 4. Technical SEO and sitemap freshness

Google says a sitemap helps efficient discovery and can communicate when a page changed, but it does not guarantee crawl or indexing. Use `<lastmod>` only when an indexed URL was actually updated; avoid repeatedly submitting unchanged sitemaps. Microsoft similarly recommends complete sitemaps with accurate `lastmod` values and IndexNow for discrete additions, updates, and deletions.

Audit implications:

- Determine whether every sitemap URL receives a meaningful content-derived `lastmod`, a build timestamp unrelated to page changes, or no `lastmod`.
- Prefer Sanity `_updatedAt` (and a real source timestamp for repo-authored pages) over “every build is today”.
- Keep only canonical, indexable, HTTP 200 URLs in the sitemap. Redirect sources, 404s, canonicalized duplicates that are not intended search entries, and preview hosts require deliberate handling.
- Keep crawlable `<a href>` internal links; do not rely on sitemap inclusion as a replacement for information architecture.

Sources: [Google sitemap overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview), [Google crawl troubleshooting and `lastmod`](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors), [Bing sitemap/IndexNow guidance](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search).

## 5. Core Web Vitals and mobile experience

Google's current field thresholds are:

- LCP: within 2.5 seconds.
- INP: under 200 ms.
- CLS: under 0.1.

Core Web Vitals are real-user field metrics, not a synonym for one Lighthouse lab score. Search Console's CWV report and field data should guide prioritization once enough traffic exists. Lighthouse remains useful for reproducible diagnostics, especially images, fonts, render-blocking resources, intrinsic dimensions and mobile interaction, but a one-off 100 or 90 does not prove field performance.

Source: [Google Core Web Vitals guide](https://developers.google.com/search/docs/appearance/core-web-vitals).

## 6. Entity, local and product structured data

### General rule

Google recommends JSON-LD where practical and requires markup to describe content visible on the page. Correct markup does not guarantee a rich result. False reviews, ratings, prices, availability, qualifications, services, opening hours or other claims must not be added.

Sources: [structured-data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data), [general structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

### `Organization` / `LocalBusiness`

Google recommends Organization markup on the home page or a single organization page rather than requiring it on every page. For a physical local business, use the most specific truthful `LocalBusiness` subtype and the applicable LocalBusiness fields. Relevant entity fields include `name`, `alternateName`, stable `url`/`@id`, `logo`, `telephone`, `email`, `address`, factual `openingHoursSpecification`, `contactPoint`, and verified `sameAs` profiles. Schema.org additionally defines `geo` and `areaServed`, but every value must match visible business facts and real service scope.

Maywood's NAP must stay consistent: `03 8753 5522`, `sales@maywoodflooring.com.au`, `49-51 Keysborough Ave, Keysborough, VIC 3173`. Do not infer opening hours, coordinates, statewide service, membership status, or social profiles from incomplete evidence.

Sources: [Google Organization guidance](https://developers.google.com/search/docs/appearance/structured-data/organization), [Google LocalBusiness guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business), [Schema.org LocalBusiness](https://schema.org/LocalBusiness), [Schema.org Organization](https://schema.org/Organization).

### Local ranking

Google Business Profile says local results are mainly based on relevance, distance and prominence. Complete accurate profile data, verified ownership, current hours, legitimate photos and genuine review engagement can help. Google states there is no way to request or pay for a better local ranking. Web links, articles, directories, reviews and ordinary organic position can contribute to prominence.

This means on-site Melbourne/Keysborough content should increase factual relevance and entity consistency, but cannot override physical distance. Do not create doorway suburb pages, invent reviews, or promise rankings.

Sources: [Google tips to improve local ranking](https://support.google.com/business/answer/7091), [Business Profile representation guidelines](https://support.google.com/business/answer/3038177).

### `Product`

Google distinguishes product snippets (including pages where users cannot buy directly) from merchant listings (purchasable products). Maywood's enquiry-led product pages should not invent `Offer`, price or availability simply to satisfy richer merchant markup. Valid factual fields can include name, image, description, brand/category/material and identifiers only where the business actually supplies them and they are visible. Product structured data can clarify a product entity, but enhancement display is discretionary.

Sources: [Google Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product), [Schema.org Product](https://schema.org/Product).

### `BreadcrumbList`

Google uses breadcrumb markup to categorize a page in search results and recommends a typical user path rather than mechanically mirroring the URL. Each `ListItem` needs the supported `position`, `name` and `item` rules; multiple genuine paths are supported. This is particularly relevant to Maywood's intentionally misleading legacy category slugs: the visible/domain hierarchy should use truthful category and collection names without changing protected legacy URLs.

Source: [Google Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).

### `Article`

Use `Article`/`BlogPosting` only for genuine editorial resources or project stories with supported visible facts such as headline, image, author and publication/modification dates. Do not label generic service/category pages as articles. Dates should be real and consistent with the visible page.

Sources: [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article), [Schema.org Article](https://schema.org/Article).

### `FAQPage`

Google stopped showing FAQ rich results on 7 May 2026 and removed the feature documentation in June. Schema.org still defines `FAQPage`, and genuine user-visible FAQs can remain useful content, but Google rich-result eligibility is no longer a reason to add the markup. Do not fabricate questions or answers, duplicate boilerplate across pages, or hide schema-only answers.

Sources: [Google June 2026 documentation update](https://developers.google.com/search/updates#removing-faq-rich-result), [Schema.org FAQPage](https://schema.org/FAQPage).

## 7. Bing, Copilot and IndexNow

Microsoft's official guidance links ordinary Bing crawl/index freshness to AI-powered surfaces. Its February 2026 Bing Webmaster Tools AI Performance preview reports citations, cited pages and sampled grounding queries across Microsoft Copilot, Bing AI summaries and selected partner integrations. Microsoft cautions that citation counts do not indicate rank, authority, answer placement or the role of a page.

IndexNow is a change notification protocol. It should be called for added, updated or deleted URLs and can notify multiple participating engines, but it does not guarantee crawling, indexing, rank or citation. For Maywood, a future low-noise implementation could notify canonical URLs after a successful Sanity-triggered production build, while retaining the sitemap for comprehensive discovery. It should not send all 112 unchanged URLs on every build.

No account, verification, API key, production endpoint or Cloudflare integration is authorized by this research task.

Sources: [Bing AI Performance preview](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview), [Bing Webmaster Tools setup](https://blogs.bing.com/webmaster/June-2025/Start-Using-Bing-Webmaster-Tools-to-Improve-Your-Site-Visibility), [IndexNow usage guidance](https://blogs.bing.com/webmaster/September-2024/IndexNow-When-and-How-Websites-Should-Notify-Search-Engines), [IndexNow protocol](https://www.indexnow.org/documentation).

## 8. Evidence-backed audit priorities for Maywood

1. Verify the exact live robots response and whether `OAI-SearchBot` is allowed independently of `GPTBot`; document Cloudflare's omitted `ai-input` signal accurately.
2. Inspect server-rendered HTML across representative templates for stable entity facts, factual summaries, headings, specifications, visible structured-data claims, crawlable links and canonical consistency.
3. Validate Organization/LocalBusiness identity: one stable entity `@id`, NAP, truthful hours, verified `sameAs`, real coordinates/service area if and only if supplied, and no conflicting duplicate entities.
4. Audit Product nodes against visible content and Google product-snippet requirements; remove or avoid invented Offer/price/availability/reviews.
5. Audit breadcrumb semantics against Category → Collection → Product concepts while preserving ADR-0001 legacy URLs.
6. Classify resources/projects before applying Article markup and source real dates/authorship from Sanity.
7. Treat FAQ as content UX, not a Google rich-result feature; retain only real, maintainable questions.
8. Check sitemap `lastmod` provenance and avoid build-time freshness fabrication.
9. Measure field CWV when GSC data becomes available; use mobile Lighthouse as a lab diagnostic, not the KPI itself.
10. Evaluate Bing Webmaster Tools and event-driven IndexNow as a separately approved follow-up, with no guarantee claims.

## Source freshness note

The most consequential sources were current through July 2026: Google's generative Search guide was updated 10 July 2026, Google's crawler list 14 July 2026, and Cloudflare's managed robots documentation 1 July 2026. These policies are time-sensitive and should be rechecked before any production crawler-policy change.
