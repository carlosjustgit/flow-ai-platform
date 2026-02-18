import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flow AI Platform",
  description: "AI Agent Team Platform for Flow Productions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
