// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import ContactForm from "@/components/ContactForm";

/**
 * ContactForm 测试 —— Phase 2 后端提交路径（#25）。
 *
 * 测试环境下 PUBLIC_TURNSTILE_SITE_KEY 由 .env 注入（已配置），故走后端路径。
 * 真实 Turnstile 会注入外部脚本，jsdom 无法运行 → 用 vi.mock 替身：
 * 替身挂载时按 `provideToken` 决定是否立即回调 token，并把 reset 暴露给上层
 * （断言被调）。fetch 用 vi.stubGlobal mock，断言提交 payload 与成功 / 失败态。
 */

const turnstileReset = vi.fn();
// 控制替身是否提供 token（用于测试「无 token 时提交禁用」）。
let provideToken = true;

vi.mock("@/components/Turnstile", () => ({
  Turnstile: React.forwardRef(function MockTurnstile(
    props: { onToken: (t: string) => void },
    ref: React.Ref<{ reset: () => void }>
  ) {
    React.useImperativeHandle(ref, () => ({ reset: turnstileReset }), []);
    React.useEffect(() => {
      if (provideToken) props.onToken("test-token");
    }, []);
    return <div data-testid="turnstile" />;
  }),
}));

beforeEach(() => {
  turnstileReset.mockClear();
  provideToken = true;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function typeValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First Name"), "Jordan");
  await user.type(screen.getByLabelText("Last Name"), "Nguyen");
  await user.type(screen.getByLabelText("Email"), "jordan@example.com");
  await user.type(
    screen.getByLabelText("Message"),
    "I would like a quote for engineered oak flooring."
  );
}

describe("ContactForm —— a11y / 校验 / 提交（Phase 2）", () => {
  it("每个字段都有可点击关联的 label（a11y）", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ContactForm />);
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("拿到 Turnstile token 后提交按钮启用", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ContactForm />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled()
    );
  });

  it("无 Turnstile token 时提交按钮禁用", () => {
    provideToken = false;
    vi.stubGlobal("fetch", vi.fn());
    render(<ContactForm />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("提交空表单时显示校验错误、不发请求", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText(/enter your first name/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("合法输入 → POST /api/contact，成功时显示 role=status 并 reset widget", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ContactForm />);

    await typeValid(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/contact");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.email).toBe("jordan@example.com");
    expect(body.turnstileToken).toBe("test-token");
    expect(turnstileReset).toHaveBeenCalled();
  });

  it("后端返回错误 → 显示 role=alert 错误文案，不显示成功态", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: false, error: "Verification failed." }),
          { status: 400 }
        )
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ContactForm />);

    await typeValid(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/verification failed/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(turnstileReset).toHaveBeenCalled();
  });
});
