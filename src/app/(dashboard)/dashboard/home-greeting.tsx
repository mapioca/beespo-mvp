"use client"

import { useMemo } from "react"
import { Sunrise, Sun, Moon } from "lucide-react"

interface HomeGreetingProps {
    firstName: string
}

export function HomeGreeting({ firstName }: HomeGreetingProps) {
    const { greeting, Icon } = useMemo(() => {
        const hour = new Date().getHours()
        if (hour < 12) return { greeting: "Good morning", Icon: Sunrise }
        if (hour < 17) return { greeting: "Good afternoon", Icon: Sun }
        return { greeting: "Good evening", Icon: Moon }
    }, [])

    return (
        <>
            <div className="mb-10 flex justify-center">
                <div className="h-12 w-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-sm">
                    <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                </div>
            </div>

            <p className="text-sm font-medium uppercase tracking-widest text-amber-500 mb-3">
                {greeting}
            </p>
            <h1 className="text-4xl font-light text-gray-900 mb-2">
                Welcome back,{" "}
                <span className="font-semibold">{firstName}.</span>
            </h1>
        </>
    )
}
