// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import SampleRequestIsland from "@/components/SampleRequestIsland";

/**
 * SampleRequestIsland 测试 —— Phase 2 后端提交路径（#25）。镜像 ContactForm 测试：
 * 用 vi.mock 替身的 Turnstile（挂载即给 token）+ vi.stubGlobal 的 fetch，
 * 断言提交 payload、成功 / 失败态与 widget reset。
 */

const turnstileReset = vi.fn();
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

async function typeRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Jordan Nguyen");
  await user.type(screen.getByLabelText("Email"), "jordan@example.com");
  await user.type(
    screen.getByLabelText("Delivery address"),
    "12 Example St, Keysborough VIC 3173"
  );
}

describe("SampleRequestIsland —— a11y / 校验 / 提交（Phase 2）", () => {
  it("每个字段都有可点击关联的 label（a11y）", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<SampleRequestIsland />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone (optional)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Product or collection of interest (optional)")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Delivery address")).toBeInTheDocument();
    expect(screen.getByLabelText("Message (optional)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Request Sample" })
    ).toBeInTheDocument();
  });

  it("无 Turnstile token 时提交按钮禁用", () => {
    provideToken = false;
    vi.stubGlobal("fetch", vi.fn());
    render(<SampleRequestIsland />);
    expect(
      screen.getByRole("button", { name: "Request Sample" })
    ).toBeDisabled();
  });

  it("提交空表单时显示校验错误、不发请求", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SampleRequestIsland />);

    await user.click(screen.getByRole("button", { name: "Request Sample" }));

    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(
      screen.getByText(/please enter the delivery address/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("仅填必填项 → POST /api/sample，成功时显示 role=status 并 reset widget", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SampleRequestIsland />);

    await typeRequired(user);
    await user.click(screen.getByRole("button", { name: "Request Sample" }));

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/sample");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.name).toBe("Jordan Nguyen");
    expect(body.turnstileToken).toBe("test-token");
    expect(turnstileReset).toHaveBeenCalled();
  });

  it("后端返回错误 → 显示 role=alert 错误文案，不显示成功态", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: false, error: "Could not send." }), {
          status: 500,
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SampleRequestIsland />);

    await typeRequired(user);
    await user.click(screen.getByRole("button", { name: "Request Sample" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/could not send/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
