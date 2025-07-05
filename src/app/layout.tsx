import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// import { Recursive } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// const recursive = Recursive({ subsets: ["latin"] });

export function constructMetadata({
  title = "Comforeve - Events near you",
  description = "A ticketing platform for all events",
  image = "/thumbnail.png",
  icons = "/favicon.ico",
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@amplejohnny",
    },
    icons,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ),
  };
}

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
