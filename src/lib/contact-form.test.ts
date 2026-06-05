import { describe, it, expect } from "vitest";
import {
  contactFormSchema,
  contactFormDefaults,
  buildMailtoHref,
  buildContactSubject,
  buildContactEmailHtml,
  escapeHtml,
  type ContactFormValues,
} from "@/lib/contact-form";
import { NAP } from "@/lib/site";

// 一组合法基线，单条字段改坏后逐项断言（保证每条规则独立生效）。
const validInput: ContactFormValues = {
  firstName: "Jordan",
  lastName: "Nguyen",
  email: "jordan@example.com",
  message: "I would like a quote for engineered oak flooring, thanks.",
};

describe("contactFormSchema — 校验合法输入", () => {
  it("接受完整合法表单", () => {
    const result = contactFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("trim 两端空白后保存", () => {
    const result = contactFormSchema.safeParse({
      ...validInput,
      firstName: "  Jordan  ",
      email: "  jordan@example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Jordan");
      expect(result.data.email).toBe("jordan@example.com");
    }
  });
});

describe("contactFormSchema — 拒绝非法输入并给出对应信息", () => {
  it("空 firstName 报错", () => {
    const result = contactFormSchema.safeParse({
      ...validInput,
      firstName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["firstName"]);
      expect(result.error.issues[0]?.message).toMatch(/first name/i);
    }
  });

  it("只有空白的 lastName 经 trim 后视为空，报错", () => {
    const result = contactFormSchema.safeParse({
      ...validInput,
      lastName: "   ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["lastName"]);
    }
  });

  it("格式错误的 email 报错", () => {
    const result = contactFormSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["email"]);
      expect(result.error.issues[0]?.message).toMatch(/valid email/i);
    }
  });

  it("过短的 message 报错（少于 10 字符）", () => {
    const result = contactFormSchema.safeParse({
      ...validInput,
      message: "hi",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["message"]);
    }
  });

  it("超长字段报错（防滥用）", () => {
    const result = contactFormSchema.safeParse({
      ...validInput,
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("一次性收集多个字段错误", () => {
    const result = contactFormSchema.safeParse({
      firstName: "",
      lastName: "",
      email: "bad",
      message: "x",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(new Set(paths)).toEqual(
        new Set(["firstName", "lastName", "email", "message"])
      );
    }
  });
});

describe("contactFormDefaults", () => {
  it("默认值全为空串且通过类型形状（不通过校验，仅作初始化）", () => {
    expect(contactFormDefaults).toEqual({
      firstName: "",
      lastName: "",
      email: "",
      message: "",
    });
  });
});

describe("buildMailtoHref — Phase 1 提交占位", () => {
  it("发往 NAP.email 的单一来源地址", () => {
    const href = buildMailtoHref(validInput);
    expect(href.startsWith(`mailto:${NAP.email}?`)).toBe(true);
  });

  it("subject 含姓名，body 含姓名 / 邮箱 / 留言（URL 编码）", () => {
    const href = buildMailtoHref(validInput);
    const query = href.slice(href.indexOf("?") + 1);
    const params = new URLSearchParams(query);
    expect(params.get("subject")).toBe("Website enquiry from Jordan Nguyen");
    const body = params.get("body") ?? "";
    expect(body).toContain("Jordan Nguyen");
    expect(body).toContain("jordan@example.com");
    expect(body).toContain("engineered oak flooring");
  });
});

describe("buildContactSubject — Worker / mailto 共用主题", () => {
  it("含访客姓名", () => {
    expect(buildContactSubject(validInput)).toBe(
      "Website enquiry from Jordan Nguyen"
    );
  });
});

describe("buildContactEmailHtml — Worker 经 Resend 发的 HTML 正文", () => {
  it("含姓名 / 邮箱 / 留言", () => {
    const html = buildContactEmailHtml(validInput);
    expect(html).toContain("Jordan Nguyen");
    expect(html).toContain("jordan@example.com");
    expect(html).toContain("engineered oak flooring");
  });

  it("转义访客输入，防 HTML 注入", () => {
    const html = buildContactEmailHtml({
      ...validInput,
      message: "<b>bold</b> & <script>x</script> please quote me",
    });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("留言换行转 <br>", () => {
    const html = buildContactEmailHtml({
      ...validInput,
      message: "line one\nline two and more text",
    });
    expect(html).toContain("line one<br>line two");
  });
});

describe("escapeHtml", () => {
  it("转义 & < > \" '", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;"
    );
  });
});
