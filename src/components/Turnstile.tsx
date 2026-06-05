import * as React from "react";

/**
 * Turnstile —— Cloudflare Turnstile widget 的 React 封装（ContactForm /
 * SampleRequestIsland 共用，#25 Phase 2）。
 *
 * 行为：按需注入一次 challenges.cloudflare.com 脚本（全站只一份），用显式
 * render 把 widget 挂到本组件的容器，token 就绪 / 过期 / 出错时回调上层。
 * 上层据 token 是否存在决定提交按钮是否可用，并在提交后调 reset()。
 *
 * 仅在 `PUBLIC_TURNSTILE_SITE_KEY` 已配置时渲染（无 key 的本地 / dev 环境下
 * 由上层走 mailto 回落，不挂载本组件）。
 */

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

/** window.turnstile 的最小类型（仅取用到的成员）。 */
interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** 注入 Turnstile 脚本一次，resolve 后保证 window.turnstile 可用。 */
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      if (window.turnstile) resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject());
    document.head.appendChild(script);
  });
}

export interface TurnstileHandle {
  /** 重置 widget（提交后调用，让访客可再次验证）。 */
  reset: () => void;
}

export interface TurnstileProps {
  /** 公开 site key（PUBLIC_TURNSTILE_SITE_KEY）。 */
  siteKey: string;
  /** token 就绪时回调（上层据此启用提交）。 */
  onToken: (token: string) => void;
  /** token 过期 / 出错时回调（上层据此清空 token、禁用提交）。 */
  onExpire?: () => void;
}

/**
 * 受控 Turnstile widget。用 ref（TurnstileHandle）暴露 reset 给上层。
 */
export const Turnstile = React.forwardRef<TurnstileHandle, TurnstileProps>(
  function Turnstile({ siteKey, onToken, onExpire }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const widgetIdRef = React.useRef<string | null>(null);

    // 把最新回调存进 ref，避免它们变化导致 widget 重渲染 / 重复挂载。
    const onTokenRef = React.useRef(onToken);
    const onExpireRef = React.useRef(onExpire);
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;

    React.useImperativeHandle(
      ref,
      () => ({
        reset() {
          if (window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      }),
      []
    );

    React.useEffect(() => {
      let cancelled = false;
      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          if (widgetIdRef.current) return; // 已渲染，勿重复。
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => onTokenRef.current(token),
            "expired-callback": () => onExpireRef.current?.(),
            "error-callback": () => onExpireRef.current?.(),
          });
        })
        .catch(() => {
          // 脚本加载失败：widget 不出现，提交保持禁用（无 token）。
        });

      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey]);

    return <div ref={containerRef} className="min-h-[65px]" />;
  }
);
