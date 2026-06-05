import { describe, it, expect, vi } from "vitest";
import { submitForm, FORM_ENDPOINTS } from "@/lib/form-submit";

describe("submitForm — Phase 2 提交客户端层", () => {
  it("POST 到指定端点，带上字段 + turnstileToken（JSON）", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const result = await submitForm(
      FORM_ENDPOINTS.contact,
      { firstName: "Jordan", email: "jordan@example.com" },
      "tok-1",
      fetchMock as unknown as typeof fetch
    );

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/contact");
    expect(init!.method).toBe("POST");
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({
      firstName: "Jordan",
      email: "jordan@example.com",
      turnstileToken: "tok-1",
    });
  });

  it("响应 { ok:false, error } → 透传服务端错误文案", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: false, error: "Verification failed." }),
          { status: 400 }
        )
    );
    const result = await submitForm(
      FORM_ENDPOINTS.sample,
      {},
      "tok",
      fetchMock as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, error: "Verification failed." });
  });

  it("HTTP 200 但 ok 非 true → 当作失败", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: false }), { status: 200 })
    );
    const result = await submitForm(
      FORM_ENDPOINTS.contact,
      {},
      "tok",
      fetchMock as unknown as typeof fetch
    );
    expect(result.ok).toBe(false);
  });

  it("网络异常（fetch reject）→ 收敛成通用错误，不抛", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await submitForm(
      FORM_ENDPOINTS.contact,
      {},
      "tok",
      fetchMock as unknown as typeof fetch
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/something went wrong/i);
  });

  it("非 JSON 响应（如 502 HTML）→ 通用错误", async () => {
    const fetchMock = vi.fn(
      async () => new Response("<html>502</html>", { status: 502 })
    );
    const result = await submitForm(
      FORM_ENDPOINTS.contact,
      {},
      "tok",
      fetchMock as unknown as typeof fetch
    );
    expect(result.ok).toBe(false);
  });
});
