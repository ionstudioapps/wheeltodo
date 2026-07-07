import type { Metadata, Viewport } from "next";
import { Albert_Sans, Ephesis } from "next/font/google";
import "./globals.css";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700"],
});

const ephesis = Ephesis({
  variable: "--font-ephesis",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "WheelToDo",
  description: "Put your tasks on the wheel, let it choose, and drop straight into focus.",
};

export const viewport: Viewport = {
  themeColor: "#F3EEE5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="warm-start" className={`${albertSans.variable} ${ephesis.variable}`}>
      <body>{children}</body>
    </html>
  );
}
