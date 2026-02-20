"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { forgotPasswordAction } from "@/lib/actions/auth-actions";
import { ArrowLeft, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
    const t = useTranslations("Auth.ForgotPassword");
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await forgotPasswordAction(email);

            if (result.error) {
                toast.error(result.error);
            } else {
                setIsSuccess(true);
                toast.info(t("checkInboxToast"));
            }
        } catch {
            toast.error(t("unexpectedError"));
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-border">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-start gap-2">
                        <Mail className="h-6 w-6 mt-1 text-primary" />
                        {t("successTitle")}
                    </CardTitle>
                    <CardDescription>
                        {t("successDescription", { email })}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-col space-y-4">
                    <Button asChild className="w-full" variant="secondary">
                        <Link href="/login">{t("backToSignIn")}</Link>
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        {t("didNotReceive")}{" "}
                        <button
                            type="button"
                            onClick={() => setIsSuccess(false)}
                            className="underline underline-offset-4 hover:text-foreground"
                        >
                            {t("tryAnotherEmail")}
                        </button>
                        .
                    </p>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="border-border">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
                <CardDescription>
                    {t("description")}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{t("emailLabel")}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t("emailPlaceholder")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? t("sendingLink") : t("sendResetLink")}
                    </Button>
                    <Button asChild variant="ghost" className="w-full">
                        <Link href="/login" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t("backToSignIn")}
                        </Link>
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
