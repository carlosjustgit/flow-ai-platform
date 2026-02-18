import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Flow Productions Portal",
  description: "Social Media Agent Pipeline Portal",
  icons: {
    icon: '/logo.png',
  },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
