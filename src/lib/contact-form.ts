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
import { NAP } from "@/lib/site";

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
 * 不存任何数据、不发请求 —— 仅打开访客邮件客户端预填询盘。
 * 真正的服务端处理（Resend + Turnstile）见 #25（Phase 2）。
 */
export function buildMailtoHref(values: ContactFormValues): string {
  const name = `${values.firstName} ${values.lastName}`.trim();
  const subject = `Website enquiry from ${name}`;
  const body = [
    `Name: ${name}`,
    `Email: ${values.email}`,
    "",
    values.message,
  ].join("\n");

  const params = new URLSearchParams({ subject, body });
  return `mailto:${NAP.email}?${params.toString()}`;
}
