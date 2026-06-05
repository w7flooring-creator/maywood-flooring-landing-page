/**
 * Contact 表单纯逻辑层 —— zod schema + mailto 组装。
 *
 * 不依赖 React / DOM，便于单测（valid / invalid 用例见 contact-form.test.ts）。
 * ContactForm island 消费这里：校验用 `contactFormSchema`，Phase 1 提交占位
 * 用 `buildMailtoHref` 拼出 mailto:（真后端见 #25 Phase 2）。
 *
 * 字段对照线上 Wix 表单：First Name / Last Name / Email / Message。
 * 文案澳洲拼写。错误信息直接面向访客，故用完整句子。
 */
import { z } from "zod";
// 用相对路径（非 @/ 别名）：本文件被 worker/index.ts 间接 import，
// 而 wrangler 的 esbuild 打包不读 tsconfig paths，相对路径才能跨 Vite / 测试 / Worker 一致解析。
import { NAP } from "./site";

/** Contact 表单校验 schema —— react-hook-form 经 zodResolver 共用同一份。 */
export const contactFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "Please enter your first name." })
    .max(80, { message: "First name is too long." }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: "Please enter your last name." })
    .max(80, { message: "Last name is too long." }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Please enter your email address." })
    .email({ message: "Please enter a valid email address." }),
  message: z
    .string()
    .trim()
    .min(10, {
      message: "Please tell us a little more (at least 10 characters).",
    })
    .max(2000, { message: "Message is too long." }),
});

/** 表单数据类型（schema 单一来源推导）。 */
export type ContactFormValues = z.infer<typeof contactFormSchema>;

/** 表单字段默认值 —— island 初始化 react-hook-form 时复用。 */
export const contactFormDefaults: ContactFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

/**
 * Phase 1 提交占位：把表单内容组装成发往 sales@ 的 mailto: 链接。
 *
 * Phase 2（#25）已上线 Worker 后端，此函数仅在 `PUBLIC_TURNSTILE_SITE_KEY`
 * 未配置（本地 / 无 key 的开发环境）时作为优雅回落使用 —— 仍不存数据、不发请求，
 * 只打开访客邮件客户端预填询盘。
 */
export function buildMailtoHref(values: ContactFormValues): string {
  const name = `${values.firstName} ${values.lastName}`.trim();
  const subject = buildContactSubject(values);
  const body = [
    `Name: ${name}`,
    `Email: ${values.email}`,
    "",
    values.message,
  ].join("\n");

  const params = new URLSearchParams({ subject, body });
  return `mailto:${NAP.email}?${params.toString()}`;
}

/** 询盘邮件主题 —— Worker（Resend）与 mailto 回落共用，确保措辞一致。 */
export function buildContactSubject(values: ContactFormValues): string {
  const name = `${values.firstName} ${values.lastName}`.trim();
  return `Website enquiry from ${name}`;
}

/**
 * 把询盘字段组装成可读的 HTML 邮件正文（供 Worker 经 Resend 发送）。
 *
 * 所有访客输入都经 `escapeHtml` 转义后才插入，防止 HTML 注入；
 * 留言里的换行转成 <br> 以保留排版。澳洲拼写。
 */
export function buildContactEmailHtml(values: ContactFormValues): string {
  const name = `${values.firstName} ${values.lastName}`.trim();
  const rows = [
    ["Name", name],
    ["Email", values.email],
  ];
  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top;">${escapeHtml(
          label
        )}</td><td style="padding:4px 0;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return [
    `<h2 style="font-family:Georgia,serif;">New website enquiry</h2>`,
    `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse;">${tableRows}</table>`,
    `<h3 style="font-family:Arial,sans-serif;font-size:14px;margin-bottom:4px;">Message</h3>`,
    `<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${escapeHtml(
      values.message
    ).replace(/\n/g, "<br>")}</p>`,
  ].join("\n");
}

/**
 * 转义 HTML 特殊字符，避免访客输入破坏邮件结构或注入标记。
 *
 * 放在 contact-form.ts（纯逻辑、无 DOM 依赖）以便 Worker 与单测都能 import。
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
