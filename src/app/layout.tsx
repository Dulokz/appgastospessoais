import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Aegis Riqueza — Gestão Financeira & Patrimonial Pessoal",
  description: "Sistema de acompanhamento patrimonial, liquidez, alocação de ativos e construção de riqueza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="flex min-h-screen bg-background text-foreground antialiased selection:bg-emerald-500 selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
          <Header />
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
