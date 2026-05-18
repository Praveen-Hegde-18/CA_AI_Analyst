import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kabuni Cricket AI",
  description: "AI-powered cricket shot analysis by Kabuni",
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
