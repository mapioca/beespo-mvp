import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
