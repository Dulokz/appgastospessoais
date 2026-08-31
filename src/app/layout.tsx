import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { OnboardingGuard } from "@/components/layout/OnboardingGuard";
import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";

export const metadata: Metadata = {
  title: "Aegis Riqueza — Gestão Financeira & Patrimonial Pessoal",
  description: "Sistema de acompanhamento patrimonial, liquidez, alocação de ativos e construção de riqueza.",
};

async function getQuickRegisterData() {
  try {
    const userId = await getDefaultUserId();
    const [accounts, categories] = await Promise.all([
      db.account.findMany({
        where: { userId, active: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          financialInstitution: {
            select: {
              name: true,
            },
          },
        },
      }),
      db.category.findMany({
        where: { userId, parentId: null, deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    const formattedAccounts = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      institutionName: a.financialInstitution?.name || null,
    }));
    return { accounts: formattedAccounts, categories };
  } catch {
    return { accounts: [], categories: [] };
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const quick = await getQuickRegisterData();

  return (
    <html lang="pt-BR" className="dark">
      <body className="flex min-h-screen bg-background text-foreground antialiased selection:bg-emerald-500 selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
          <Header accounts={quick.accounts} categories={quick.categories} />
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            <OnboardingGuard>{children}</OnboardingGuard>
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
