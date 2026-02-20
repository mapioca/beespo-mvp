'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Dashboard error:', error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                        <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                        We encountered an error while loading this page. This has been logged and we&apos;ll look into it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {process.env.NODE_ENV === 'development' && error.message && (
                        <div className="rounded-lg bg-muted p-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                                Error Details (Development Only):
                            </p>
                            <p className="text-sm font-mono text-muted-foreground break-all">
                                {error.message}
                            </p>
                            {error.digest && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Error ID: {error.digest}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={reset} className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                Back to Dashboard
                            </Link>
                        </Button>
                    </div>

                    <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            If this problem persists, please contact support or try:
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                            <li>Refreshing the page</li>
                            <li>Clearing your browser cache</li>
                            <li>Checking your internet connection</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
