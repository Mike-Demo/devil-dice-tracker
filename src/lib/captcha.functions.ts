import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getCaptchaSitekey = createServerFn({ method: "GET" }).handler(
  async () => {
    return process.env["HCAPTCHA_SITEKEY"] ?? null;
  },
);

export const verifyCaptcha = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().max(4096) }).parse(data))
  .handler(async ({ data }) => {
    const secret = process.env["HCAPTCHA_SECRET"];
    if (!secret) return { success: false };
    try {
      const res = await fetch("https://hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: data.token,
        }),
      });
      const json = (await res.json()) as { success?: boolean };
      return { success: json.success === true };
    } catch {
      return { success: false };
    }
  });
