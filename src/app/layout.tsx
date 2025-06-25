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
  title: "Comforeve",
  description: "A ticketing platform for all events",
  openGraph: {
    title: "Comforeve",
    description: "A ticketing platform for events",
    url: "https://comforeve.com",
    siteName: "Comforeve",
    images: [
      {
        url: "https://comforeve.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Comforeve OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  // twitter: {
  //   card: "summary_large_image",
  //   title: "Comforeve",
  //   description: "A ticketing platform for events",
  //   images: ["https://comforeve.com/og-image.png"],
  // },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/shortcut-icon.png",
  },
  themeColor: "#ffffff",
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  alternates: {
    canonical: "https://comforeve.com",
  },
  keywords: [
    "ticketing",
    "events",
    "comforeve",
    "event management",
    "online tickets",
    "event tickets",
  ],
  authors: [
    {
      name: "Comforeve Team",
      url: "https://comforeve.com/about",
    },
  ],
  creator: "Comforeve Team",
  verification: {
    google: "google-site-verification-code",
    other: {
      name: "Email",
      value: "email-verification-link",
    },
  },
  applicationName: "Comforeve",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  colorScheme: "light dark",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    title: "Comforeve",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
