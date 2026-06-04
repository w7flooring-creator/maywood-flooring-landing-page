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
import { NAP } from "@/lib/site";

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
 * 不存任何数据、不发请求 —— 仅打开访客邮件客户端预填样品申请。
 * 真正的服务端处理（Resend + Turnstile）见 #25（Phase 2）。
 */
export function buildSampleMailtoHref(values: SampleRequestValues): string {
  const subject = `Sample request from ${values.name}`;
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
