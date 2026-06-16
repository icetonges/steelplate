import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "steelplate",
  description: "A long-term mentor for raising a child with character and the capability to meet an unknown future.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
