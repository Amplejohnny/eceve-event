import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// import { Recursive } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { constructMetadata } from "@/lib/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// const recursive = Recursive({ subsets: ["latin"] });

export const metadata: Metadata = constructMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true} data-qb-installed="true">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        // className={recursive.className}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
