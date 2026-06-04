# 平迁阶段保留全部 legacy Wix URL

Phase 1 把现有 Wix 站点的所有公开 URL 1:1 迁移，**不改 slug、不引入 redirect**——包括与内容不符的历史 slug：`/category/solid-flooring` 实际渲染 **Laminate Flooring** 页，`/category/sustainable-flooring` 实际渲染 **Hybrid Flooring** 页（只有 `engineered-flooring` 名实相符）。这是一个 SEO 获客站，平迁期任何 URL 变动都可能引入排名回归，而我们尚无 Google Search Console 数据来判断哪些 URL 值得为「更干净的 slug」去冒 301 权重损耗的风险。

## Consequences

- 未来开发者会困惑「为什么 Laminate 页的 slug 是 `solid-flooring`」——这是**故意保留**的历史包袱，不要顺手「修正」；改动需走 Phase 2 + 301 + GSC 评估。
- 「修 slug + 全站 301」降级为 Phase 2 优化项，仅在拿到搜索数据、确认收益大于权重损耗时执行。
- 不动 URL 的前提下，现在就修复两类零风险问题：
  1. 页面内 intro 文案错配（Laminate 页误写 "solid timber"、Hybrid 页误写 "sustainable... managed forests"），改成与页面实际内容相符。
  2. `/<collection>` 营销落地页与 `/category/<collection>` store 视图近重复——两者都保留（不断链），用 `rel=canonical` 指向营销落地页 `/<collection>` 作为主版本。
