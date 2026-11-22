import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
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
  themeColor: "#162256",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={montserrat.variable}>
      <body className="font-sans antialiased">
        <PwaRegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
