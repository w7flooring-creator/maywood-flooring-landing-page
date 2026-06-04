// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SampleRequestIsland from "@/components/SampleRequestIsland";

// jsdom 不实现真实导航；提交占位会写 window.location.href（mailto:）。
// 用可写 stub 接住，既避免 "Not implemented: navigation" 报错，又能断言确实触发。
beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "" } as Location,
  });
});

describe("SampleRequestIsland —— a11y / 校验 / 提交", () => {
  it("每个字段都有可点击关联的 label（a11y）", () => {
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

  it("提交空表单时显示校验错误、不触发提交占位", async () => {
    const user = userEvent.setup();
    render(<SampleRequestIsland />);

    await user.click(screen.getByRole("button", { name: "Request Sample" }));

    // 必填项校验信息出现，且字段标记 aria-invalid（错误信息经 aria-describedby 关联）。
    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    expect(
      screen.getByText(/please enter the delivery address/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    // 未触发占位提交（无导航、无成功态）。
    expect(window.location.href).toBe("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("非法 email 时报错，不通过校验", async () => {
    const user = userEvent.setup();
    render(<SampleRequestIsland />);

    await user.type(screen.getByLabelText("Name"), "Jordan Nguyen");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(
      screen.getByLabelText("Delivery address"),
      "12 Example St, Keysborough VIC 3173"
    );
    await user.click(screen.getByRole("button", { name: "Request Sample" }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(window.location.href).toBe("");
  });

  it("仅填必填项即可提交（可选字段留空），触发 mailto 占位并显示成功状态", async () => {
    const user = userEvent.setup();
    render(<SampleRequestIsland />);

    await user.type(screen.getByLabelText("Name"), "Jordan Nguyen");
    await user.type(screen.getByLabelText("Email"), "jordan@example.com");
    await user.type(
      screen.getByLabelText("Delivery address"),
      "12 Example St, Keysborough VIC 3173"
    );
    await user.click(screen.getByRole("button", { name: "Request Sample" }));

    // 成功态（role=status）出现，且占位 mailto: 已触发（发往 sales@）。
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(window.location.href).toContain(
      "mailto:sales@maywoodflooring.com.au"
    );
    // URLSearchParams 用 "+" 编码空格。
    expect(window.location.href).toContain("Jordan+Nguyen");
  });
});
