import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { AppBottomNav } from "@/components/AppBottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { RegisterSW } from "@/components/RegisterSW";
import { APP_NAME } from "@/lib/types";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — plan trips together`,
  description:
    "Collaborative holiday planner with calendar, split payments, visas, and checklists.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#1f6f78",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <RegisterSW />
        <OfflineBanner />
        <div className="flex-1 pb-20 md:pb-8">{children}</div>
        <AppBottomNav />
      </body>
    </html>
  );
}
