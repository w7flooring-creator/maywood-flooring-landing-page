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
import {
  contactFormSchema,
  contactFormDefaults,
  buildMailtoHref,
  type ContactFormValues,
} from "@/lib/contact-form";

/**
 * ContactForm —— Contact 页询盘表单（唯一交互 island，client:visible）。
 *
 * 组件策略：react-hook-form + zod（zodResolver）做校验，UI 用 shadcn form 控件
 * （Form / FormField / FormControl / FormMessage + Input / Textarea / Button），
 * 全部 retheme 到品牌 token。字段对照线上 Wix：First / Last / Email / Message。
 *
 * a11y：每字段有 <label htmlFor>（shadcn FormLabel 自动连 id），错误信息经
 * aria-describedby + aria-invalid 关联，提交后把焦点移到状态提示（role=status）。
 * 键盘可操作、focus 可见（继承 globals.css :focus-visible + 控件 ring）。
 *
 * Phase 1 提交为占位：校验通过后打开 mailto:（buildMailtoHref）并显示成功态，
 * 不发任何网络请求、不存数据。真正服务端处理（Resend + Turnstile）见 #25 / Phase 2。
 */
export default function ContactForm() {
  const [submitted, setSubmitted] = React.useState(false);
  const statusRef = React.useRef<HTMLParagraphElement>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contactFormDefaults,
    mode: "onTouched",
  });

  function onSubmit(values: ContactFormValues) {
    // Phase 1 占位：开访客邮件客户端预填询盘，无后端（见 #25）。
    if (typeof window !== "undefined") {
      window.location.href = buildMailtoHref(values);
    }
    setSubmitted(true);
    form.reset();
  }

  // 成功态出现后把焦点移到状态提示，让键盘 / 屏幕阅读器用户得到反馈。
  React.useEffect(() => {
    if (submitted) statusRef.current?.focus();
  }, [submitted]);

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

        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="px-8 text-xs font-medium tracking-[0.08em] uppercase"
          >
            Send
          </Button>

          {submitted && (
            <p
              ref={statusRef}
              role="status"
              tabIndex={-1}
              className="text-sm text-muted-foreground outline-none"
            >
              Thanks for getting in touch — we&rsquo;ll be in contact shortly.
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}
