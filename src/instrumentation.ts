import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Suppress internal Node.js deprecation warning for util._extend
    // This warning originates from Next.js internal dependencies (like http-proxy)
    const originalEmit = process.emit;
    // @ts-expect-error - process.emit types are strict
    process.emit = function (name: string | symbol, data: unknown, ...args: unknown[]) {
      if (
        name === "warning" &&
        typeof data === "object" &&
        data !== null &&
        "name" in data &&
        "message" in data &&
        (data as { name: string }).name === "DeprecationWarning" &&
        (data as { message: string }).message?.includes("util._extend")
      ) {
        return false;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalEmit.apply(this, [name, data, ...args] as any);
    };

    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
