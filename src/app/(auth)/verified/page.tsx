import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function VerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  let nextPath = "/onboarding";
  
  if (typeof params.next === "string") {
    nextPath = params.next;
  }

  // Ensure next path starts with a slash and isn't just the root
  if (!nextPath.startsWith("/") || nextPath === "/") {
    nextPath = "/onboarding";
  }

  return (
    <Card className="border-border">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Email Verified!</CardTitle>
        <CardDescription className="text-base mt-2 text-gray-500">
          Your email address has been successfully verified.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-muted-foreground pb-6">
        <p>Thank you for confirming your email. You can now use all the features of your account.</p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button asChild className="w-full font-medium h-11">
          <Link href={nextPath}>
            {nextPath.includes("dashboard") ? "Continue to Dashboard" : "Continue to Onboarding"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
