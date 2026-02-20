import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ToastContainer } from "@/components/ui/toast-container";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beespo - Leadership Management for Church Leaders",
  description:
    "A comprehensive agenda and leadership management platform designed for leaders in The Church of Jesus Christ of Latter-day Saints.",
  icons: {
    icon: "/beespo-favicon.png",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const resolvedParams = await params;

  if (!routing.locales.includes(resolvedParams.locale as "en" | "es")) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={resolvedParams.locale} className={inter.variable}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
          <ToastContainer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
