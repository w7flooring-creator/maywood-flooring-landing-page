import { describe, it, expect } from "vitest";
import {
  sampleRequestSchema,
  sampleRequestDefaults,
  buildSampleMailtoHref,
  type SampleRequestValues,
} from "@/lib/sample-request";
import { NAP } from "@/lib/site";

// 一组合法基线（含可选字段），单条字段改坏后逐项断言（保证每条规则独立生效）。
const validInput: SampleRequestValues = {
  name: "Jordan Nguyen",
  email: "jordan@example.com",
  phone: "0412 345 678",
  productInterest: "Bushland engineered oak",
  deliveryAddress: "12 Example St, Keysborough VIC 3173",
  message: "Two samples please, matte finish.",
};

describe("sampleRequestSchema — 校验合法输入", () => {
  it("接受完整合法表单", () => {
    const result = sampleRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("可选字段（phone / productInterest / message）缺省时仍通过", () => {
    const result = sampleRequestSchema.safeParse({
      name: "Sam Taylor",
      email: "sam@example.com",
      deliveryAddress: "5 Sample Rd, Melbourne VIC 3000",
    });
    expect(result.success).toBe(true);
  });

  it("trim 两端空白后保存", () => {
    const result = sampleRequestSchema.safeParse({
      ...validInput,
      name: "  Jordan Nguyen  ",
      email: "  jordan@example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jordan Nguyen");
      expect(result.data.email).toBe("jordan@example.com");
    }
  });
});

describe("sampleRequestSchema — 拒绝非法输入并给出对应信息", () => {
  it("空 name 报错", () => {
    const result = sampleRequestSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["name"]);
      expect(result.error.issues[0]?.message).toMatch(/name/i);
    }
  });

  it("格式错误的 email 报错", () => {
    const result = sampleRequestSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["email"]);
      expect(result.error.issues[0]?.message).toMatch(/valid email/i);
    }
  });

  it("过短的 deliveryAddress 报错（少于 10 字符）", () => {
    const result = sampleRequestSchema.safeParse({
      ...validInput,
      deliveryAddress: "too short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["deliveryAddress"]);
    }
  });

  it("只有空白的 deliveryAddress 经 trim 后视为过短，报错", () => {
    const result = sampleRequestSchema.safeParse({
      ...validInput,
      deliveryAddress: "          ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["deliveryAddress"]);
    }
  });

  it("超长字段报错（防滥用）", () => {
    const result = sampleRequestSchema.safeParse({
      ...validInput,
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("过长的 phone 报错", () => {
    const result = sampleRequestSchema.safeParse({
      ...validInput,
      phone: "1".repeat(41),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["phone"]);
    }
  });
});

describe("sampleRequestDefaults", () => {
  it("默认值全为空串（仅作初始化，不通过校验）", () => {
    expect(sampleRequestDefaults).toEqual({
      name: "",
      email: "",
      phone: "",
      productInterest: "",
      deliveryAddress: "",
      message: "",
    });
  });
});

describe("buildSampleMailtoHref — Phase 1 提交占位", () => {
  it("发往 NAP.email 的单一来源地址", () => {
    const href = buildSampleMailtoHref(validInput);
    expect(href.startsWith(`mailto:${NAP.email}?`)).toBe(true);
  });

  it("subject 含姓名，body 含姓名 / 邮箱 / 地址 / 可选字段（URL 编码）", () => {
    const href = buildSampleMailtoHref(validInput);
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    expect(params.get("subject")).toBe("Sample request from Jordan Nguyen");
    const body = params.get("body") ?? "";
    expect(body).toContain("Jordan Nguyen");
    expect(body).toContain("jordan@example.com");
    expect(body).toContain("0412 345 678");
    expect(body).toContain("Bushland engineered oak");
    expect(body).toContain("12 Example St, Keysborough VIC 3173");
    expect(body).toContain("Two samples please");
  });

  it("省略可选字段时 body 不含其标签行", () => {
    const href = buildSampleMailtoHref({
      name: "Sam Taylor",
      email: "sam@example.com",
      deliveryAddress: "5 Sample Rd, Melbourne VIC 3000",
    });
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    const body = params.get("body") ?? "";
    expect(body).not.toContain("Phone:");
    expect(body).not.toContain("Product / collection of interest:");
    expect(body).toContain("Delivery address: 5 Sample Rd");
  });
});
