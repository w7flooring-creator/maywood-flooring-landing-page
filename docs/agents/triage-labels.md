# Triage Labels（分流标签）

这些 skill 用五个标准 triage 角色来表达分流状态。本文件把这些角色映射到本仓库 issue tracker 里**实际使用的** label 字符串。

| mattpocock/skills 里的角色 | 本仓库的 label | 含义 |
| -------------------------- | -------------- | ---- |
| `needs-triage`             | `needs-triage`    | 维护者需要评估这个 issue |
| `needs-info`               | `needs-info`      | 等待报告者补充信息 |
| `ready-for-agent`          | `ready-for-agent` | 已完整描述，可交给 AFK agent 直接处理 |
| `ready-for-human`          | `ready-for-human` | 需要人来实现 |
| `wontfix`                  | `wontfix`         | 不会处理 |

当某个 skill 提到某个角色（例如「打上 AFK-ready 的 triage 标签」），就用上表里对应的 label 字符串。

这些是**默认字符串**——本仓库目前没有预设 label，所以 `triage` skill 会在需要时自动在 GitHub 上创建。若以后改用别的命名，编辑右栏即可。
