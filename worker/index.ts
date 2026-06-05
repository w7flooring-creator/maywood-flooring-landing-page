/**
 * Cloudflare Worker —— 静态站 + 表单后端（Phase 2，#25）。
 *
 * 架构（见 docs/adr/0002）：从 assets-only 升级为「Worker + Static Assets」。
 * - POST /api/contact、POST /api/sample：验 Turnstile token → 经 Resend 发询盘 /
 *   样品申请邮件到 LEADS_TO_EMAIL。不存任何敏感数据（#25 验收标准）。
 * - 其余所有请求 → env.ASSETS.fetch(request)，原样交给 Astro 构建出的静态站。
 *
 * 校验复用 src/lib 的 zod schema（单一来源，不重复定义）；邮件正文 / 主题复用
 * 同处的 builder（HTML 经 escapeHtml 转义防注入）。运行时 secret 由 Cloudflare
 * Worker Secret 注入，不入库（见 .env.example / PR 说明）。
 *
 * 注：本文件用 Cloudflare Workers 运行时全局（Response/fetch/Request），由 wrangler
 * 在部署时编译，astro check 不对其类型检查（tsconfig.json exclude 了 "worker"）。
 */
import {
  contactFormSchema,
  buildContactEmailHtml,
  buildContactSubject,
} from "../src/lib/contact-form";
import {
  sampleRequestSchema,
  buildSampleEmailHtml,
  buildSampleSubject,
} from "../src/lib/sample-request";

/** Worker 绑定与 secret —— 在 Cloudflare Worker 设置里配置。 */
export interface Env {
  /** Turnstile 服务端密钥（secret）。 */
  TURNSTILE_SECRET_KEY: string;
  /** Resend API key（secret）。 */
  RESEND_API_KEY: string;
  /** 询盘 / 样品申请收件邮箱（secret 或普通 var）。 */
  LEADS_TO_EMAIL: string;
  /** 发件人，可选；默认 'Maywood Flooring <onboarding@resend.dev>'。 */
  CONTACT_FROM_EMAIL?: string;
  /** 静态资源绑定（assets.binding=ASSETS，见 wrangler.jsonc）。 */
  ASSETS: Fetcher;
}

const DEFAULT_FROM = "Maywood Flooring <onboarding@resend.dev>";
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_API_URL = "https://api.resend.com/emails";

/** JSON 响应短手，统一 Content-Type。 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Turnstile siteverify 响应（仅取用到的字段）。 */
interface TurnstileOutcome {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * 向 Cloudflare 校验 Turnstile token。
 * 失败（网络异常 / 非 success）一律视为未通过，由调用方返回 400。
 */
async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp: string | null
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const outcome = (await response.json()) as TurnstileOutcome;
    return outcome.success === true;
  } catch {
    return false;
  }
}

/** 经 Resend 发信。返回是否成功（供调用方决定 200 / 500）。 */
async function sendEmail(
  env: Env,
  args: { subject: string; html: string; replyTo: string }
): Promise<boolean> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
        to: [env.LEADS_TO_EMAIL],
        reply_to: args.replyTo,
        subject: args.subject,
        html: args.html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** 提交体：表单字段（unknown，交给 zod 校验）+ turnstileToken。 */
type SubmissionBody = Record<string, unknown> & { turnstileToken?: unknown };

/**
 * 处理一次表单提交（contact / sample 共用骨架）：
 * 解析 JSON → 取出 token → 服务端 zod 校验字段 → 验 Turnstile → Resend 发信。
 * 每步失败都返回相应状态码与 `{ ok:false, error }`。
 */
async function handleSubmission(
  request: Request,
  env: Env,
  kind: "contact" | "sample"
): Promise<Response> {
  let body: SubmissionBody;
  try {
    body = (await request.json()) as SubmissionBody;
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const { turnstileToken, ...fields } = body;
  if (typeof turnstileToken !== "string" || turnstileToken.length === 0) {
    return json({ ok: false, error: "Missing verification token." }, 400);
  }

  // 服务端复用同一份 zod schema 校验（不信任客户端校验），并据此组装邮件。
  let email: { subject: string; html: string; replyTo: string };
  if (kind === "contact") {
    const parsed = contactFormSchema.safeParse(fields);
    if (!parsed.success) {
      return json(
        { ok: false, error: "Please check the form and try again." },
        400
      );
    }
    email = {
      subject: buildContactSubject(parsed.data),
      html: buildContactEmailHtml(parsed.data),
      replyTo: parsed.data.email,
    };
  } else {
    const parsed = sampleRequestSchema.safeParse(fields);
    if (!parsed.success) {
      return json(
        { ok: false, error: "Please check the form and try again." },
        400
      );
    }
    email = {
      subject: buildSampleSubject(parsed.data),
      html: buildSampleEmailHtml(parsed.data),
      replyTo: parsed.data.email,
    };
  }

  // Turnstile 通过才发信。
  const verified = await verifyTurnstile(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    request.headers.get("CF-Connecting-IP")
  );
  if (!verified) {
    return json(
      { ok: false, error: "Verification failed. Please try again." },
      400
    );
  }

  const sent = await sendEmail(env, email);
  if (!sent) {
    return json(
      { ok: false, error: "Could not send your message. Please try again." },
      500
    );
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/contact") {
      return handleSubmission(request, env, "contact");
    }
    if (request.method === "POST" && url.pathname === "/api/sample") {
      return handleSubmission(request, env, "sample");
    }

    // 其余请求交给静态资源（Astro 构建产物）。
    return env.ASSETS.fetch(request);
  },
};
