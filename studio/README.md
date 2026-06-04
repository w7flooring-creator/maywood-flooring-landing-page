# Maywood Flooring — Sanity Studio

非技术人员的内容后台。骨架阶段为**空 schema**，document types 在后续 issue 中实现
（清单见根目录 `AGENTS.md`「Sanity CMS 模型」）。

## 安装与启动（独立于根项目）

```bash
cd studio
npm install
# 首次需登录并关联/创建 Sanity 项目：
npx sanity init --env       # 写入 SANITY_STUDIO_PROJECT_ID / DATASET
npm run dev                 # 本地 http://localhost:3333
```

## 部署

```bash
npm run deploy              # → maywood.sanity.studio（Sanity 托管，已敲定决策）
```

- Dataset：**public**（build 时无需 read token）。
- 托管：**Sanity 托管 `*.sanity.studio`**；品牌子域以后再说。
