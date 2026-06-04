import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  sampleRequestSchema,
  sampleRequestDefaults,
  buildSampleMailtoHref,
  type SampleRequestValues,
} from "@/lib/sample-request";

/**
 * SampleRequestIsland —— /request-sample 页样品申请表单（唯一交互 island，client:visible）。
 *
 * 组件策略（见 AGENTS.md「组件需求映射」）：react-hook-form + zod（zodResolver）做校验，
 * UI 用 shadcn form 控件（Form / FormField / FormControl / FormMessage + Input / Textarea /
 * Button），全部 retheme 到品牌 token。镜像 ContactForm 的结构与无障碍约定。
 *
 * 字段：name / email / phone（可选）/ productInterest（可选，自由文本）/
 * deliveryAddress / message（可选）。可选字段在 label 后标注 “(optional)”。
 *
 * a11y：每字段有 <label htmlFor>（shadcn FormLabel 自动连 id），错误信息经
 * aria-describedby + aria-invalid 关联，提交后把焦点移到状态提示（role=status）。
 * 键盘可操作、focus 可见（继承 globals.css :focus-visible + 控件 ring）。
 *
 * Phase 1 提交为占位：校验通过后打开 mailto:（buildSampleMailtoHref）并显示成功态，
 * 不发任何网络请求、不存数据。真正服务端处理（Resend + Turnstile）见 #25 / Phase 2。
 */
export default function SampleRequestIsland() {
  const [submitted, setSubmitted] = React.useState(false);
  const statusRef = React.useRef<HTMLParagraphElement>(null);

  const form = useForm<SampleRequestValues>({
    resolver: zodResolver(sampleRequestSchema),
    defaultValues: sampleRequestDefaults,
    mode: "onTouched",
  });

  function onSubmit(values: SampleRequestValues) {
    // Phase 1 占位：开访客邮件客户端预填样品申请，无后端（见 #25）。
    if (typeof window !== "undefined") {
      window.location.href = buildSampleMailtoHref(values);
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="productInterest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Product or collection of interest (optional)
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Bushland engineered oak, Hydrocore laminate"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Tell us which floor you&rsquo;d like to sample, if you know.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deliveryAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery address</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  autoComplete="street-address"
                  placeholder="Where should we send your samples?"
                  {...field}
                />
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
              <FormLabel>Message (optional)</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
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
            Request Sample
          </Button>

          {submitted && (
            <p
              ref={statusRef}
              role="status"
              tabIndex={-1}
              className="text-sm text-muted-foreground outline-none"
            >
              Thanks — your sample request is on its way. We&rsquo;ll be in
              touch shortly.
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}
