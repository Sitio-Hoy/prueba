import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Panel · Multi-Tenant",
  description: "Panel de administración con aislación por tenant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script defer src="https://cloud.umami.is/script.js" data-website-id="ba12b88b-c6f4-4869-8db0-abbbc6269d02"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
