import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { bodyFont, headlineFont, labelFont, noteFont } from "./fonts";
import "./globals.css";
import "./book-cover.css";

export const metadata: Metadata = {
  title: "Narrator — Free Audiobook Studio",
  description:
    "Give your book a voice. A free audiobook creation studio for authors.",
  icons: {
    icon: [
      {
        url: "/brand/narrator-favicon.ico",
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      {
        url: "/brand/narrator-favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      { url: "/brand/narrator-mark.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/brand/narrator-favicon.ico",
    apple: [
      {
        url: "/brand/narrator-apple-touch.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1f3b2d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${headlineFont.variable} ${noteFont.variable} ${labelFont.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
