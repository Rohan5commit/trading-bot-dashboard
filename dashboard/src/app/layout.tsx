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
  title: "Trading Bot Dashboard",
  description: "PnL tracking and performance analytics for trading bots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-white">
              Trading Bot Dashboard
            </a>
            <span className="text-xs text-zinc-500">PnL Analytics</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
