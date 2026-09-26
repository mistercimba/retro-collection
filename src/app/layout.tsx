import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "Mário's Retro Collection", template: "%s · Retro Collection" },
  description: "Acesso rápido à coleção retro do Mário.",
  applicationName: "Mário's Retro Collection",
  appleWebApp: { capable: true, title: "Retro Collection", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#142f51", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-PT"><body><PwaRegister />{children}</body></html>;
}
