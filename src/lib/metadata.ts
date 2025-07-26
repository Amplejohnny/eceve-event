import type { Metadata } from "next";

export function constructMetadata({
  title = "Comforeve - Discover Amazing Events Near You",
  description = "Find and book the best events in your area. From concerts and workshops to conferences and networking events - discover what excites you on Comforeve.",
  image = "/thumbnail.png",
  icons = "/favicon.ico",
  keywords,
  url,
  siteName = "Comforeve",
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  keywords?: string[];
  url?: string;
  siteName?: string;
} = {}): Metadata {
  return {
    title,
    description,
    ...(keywords && { keywords }),
    openGraph: {
      title,
      description,
      images: [{ url: image }],
      ...(url && { url }),
      siteName,
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
