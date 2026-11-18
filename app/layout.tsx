import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "記念訪問カードづくり",
  description: "名前と写真で、来館の記念カードを作れます。",
};

export const viewport: Viewport = {
  themeColor: "#eaf4fb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
