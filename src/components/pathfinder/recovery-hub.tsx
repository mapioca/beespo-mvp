"use client";

import Link from "next/link";
import { MoveLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecoveryHub() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center animate-in fade-in duration-500">
            <div className="space-y-6 max-w-md w-full">
                {/* Branding / Status */}
                <div className="space-y-2">
                    <h1 className="text-8xl font-thin tracking-tighter text-foreground/10 select-none">
                        404
                    </h1>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Page Not Found
                    </h2>
                    <p className="text-muted-foreground">
                        The page you are looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                    <Button asChild size="lg" className="gap-2">
                        <Link href="/">
                            <MoveLeft className="w-4 h-4" />
                            Return to Dashboard
                        </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg" className="gap-2">
                        <Link href="mailto:support@beespo.com">
                            <HelpCircle className="w-4 h-4" />
                            Contact Support
                        </Link>
                    </Button>
                </div>

                {/* Footer Hint */}
                <div className="pt-12 text-xs text-muted-foreground/50">
                    Error Code: PF-404
                </div>
            </div>
        </div>
    );
}
