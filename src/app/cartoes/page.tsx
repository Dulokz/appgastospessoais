import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { CartoesClient } from "./CartoesClient";

export const dynamic = "force-dynamic";

export default async function CartoesPage() {
  const userId = await getDefaultUserId();
  const cards = await db.account.findMany({
    where: { userId, active: true, type: "CREDIT_CARD" },
    include: { financialInstitution: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <CartoesClient
      initialCards={cards.map((card) => ({
        id: card.id,
        name: card.name,
        institution: card.financialInstitution?.name || "Instituição não informada",
        balance: card.calculatedBalance.toNumber(),
        closingDay: card.creditCardClosingDay,
        dueDay: card.creditCardDueDay,
      }))}
    />
  );
}
