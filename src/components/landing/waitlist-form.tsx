"use client";

import { useActionState, useOptimistic, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { joinWaitlist } from "@/app/actions/waitlist";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

type WaitlistState = {
  error?: string;
  success?: boolean;
  message?: string;
} | null;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto min-w-[180px] rounded-sm"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Requesting...
        </>
      ) : (
        "Request Access"
      )}
    </Button>
  );
}

export function WaitlistForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState(
    async (_prevState: WaitlistState, formData: FormData) => {
      return await joinWaitlist(formData);
    },
    null
  );

  const [optimisticState, setOptimisticState] = useOptimistic<
    WaitlistState,
    string
  >(state, (_current, email) => ({
    success: true,
    message: `You're on the list, ${email.split("@")[0]}! We'll be in touch.`,
  }));

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  if (optimisticState?.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-2 text-foreground bg-secondary px-6 py-3 rounded-sm"
      >
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">{optimisticState.message}</span>
      </motion.div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        const email = formData.get("email") as string;
        if (email) {
          setOptimisticState(email);
        }
        formAction(formData);
      }}
      className="w-full max-w-md space-y-3"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          name="email"
          placeholder="Enter your email address"
          required
          className="flex-1 rounded-sm border-neutral-300 focus:border-foreground focus:ring-foreground transition-colors"
          autoComplete="email"
        />
        <SubmitButton />
      </div>
      {optimisticState?.error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {optimisticState.error}
        </motion.p>
      )}
    </form>
  );
}
