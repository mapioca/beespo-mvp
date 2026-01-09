import { completeTaskWithToken } from "@/lib/actions/task-actions";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActionPageProps {
    searchParams: Promise<{
        t: string; // Token
        a: string; // Action (e.g., 'complete')
    }>;
}

export default async function TaskActionPage({ searchParams }: ActionPageProps) {
    const { t, a } = await searchParams;

    if (!t || a !== 'complete') {
        return <ErrorState message="Invalid link parameters." />;
    }

    const result = await completeTaskWithToken(t);

    if (result.error) {
        return <ErrorState message={result.error} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-700">Task Completed!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        You have successfully marked the task <strong>&quot;{result.task?.title}&quot;</strong> as complete.
                    </p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        Thank you for your update. The leadership team has been notified.
                    </p>
                    <Button asChild className="w-full mt-4">
                        <Link href="/login">Log in to Beespo</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full text-center shadow-lg border-red-200">
                <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-red-700">Action Failed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{message}</p>
                    <Button asChild variant="outline" className="w-full mt-4">
                        <Link href="/">Back to Home</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
