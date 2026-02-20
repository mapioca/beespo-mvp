import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ToastContainer } from "@/components/ui/toast-container";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Beespo Admin - System Management",
    description: "Administrative console for the Beespo platform.",
    icons: {
        icon: "/beespo-favicon.png",
    },
};

export default function AdminRootLayout({
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
