import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-16 w-48 mb-4">
            <Image
              src="/images/beespo-logo-full.svg"
              alt="Beespo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Leadership Management Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
