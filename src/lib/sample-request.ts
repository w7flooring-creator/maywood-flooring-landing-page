/**
 * Sample Request 表单纯逻辑层 —— zod schema + mailto 组装。
 *
 * 与 contact-form.ts 镜像：不依赖 React / DOM，便于单测（见 sample-request.test.ts）。
 * SampleRequestIsland 消费这里：校验用 `sampleRequestSchema`，Phase 1 提交占位用
 * `buildSampleMailtoHref` 拼出 mailto:（真后端见 #25 Phase 2）。
 *
 * 字段：name / email / phone（可选）/ productInterest（可选，自由文本，指 Product 或
 * Collection）/ deliveryAddress / message。文案澳洲拼写；错误信息直接面向访客，
 * 故用完整句子。
 */
import { z } from "zod";
// 用相对路径（非 @/ 别名）：本文件被 worker/index.ts 间接 import，
// 而 wrangler 的 esbuild 打包不读 tsconfig paths，相对路径才能跨 Vite / 测试 / Worker 一致解析。
import { NAP } from "./site";
import { escapeHtml } from "./contact-form";

/** Sample Request 表单校验 schema —— react-hook-form 经 zodResolver 共用同一份。 */
export const sampleRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Please enter your name." })
    .max(120, { message: "Name is too long." }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Please enter your email address." })
    .email({ message: "Please enter a valid email address." }),
  phone: z
    .string()
    .trim()
    .max(40, { message: "Phone number is too long." })
    .optional(),
  productInterest: z
    .string()
    .trim()
    .max(200, { message: "That is a little too long." })
    .optional(),
  deliveryAddress: z
    .string()
    .trim()
    .min(10, {
      message: "Please enter the delivery address (at least 10 characters).",
    })
    .max(300, { message: "Delivery address is too long." }),
  message: z
    .string()
    .trim()
    .max(2000, { message: "Message is too long." })
    .optional(),
});

/** 表单数据类型（schema 单一来源推导）。 */
export type SampleRequestValues = z.infer<typeof sampleRequestSchema>;

/** 表单字段默认值 —— island 初始化 react-hook-form 时复用。 */
export const sampleRequestDefaults: SampleRequestValues = {
  name: "",
  email: "",
  phone: "",
  productInterest: "",
  deliveryAddress: "",
  message: "",
};

/**
 * Phase 1 提交占位：把样品申请内容组装成发往 sales@ 的 mailto: 链接。
 *
 * Phase 2（#25）已上线 Worker 后端，此函数仅在 `PUBLIC_TURNSTILE_SITE_KEY`
 * 未配置（本地 / 无 key 的开发环境）时作为优雅回落使用 —— 仍不存数据、不发请求，
 * 只打开访客邮件客户端预填样品申请。
 */
export function buildSampleMailtoHref(values: SampleRequestValues): string {
  const subject = buildSampleSubject(values);
  const lines = [`Name: ${values.name}`, `Email: ${values.email}`];
  if (values.phone) lines.push(`Phone: ${values.phone}`);
  if (values.productInterest)
    lines.push(`Product / collection of interest: ${values.productInterest}`);
  lines.push(`Delivery address: ${values.deliveryAddress}`);
  if (values.message) {
    lines.push("", values.message);
  }

  const params = new URLSearchParams({ subject, body: lines.join("\n") });
  return `mailto:${NAP.email}?${params.toString()}`;
}

/** 样品申请邮件主题 —— Worker（Resend）与 mailto 回落共用。 */
export function buildSampleSubject(values: SampleRequestValues): string {
  return `Sample request from ${values.name}`;
}

/**
 * 把样品申请字段组装成可读的 HTML 邮件正文（供 Worker 经 Resend 发送）。
 *
 * 所有访客输入都经 `escapeHtml` 转义后才插入；可选字段为空时不输出该行。
 * 复用 contact-form.ts 的 `escapeHtml`，保持转义逻辑单一来源。澳洲拼写。
 */
export function buildSampleEmailHtml(values: SampleRequestValues): string {
  const rows: Array<[string, string]> = [
    ["Name", values.name],
    ["Email", values.email],
  ];
  if (values.phone) rows.push(["Phone", values.phone]);
  if (values.productInterest)
    rows.push(["Product / collection of interest", values.productInterest]);
  rows.push(["Delivery address", values.deliveryAddress]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top;">${escapeHtml(
          label
        )}</td><td style="padding:4px 0;white-space:pre-wrap;">${escapeHtml(
          value
        ).replace(/\n/g, "<br>")}</td></tr>`
    )
    .join("");

  const parts = [
    `<h2 style="font-family:Georgia,serif;">New sample request</h2>`,
    `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse;">${tableRows}</table>`,
  ];

  if (values.message) {
    parts.push(
      `<h3 style="font-family:Arial,sans-serif;font-size:14px;margin-bottom:4px;">Message</h3>`,
      `<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${escapeHtml(
        values.message
      ).replace(/\n/g, "<br>")}</p>`
    );
  }

  return parts.join("\n");
}
