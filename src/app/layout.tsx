import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast-container";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const themeInitScript = `
try {
  var theme = localStorage.getItem("beespo-theme");
  if (theme === "warm") theme = "light";
  if (theme !== "dark" && theme !== "light") theme = "light";
  localStorage.setItem("beespo-theme", theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
} catch (_) {}
`;

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
    <html
      lang="en"
      data-theme="light"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          {children}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
