# Maywood Flooring — 领域术语

Maywood Flooring 官网的领域语言表。本表只定义概念**是什么**，不含实现细节或路由。
消费规则见 `docs/agents/domain.md`。命名产品概念时（issue 标题、组件名、文案）以本表为准。

## 产品分类

**Category（分类）**：
按构造/材质划分的顶层产品族，是主导航 “Products” 下的一级分类。共**三个**，规范展示名为
Engineered、Laminate、Hybrid（首页产品入口卡把 Engineered 称作 “Timber”，仅作营销别名）。
_Avoid_: type、material type、sub-category（子分类）、range

**Collection（系列）**：
隶属于**恰好一个** Category 的品牌产品系列，是 Category 页 “Browse by” 侧栏的分组单位。
例：Engineered 下的 Bushland；Laminate 下的 Hydrocore、AquaGlow 72hr、MTF 24hr；Hybrid 下的 Guardian、Duro Plus。
_Avoid_: sub-category（子分类）、series、line、range

**Signature Collection（招牌系列）**：
被首页与主导航重点推广、并拥有**独立营销落地页**的 Collection。目前是 Engineered 下的四个：
PureGrain、Bushland、Bellavale、Manor。其余 Collection 只在 Category 页内作为分组存在。
_Avoid_: featured collection

**Product（产品）**：
单个地板款式（如 Blackbutt、Spotted Gum），带规格字段（Type、Dimension、Finish 等），
隶属于一个 Category 与一个 Collection。
_Avoid_: SKU（对外文案中）、item、款式（作为实体名）
