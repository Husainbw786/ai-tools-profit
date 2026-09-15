import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    // Server-function RPCs get a short plain-text message the client can show;
    // page requests get the branded HTML error page.
    const isServerFn = !!getRequest()?.headers.get("x-tsr-serverFn");
    if (isServerFn) {
      const message = error instanceof Error ? error.message : "Server error";
      const status = /^unauthorized/i.test(message) ? 401 : 500;
      return new Response(message, {
        status,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
