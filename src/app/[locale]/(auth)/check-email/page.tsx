"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

function CheckEmailContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email");
    const t = useTranslations("Auth.CheckEmail");

    return (
        <Card className="border-border">
            <CardHeader className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
                <CardDescription className="text-base">
                    {t('sentConfirmationTo')}
                    {email ? (
                        <>
                            <br />
                            <span className="font-medium text-foreground">{email}</span>
                        </>
                    ) : (
                        ` ${t('yourEmailAddress')}`
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">
                        {t('instructions')}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/login">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('backToSignIn')}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function CheckEmailPage() {
    const t = useTranslations("Auth.CheckEmail");
    return (
        <Suspense
            fallback={
                <Card className="border-border">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">{t('loading')}</CardTitle>
                        <CardDescription>{t('pleaseWait')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </CardContent>
                </Card>
            }
        >
            <CheckEmailContent />
        </Suspense>
    );
}
