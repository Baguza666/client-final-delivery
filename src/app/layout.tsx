import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "@/components/ui/ModalProvider";
import Sidebar from "@/components/Sidebar"; // ✅ 1. Import the Sidebar

// Load Standard Fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "IMSAL PRO | Financial Operating System",
  description: "High-performance financial management for contractors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* 👇 LOAD BALLET FONT DIRECTLY HERE */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Ballet&display=swap" rel="stylesheet" />

        {/* Material Icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning={true}
        className={`${inter.variable} ${mono.variable} antialiased bg-black text-white font-sans`} // Changed bg-background-dark to bg-black for consistency
      >
        <ModalProvider>
          {/* ✅ 2. Render Sidebar Globally */}
          <Sidebar />

          {/* Main Content */}
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}