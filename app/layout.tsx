import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const bodySans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const displaySerif = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "RecommenAnime",
  description: "Interactive anime discovery powered by your existing embeddings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodySans.variable} ${displaySerif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
