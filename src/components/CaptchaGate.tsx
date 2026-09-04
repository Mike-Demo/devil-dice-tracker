import { useEffect, useRef, useState } from "react";
import { getCaptchaSitekey } from "@/lib/captcha.functions";

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => number;
    };
  }
}

const SCRIPT_SRC = "https://js.hcaptcha.com/1/api.js?render=explicit";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.hcaptcha) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(script);
  });
}

export type CaptchaState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "ready" }
  | { status: "solved"; token: string }
  | { status: "error" };

export function CaptchaGate({
  onState,
}: {
  onState: (state: CaptchaState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onState({ status: "loading" });
    void (async () => {
      try {
        const sitekey = await getCaptchaSitekey();
        if (cancelled) return;
        if (!sitekey) {
          onState({ status: "unconfigured" });
          return;
        }
        await loadScript();
        if (cancelled || !containerRef.current || !window.hcaptcha) return;
        onState({ status: "ready" });
        window.hcaptcha.render(containerRef.current, {
          sitekey,
          callback: (token) => onState({ status: "solved", token }),
          "expired-callback": () => onState({ status: "ready" }),
          "error-callback": () => onState({ status: "error" }),
        });
      } catch {
        if (!cancelled) {
          setFailed(true);
          onState({ status: "error" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <p className="text-center text-xs font-bold text-catan-red">
        The bot check could not load. Check your connection and try again.
      </p>
    );
  }
  return <div ref={containerRef} className="flex justify-center" />;
}
