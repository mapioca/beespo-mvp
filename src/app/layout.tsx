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
