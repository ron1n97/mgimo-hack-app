import type { Metadata, Viewport } from "next";
import { Manrope, Spectral } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  variable: "--font-spectral",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Деканат+",
    template: "%s · Деканат+",
  },
  description: "Расписание, заявки и учёба в одном кабинете",
  applicationName: "Деканат+",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Деканат+",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1C2C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${spectral.variable}`}>
      <body className="font-sans antialiased">
        <PwaRegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
