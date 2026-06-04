# Issue 跟踪：GitHub

本仓库的 issue 和 PRD 都以 GitHub issues 形式存在，所有操作统一用 `gh` CLI。

## 约定

- **新建 issue**：`gh issue create --title "..." --body "..."`。多行正文用 heredoc。
- **查看 issue**：`gh issue view <number> --comments`，必要时用 `jq` 过滤评论，并一并取 labels。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需加 `--label`、`--state` 过滤。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **增删 label**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

仓库从 `git remote -v` 自动推断——在 clone 内运行 `gh` 会自动识别。
本仓库 remote：`github.com/w7flooring-creator/maywood-flooring-landing-page`。

## 当某个 skill 说「发布到 issue tracker」

新建一个 GitHub issue。

## 当某个 skill 说「取出对应的 ticket」

运行 `gh issue view <number> --comments`。
