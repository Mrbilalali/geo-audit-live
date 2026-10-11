import type { Metadata } from "next";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEO Toolkit — Get Cited by ChatGPT, Perplexity & Google AI",
  description:
    "A working SEO/GEO tool suite: live AI-visibility audit, content optimizer pro, schema & meta code generator, content GEO checker, and AI prompt tracker. Built by Mr Bilal Ali.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Sidebar />
          <div className="main">
            <Topbar />
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
