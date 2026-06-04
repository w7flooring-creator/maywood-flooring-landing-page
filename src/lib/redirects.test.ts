import { describe, it, expect } from "vitest";
import {
  STATIC_REDIRECTS,
  PRESERVED_PREFIXES,
  REDIRECTS_QUERY,
  redirectDocToRule,
  serialiseRule,
  buildRedirectsFile,
  type RedirectDoc,
  type RedirectRule,
} from "@/lib/redirects";

/**
 * 只测纯函数（不触网）：Sanity `redirect` 文档 → `_redirects` 行的序列化、
 * 状态码、与静态规则合并去重、以及保护 1:1 保留路由不被重定向。
 * 真实 Sanity 数据由 build 时拉取 + studio 端验证（见 PR 描述）。
 */

describe("STATIC_REDIRECTS（ADR-0001 例外：booking-calendar 交易 funnel）", () => {
  it("覆盖全部 5 个线上 booking-calendar service slug → 对应 service 页", () => {
    const byFrom = Object.fromEntries(STATIC_REDIRECTS.map((r) => [r.from, r]));
    expect(byFrom["/booking-calendar/flooring-consultation"]?.to).toBe(
      "/service-page/flooring-consultation"
    );
    expect(byFrom["/booking-calendar/flooring-consultation-1"]?.to).toBe(
      "/service-page/flooring-consultation-1"
    );
    expect(byFrom["/booking-calendar/sample-viewing"]?.to).toBe(
      "/service-page/sample-viewing"
    );
    expect(byFrom["/booking-calendar/flooring-workshop"]?.to).toBe(
      "/service-page/flooring-workshop"
    );
    expect(byFrom["/booking-calendar/installation-workshop"]?.to).toBe(
      "/service-page/installation-workshop"
    );
  });

  it("全部静态规则均为 301（永久，传递 SEO 权重）", () => {
    for (const rule of STATIC_REDIRECTS) {
      expect(rule.status).toBe(301);
    }
  });

  it("含 booking-calendar 通配兜底 → /contact（无明确匹配时）", () => {
    const splat = STATIC_REDIRECTS.find(
      (r) => r.from === "/booking-calendar/*"
    );
    expect(splat).toBeDefined();
    expect(splat?.to).toBe("/contact");
    expect(splat?.status).toBe(301);
  });

  it("通配兜底排在所有具体 booking-calendar 规则之后（Cloudflare 首条命中）", () => {
    const froms = STATIC_REDIRECTS.map((r) => r.from);
    const splatIndex = froms.indexOf("/booking-calendar/*");
    const lastSpecific = froms.reduce(
      (max, f, i) =>
        f.startsWith("/booking-calendar/") && f !== "/booking-calendar/*"
          ? Math.max(max, i)
          : max,
      -1
    );
    expect(splatIndex).toBeGreaterThan(lastSpecific);
  });

  it("from/to 均为站内路径（以 / 开头），不破坏保留的 1:1 内容 URL", () => {
    for (const rule of STATIC_REDIRECTS) {
      expect(rule.from.startsWith("/")).toBe(true);
      expect(rule.to.startsWith("/")).toBe(true);
    }
  });
});

describe("redirectDocToRule（Sanity 文档 → 规则）", () => {
  it("permanent 缺省 / true → 301", () => {
    expect(redirectDocToRule({ from: "/a", to: "/b" }).status).toBe(301);
    expect(
      redirectDocToRule({ from: "/a", to: "/b", permanent: true }).status
    ).toBe(301);
  });

  it("permanent === false → 302", () => {
    expect(
      redirectDocToRule({ from: "/a", to: "/b", permanent: false }).status
    ).toBe(302);
  });

  it("trim 掉 from/to 两端空白", () => {
    const rule = redirectDocToRule({ from: "  /a  ", to: "  /b  " });
    expect(rule.from).toBe("/a");
    expect(rule.to).toBe("/b");
  });
});

describe("serialiseRule（规则 → 单行 Cloudflare 语法）", () => {
  it("输出 `<from> <to> <status>`", () => {
    expect(serialiseRule({ from: "/old", to: "/new", status: 301 })).toBe(
      "/old /new 301"
    );
  });

  it("302 临时重定向同样格式", () => {
    expect(serialiseRule({ from: "/x", to: "/y", status: 302 })).toBe(
      "/x /y 302"
    );
  });
});

describe("buildRedirectsFile（静态规则 + 编辑维护规则 合并）", () => {
  it("产出以注释开头的文件，并含 booking-calendar 静态规则", () => {
    const out = buildRedirectsFile([]);
    expect(out.startsWith("#")).toBe(true);
    expect(out).toContain(
      "/booking-calendar/flooring-consultation /service-page/flooring-consultation 301"
    );
    expect(out).toContain("/booking-calendar/* /contact 301");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("把编辑维护的 redirect 文档序列化进文件", () => {
    const docs: RedirectDoc[] = [
      { from: "/old-blog", to: "/resources", permanent: true },
      { from: "/promo", to: "/contact", permanent: false },
    ];
    const out = buildRedirectsFile(docs);
    expect(out).toContain("/old-blog /resources 301");
    expect(out).toContain("/promo /contact 302");
  });

  it("编辑规则不得覆盖（clobber）同源静态规则——静态优先且去重", () => {
    const docs: RedirectDoc[] = [
      { from: "/booking-calendar/sample-viewing", to: "/somewhere-else" },
    ];
    const out = buildRedirectsFile(docs);
    // 仍指向静态目标
    expect(out).toContain(
      "/booking-calendar/sample-viewing /service-page/sample-viewing 301"
    );
    // 不出现编辑给的冲突目标
    expect(out).not.toContain("/somewhere-else");
    // 该源只出现一次
    const occurrences = out
      .split("\n")
      .filter((l) => l.startsWith("/booking-calendar/sample-viewing ")).length;
    expect(occurrences).toBe(1);
  });

  it("编辑规则之间同源去重（保留首条）", () => {
    const docs: RedirectDoc[] = [
      { from: "/dup", to: "/first" },
      { from: "/dup", to: "/second" },
    ];
    const out = buildRedirectsFile(docs);
    const lines = out.split("\n").filter((l) => l.startsWith("/dup "));
    expect(lines).toEqual(["/dup /first 301"]);
  });

  it("拒绝会破坏 1:1 保留路由的编辑规则（from 命中保留前缀）", () => {
    const docs: RedirectDoc[] = [
      // 这些是 ADR-0001 必须 1:1 保留、禁止重定向的内容 URL
      { from: "/category/solid-flooring", to: "/category/laminate" },
      { from: "/product-page/blackbutt", to: "/x" },
      { from: "/contact", to: "/x" },
      { from: "/", to: "/somewhere" },
    ];
    const out = buildRedirectsFile(docs);
    expect(out).not.toContain("/category/solid-flooring ");
    expect(out).not.toContain("/product-page/blackbutt ");
    // /contact 作为重定向源不允许（它是保留的真实页面）
    const contactAsSource = out
      .split("\n")
      .some((l) => l.startsWith("/contact "));
    expect(contactAsSource).toBe(false);
    // 根路径不允许作为重定向源
    const rootAsSource = out.split("\n").some((l) => l.startsWith("/ "));
    expect(rootAsSource).toBe(false);
  });

  it("忽略 from 或 to 缺失 / 非法（不以 / 开头）的脏文档", () => {
    const docs: RedirectDoc[] = [
      { from: "", to: "/x" },
      { from: "/y", to: "" },
      { from: "no-slash", to: "/z" },
    ];
    const out = buildRedirectsFile(docs);
    expect(out).not.toContain("/x");
    expect(out).not.toContain("/y ");
    expect(out).not.toContain("no-slash");
  });

  it("from === to 的无意义规则被忽略（避免重定向环）", () => {
    const docs: RedirectDoc[] = [{ from: "/loop", to: "/loop" }];
    const out = buildRedirectsFile(docs);
    expect(out).not.toContain("/loop ");
  });

  it("PRESERVED_PREFIXES 覆盖全部保留内容路由前缀", () => {
    expect(PRESERVED_PREFIXES).toContain("/category/");
    expect(PRESERVED_PREFIXES).toContain("/product-page/");
    expect(PRESERVED_PREFIXES).toContain("/service-page/");
    expect(PRESERVED_PREFIXES).toContain("/projects/");
  });
});

describe("REDIRECTS_QUERY（GROQ）", () => {
  it("选 redirect 文档并投影 from/to/permanent", () => {
    expect(REDIRECTS_QUERY).toContain('_type == "redirect"');
    expect(REDIRECTS_QUERY).toContain("from");
    expect(REDIRECTS_QUERY).toContain("to");
    expect(REDIRECTS_QUERY).toContain("permanent");
  });

  it("不把任何具体值插进字符串（纯静态查询）", () => {
    expect(REDIRECTS_QUERY).not.toContain("booking-calendar");
  });
});

// 类型出口存在性（编译期保障）
describe("类型导出", () => {
  it("RedirectRule / RedirectDoc 可用", () => {
    const rule: RedirectRule = { from: "/a", to: "/b", status: 301 };
    const doc: RedirectDoc = { from: "/a", to: "/b" };
    expect(rule.status).toBe(301);
    expect(doc.from).toBe("/a");
  });
});
