import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEO Live Audit — Real AI Visibility Check",
  description:
    "Enter any website URL. This tool fetches the site live and checks whether ChatGPT, Perplexity, Gemini and Google AI Overviews can find and cite it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
