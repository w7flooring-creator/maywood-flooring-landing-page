# Domain Docs（领域文档）

约定这些工程类 skill 在探查代码库时，应如何消费本仓库的领域文档。

本仓库是 **single-context（单上下文）**：根目录一个 `CONTEXT.md` + `docs/adr/`。

## 探查前先读这些

- 根目录的 **`CONTEXT.md`**。
- **`docs/adr/`**——读与你即将动手区域相关的 ADR。

如果这些文件还不存在，**保持沉默照常进行**。不要提示它们缺失，也不要一上来就建议创建。生产这些文档的 skill（`/grill-with-docs`）会在术语或决策真正被敲定时按需创建。

## 文件结构

单上下文仓库（本仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-astro-ssg-react-islands.md
│   └── 0002-sanity-public-dataset.md
└── src/
```

> 如果本项目以后拆成真正的 monorepo、含相互独立的领域（例如 `apps/web` 与 `apps/studio` 各成一个上下文），则切换到 multi-context 布局：根目录加一个 `CONTEXT-MAP.md` 指向各上下文的 `CONTEXT.md`，并使用按上下文划分的 `src/<context>/docs/adr/` 目录。

## 使用术语表里的词汇

当你的产出涉及某个领域概念（issue 标题、重构提案、假设、测试名等），使用 `CONTEXT.md` 里定义的术语。不要漂移到术语表明确回避的同义词。

如果你需要的概念还没进术语表，这是个信号——要么你在发明项目并不使用的措辞（请重新考虑），要么存在真实缺口（记下来交给 `/grill-with-docs`）。

## 标注 ADR 冲突

如果你的产出与现有 ADR 矛盾，明确指出，而不是悄悄覆盖：

> _与 ADR-0007（event-sourced orders）冲突——但值得重新讨论，因为……_
