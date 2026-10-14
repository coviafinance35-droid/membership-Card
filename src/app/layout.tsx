import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { PwaRegister } from "./PwaRegister";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "MemberCard AI — Create your membership card with AI",
  description: "Tell us a little about your card, and we'll create it for you automatically.",
  manifest: "/manifest.webmanifest",
  applicationName: "MemberCard AI",
  appleWebApp: { capable: true, title: "MemberCard AI", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#071413",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <PwaRegister />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
