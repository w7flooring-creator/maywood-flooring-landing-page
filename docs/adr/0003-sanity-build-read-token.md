# build 时用 Sanity 只读 token 拉取内容

ADR-0001 之外的运行期决策。原 #2 决策是「public dataset，build 时无需 read token」。但实测 project `1soy4f28` 的 `production` dataset 虽 `aclMode=public`（匿名请求返回 200 而非 401），**匿名（无 token）查询一律返回空**，而带 token 的查询能正确读到已发布文档（3 categories / 9 collections）。重新 PATCH `aclMode=public` 无效。根因疑为该项目/组织层面的公开 API 服务异常，无法从代码侧修复。

**决策**：build 时改用一个 **viewer 只读 token** 拉取内容。`getSanityClient` 在检测到 `SANITY_API_READ_TOKEN` 时带 token 走 live API（无 token 才回退 CDN）。token 为**服务端 only**（非 `PUBLIC_` 前缀，不进客户端 bundle）。

## Consequences

- token 存放：本地 `.env`（git-ignored）；CI 用 GitHub Actions **Secret** `SANITY_API_READ_TOKEN`（workflow build 步注入）；Cloudflare 用 Worker **Secret** `SANITY_API_READ_TOKEN`。**绝不提交仓库**。
- 与 ADR-0001/术语无关；纯部署/读取层。
- 若以后公开 API 恢复正常匿名读取，可移除 token（`getSanityClient` 无 token 时自动回退 CDN，向后兼容）。
- 该 token 是只读 viewer，泄露风险低（dataset 内容本就拟公开）；如需可在 Sanity 后台轮换。
