'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <CardTitle>Something went wrong</CardTitle>
                    </div>
                    <CardDescription>
                        We encountered an unexpected error. Don&apos;t worry, your data is safe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {process.env.NODE_ENV === 'development' && (
                        <div className="rounded-md bg-muted p-4">
                            <p className="text-sm font-mono text-muted-foreground">
                                {error.message}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button onClick={reset} className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                            Go to Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
