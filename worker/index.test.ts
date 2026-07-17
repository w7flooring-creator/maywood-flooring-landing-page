import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker, { type Env } from "./index";

/**
 * Worker 请求处理单测 —— mock 全局 fetch（Turnstile siteverify + Resend）。
 *
 * 覆盖：Turnstile 成功 / 失败、Resend 被以正确 payload 调用、坏 token / 缺 token
 * 返回 400、字段校验失败返回 400、Resend 失败返回 500、非 API 请求透传 ASSETS。
 *
 * worker/index.ts 用 Workers 运行时全局（Response/fetch/URL），vitest（node）下
 * Response/URL 原生可用，fetch 由 vi.stubGlobal 注入。
 */

const VALID_CONTACT = {
  firstName: "Jordan",
  lastName: "Nguyen",
  email: "jordan@example.com",
  message: "I would like a quote for engineered oak flooring, thanks.",
  turnstileToken: "tok-abc",
};

const VALID_SAMPLE = {
  name: "Jordan Nguyen",
  email: "jordan@example.com",
  deliveryAddress: "12 Example St, Keysborough VIC 3173",
  turnstileToken: "tok-abc",
};

/** 构造一个测试用 Env，ASSETS.fetch 返回可识别的哨兵响应。 */
function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    TURNSTILE_SECRET_KEY: "secret-key",
    RESEND_API_KEY: "resend-key",
    LEADS_TO_EMAIL: "leads@maywoodflooring.com.au",
    ASSETS: {
      fetch: vi.fn(async () => new Response("STATIC", { status: 200 })),
    } as unknown as Fetcher,
    ...overrides,
  };
}

function postRequest(path: string, body: unknown): Request {
  return new Request(`https://www.maywoodflooring.com.au${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

/** 让全局 fetch 依次按 URL 返回 turnstile / resend 的 mock 响应。 */
function stubFetch(opts: { turnstileSuccess?: boolean; resendOk?: boolean }) {
  const { turnstileSuccess = true, resendOk = true } = opts;
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes("siteverify")) {
      return new Response(JSON.stringify({ success: turnstileSuccess }), {
        status: 200,
      });
    }
    if (href.includes("api.resend.com")) {
      return new Response(JSON.stringify({ id: "email-1" }), {
        status: resendOk ? 200 : 422,
      });
    }
    throw new Error(`Unexpected fetch to ${href}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("worker —— /api/contact", () => {
  it("Turnstile 通过 + 校验通过 → 调 Resend 并返回 { ok:true }", async () => {
    const fetchMock = stubFetch({});
    const res = await worker.fetch(
      postRequest("/api/contact", VALID_CONTACT),
      makeEnv()
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // 校验 Resend 被以正确 payload 调用。
    const resendCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("api.resend.com")
    );
    expect(resendCall).toBeDefined();
    const init = resendCall![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer resend-key"
    );
    const payload = JSON.parse(init.body as string);
    expect(payload.to).toEqual(["leads@maywoodflooring.com.au"]);
    expect(payload.reply_to).toBe("jordan@example.com");
    expect(payload.from).toBe("Maywood Flooring <onboarding@resend.dev>");
    expect(payload.subject).toContain("Jordan Nguyen");
    expect(payload.html).toContain("jordan@example.com");
  });

  it("Turnstile 把 secret + token + remoteip 传给 siteverify", async () => {
    const fetchMock = stubFetch({});
    await worker.fetch(postRequest("/api/contact", VALID_CONTACT), makeEnv());
    const verifyCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("siteverify")
    );
    const body = (verifyCall![1] as RequestInit).body as URLSearchParams;
    const params = new URLSearchParams(body.toString());
    expect(params.get("secret")).toBe("secret-key");
    expect(params.get("response")).toBe("tok-abc");
    expect(params.get("remoteip")).toBe("1.2.3.4");
  });

  it("Turnstile 失败 → 400，且不调 Resend", async () => {
    const fetchMock = stubFetch({ turnstileSuccess: false });
    const res = await worker.fetch(
      postRequest("/api/contact", VALID_CONTACT),
      makeEnv()
    );
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("api.resend.com"))
    ).toBe(false);
  });

  it("缺 turnstileToken → 400，且不发任何 fetch", async () => {
    const fetchMock = stubFetch({});
    const { turnstileToken, ...noToken } = VALID_CONTACT;
    const res = await worker.fetch(
      postRequest("/api/contact", noToken),
      makeEnv()
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("字段校验失败（坏 email）→ 400，且不验 token / 不发信", async () => {
    const fetchMock = stubFetch({});
    const res = await worker.fetch(
      postRequest("/api/contact", { ...VALID_CONTACT, email: "nope" }),
      makeEnv()
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Resend 发信失败 → 500", async () => {
    stubFetch({ resendOk: false });
    const res = await worker.fetch(
      postRequest("/api/contact", VALID_CONTACT),
      makeEnv()
    );
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });

  it("CONTACT_FROM_EMAIL 覆盖默认发件人", async () => {
    const fetchMock = stubFetch({});
    await worker.fetch(
      postRequest("/api/contact", VALID_CONTACT),
      makeEnv({ CONTACT_FROM_EMAIL: "Maywood <sales@maywoodflooring.com.au>" })
    );
    const resendCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("api.resend.com")
    );
    const payload = JSON.parse((resendCall![1] as RequestInit).body as string);
    expect(payload.from).toBe("Maywood <sales@maywoodflooring.com.au>");
  });

  it("HTML 正文转义访客输入（防注入）", async () => {
    const fetchMock = stubFetch({});
    await worker.fetch(
      postRequest("/api/contact", {
        ...VALID_CONTACT,
        message: "<script>alert(1)</script> please quote me thanks",
      }),
      makeEnv()
    );
    const resendCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("api.resend.com")
    );
    const payload = JSON.parse((resendCall![1] as RequestInit).body as string);
    expect(payload.html).not.toContain("<script>alert(1)</script>");
    expect(payload.html).toContain("&lt;script&gt;");
  });
});

describe("worker —— /api/sample", () => {
  it("Turnstile 通过 + 校验通过 → Resend 用样品主题，返回 { ok:true }", async () => {
    const fetchMock = stubFetch({});
    const res = await worker.fetch(
      postRequest("/api/sample", VALID_SAMPLE),
      makeEnv()
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const resendCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("api.resend.com")
    );
    const payload = JSON.parse((resendCall![1] as RequestInit).body as string);
    expect(payload.subject).toContain("Sample request");
    expect(payload.html).toContain("Delivery address");
  });

  it("缺必填 deliveryAddress → 400，不发信", async () => {
    const fetchMock = stubFetch({});
    const { deliveryAddress, ...bad } = VALID_SAMPLE;
    const res = await worker.fetch(postRequest("/api/sample", bad), makeEnv());
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("worker —— 静态资源透传", () => {
  it("非 API 请求交给 env.ASSETS.fetch", async () => {
    const env = makeEnv();
    const req = new Request("https://www.maywoodflooring.com.au/contact");
    const res = await worker.fetch(req, env);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req);
    expect(await res.text()).toBe("STATIC");
  });

  it("GET /api/contact（非 POST）也透传 ASSETS（不当作提交）", async () => {
    const env = makeEnv();
    const req = new Request("https://www.maywoodflooring.com.au/api/contact");
    await worker.fetch(req, env);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req);
  });

  it("无效 JSON body → 400", async () => {
    stubFetch({});
    const req = new Request("https://www.maywoodflooring.com.au/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await worker.fetch(req, makeEnv());
    expect(res.status).toBe(400);
  });
});

describe("worker —— canonical host", () => {
  it("根域以 308 跳到 www，并保留 path 与 query", async () => {
    const env = makeEnv();
    const req = new Request(
      "https://maywoodflooring.com.au/product-page/spotted-gum?source=legacy"
    );
    const res = await worker.fetch(req, env);

    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(
      "https://www.maywoodflooring.com.au/product-page/spotted-gum?source=legacy"
    );
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("workers.dev / preview hostname 不重定向", async () => {
    const env = makeEnv();
    const req = new Request(
      "https://codex-launch-qa-maywood-flooring-landing-page.w7flooring.workers.dev/contact"
    );
    const res = await worker.fetch(req, env);

    expect(res.status).toBe(200);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req);
  });
});
