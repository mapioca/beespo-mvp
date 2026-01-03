export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Beespo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Leadership Management Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
