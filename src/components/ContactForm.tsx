import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import {
  contactFormSchema,
  contactFormDefaults,
  buildMailtoHref,
  type ContactFormValues,
} from "@/lib/contact-form";
import { submitForm, FORM_ENDPOINTS } from "@/lib/form-submit";

/**
 * ContactForm —— Contact 页询盘表单（唯一交互 island，client:visible）。
 *
 * 组件策略：react-hook-form + zod（zodResolver）做校验，UI 用 shadcn form 控件
 * （Form / FormField / FormControl / FormMessage + Input / Textarea / Button），
 * 全部 retheme 到品牌 token。字段对照线上 Wix：First / Last / Email / Message。
 *
 * Phase 2（#25）：当 PUBLIC_TURNSTILE_SITE_KEY 已配置时，渲染 Turnstile widget，
 * 提交按钮在拿到 token 前禁用；校验通过后把字段 + token POST 到 /api/contact，
 * 由 Worker 验 token 并经 Resend 发信；据 {ok} 显示成功 / 错误（role=status），
 * 并 reset widget。无 site key（本地 / dev）时优雅回落到 mailto:，不发请求。
 *
 * a11y：每字段有 <label htmlFor>（shadcn FormLabel 自动连 id），错误信息经
 * aria-describedby + aria-invalid 关联，提交后把焦点移到状态提示（role=status）。
 * 键盘可操作、focus 可见（继承 globals.css :focus-visible + 控件 ring）。
 */
type SubmitState = "idle" | "success" | "error";

const SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;

export default function ContactForm() {
  const [state, setState] = React.useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string>("");
  const [token, setToken] = React.useState<string>("");
  const statusRef = React.useRef<HTMLParagraphElement>(null);
  const turnstileRef = React.useRef<TurnstileHandle>(null);

  // 仅当配置了 site key 时才启用 Turnstile 后端流程；否则走 mailto 回落。
  const useBackend = Boolean(SITE_KEY);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contactFormDefaults,
    mode: "onTouched",
  });

  async function onSubmit(values: ContactFormValues) {
    if (!useBackend) {
      // 回落：开访客邮件客户端预填询盘，无后端（本地 / 无 key 环境）。
      if (typeof window !== "undefined") {
        window.location.href = buildMailtoHref(values);
      }
      setState("success");
      form.reset();
      return;
    }

    const result = await submitForm(FORM_ENDPOINTS.contact, values, token);
    // 无论成功失败都重置 Turnstile（token 一次性），并清空本地 token。
    turnstileRef.current?.reset();
    setToken("");

    if (result.ok) {
      setState("success");
      form.reset();
    } else {
      setErrorMessage(result.error);
      setState("error");
    }
  }

  // 状态提示出现后把焦点移到它，让键盘 / 屏幕阅读器用户得到反馈。
  React.useEffect(() => {
    if (state !== "idle") statusRef.current?.focus();
  }, [state]);

  const submitDisabled =
    form.formState.isSubmitting || (useBackend && token.length === 0);

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {useBackend && SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={SITE_KEY}
            onToken={setToken}
            onExpire={() => setToken("")}
          />
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="submit"
            disabled={submitDisabled}
            className="px-8 text-xs font-medium tracking-[0.08em] uppercase"
          >
            Send
          </Button>

          {state === "success" && (
            <p
              ref={statusRef}
              role="status"
              tabIndex={-1}
              className="text-sm text-muted-foreground outline-none"
            >
              Thanks for getting in touch — we&rsquo;ll be in contact shortly.
            </p>
          )}
          {state === "error" && (
            <p
              ref={statusRef}
              role="alert"
              tabIndex={-1}
              className="text-sm text-destructive outline-none"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}
