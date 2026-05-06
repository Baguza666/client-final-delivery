import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./print.css";
import { ModalProvider } from "@/components/ui/ModalProvider";
import { SidebarProvider } from "@/contexts/SidebarContext";
import AppShell from "@/components/AppShell";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const mono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-heading",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Invoicify — Facturation moderne pour entrepreneurs",
    description:
        "Invoicify : devis, factures, bons de commande et bons de livraison dans une seule application claire et rapide.",
    applicationName: "Invoicify",
    icons: { icon: "/invoicify-favicon.png" },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="fr" className="dark">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                    rel="stylesheet"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Ballet&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body
                suppressHydrationWarning
                className={`${inter.variable} ${mono.variable} ${spaceGrotesk.variable} antialiased bg-slate-950 text-white font-sans`}
            >
                <SidebarProvider>
                    <ModalProvider>
                        <AppShell>
                            {children}
                        </AppShell>
                    </ModalProvider>
                </SidebarProvider>
            </body>
        </html>
    );
}
