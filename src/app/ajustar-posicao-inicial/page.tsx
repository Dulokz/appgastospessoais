import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { InitialPositionAdjustmentClient } from "./InitialPositionAdjustmentClient";

export const dynamic = "force-dynamic";

export default async function InitialPositionAdjustmentPage() {
  const userId = await getDefaultUserId();

  const [user, accounts] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { controlStartDate: true },
    }),
    db.account.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, financialInstitution: { select: { name: true } } },
    }),
  ]);

  return (
    <InitialPositionAdjustmentClient
      controlStartDate={user?.controlStartDate?.toISOString().split("T")[0] ?? null}
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        institution: account.financialInstitution?.name || "Instituição manual",
      }))}
    />
  );
}
