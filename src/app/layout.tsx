import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast-container";

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
  other: {
    "zoom-domain-verification": "ZOOM_verify_9532e3df21144d538c14515b2717638d",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
