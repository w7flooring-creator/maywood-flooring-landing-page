/**
 * 表单提交客户端层 —— ContactForm / SampleRequestIsland 共用的 fetch 封装。
 *
 * Phase 2（#25）：把已校验的表单字段 + Turnstile token POST 到 Worker API
 * （/api/contact 或 /api/sample），由 Worker 验 token 并经 Resend 发信。
 * 不依赖 React / DOM，便于单测（mock fetch，见 form-submit.test.ts）。
 *
 * 设计：成功 / 失败都以一致的判别联合返回，island 据此切换状态提示，
 * 不抛异常（网络错误也收敛成 `{ ok:false }`），让 UI 处理路径单一。
 */

/** 提交结果 —— island 用 `ok` 判别成功态 / 错误态。 */
export type SubmitResult = { ok: true } | { ok: false; error: string };

/** Worker 两个 API 端点（保持与 worker/index.ts 一致）。 */
export const FORM_ENDPOINTS = {
  contact: "/api/contact",
  sample: "/api/sample",
} as const;

/** 面向访客的通用错误文案（澳洲拼写）。 */
const GENERIC_ERROR =
  "Sorry, something went wrong sending your message. Please try again, or email us directly.";

/**
 * 把表单字段 + Turnstile token POST 到指定端点。
 *
 * @param endpoint Worker API 路径（用 FORM_ENDPOINTS）
 * @param fields 已通过 zod 校验的表单字段
 * @param turnstileToken Turnstile widget 产出的 token
 * @param fetchImpl 可注入的 fetch（默认 globalThis.fetch，便于测试）
 */
export async function submitForm(
  endpoint: string,
  fields: Record<string, unknown>,
  turnstileToken: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<SubmitResult> {
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, turnstileToken }),
    });

    let payload: { ok?: boolean; error?: string } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // 非 JSON 响应（如 502 HTML）：按通用错误处理。
    }

    if (response.ok && payload.ok) {
      return { ok: true };
    }

    return { ok: false, error: payload.error ?? GENERIC_ERROR };
  } catch {
    // 网络层失败（断网 / CORS / DNS）。
    return { ok: false, error: GENERIC_ERROR };
  }
}
