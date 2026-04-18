"use client";

import { useMemo } from "react";

interface HomeGreetingProps {
  firstName: string;
  workspaceName?: string;
}

export function HomeGreeting({ firstName, workspaceName }: HomeGreetingProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-[2rem] font-semibold tracking-tight text-foreground">
        {greeting}{firstName && firstName !== "there" ? `, ${firstName}` : ""}
      </h1>
      {workspaceName && (
        <p className="mt-1 text-[13px] text-muted-foreground">{workspaceName}</p>
      )}
    </div>
  );
}
