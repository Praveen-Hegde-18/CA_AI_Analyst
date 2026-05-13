import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cricket AI Analyst",
  description: "AI-powered cricket match video analysis",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
