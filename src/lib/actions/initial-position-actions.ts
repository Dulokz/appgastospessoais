"use server";

import { getDefaultUserId } from "@/lib/auth-user";
import { FinancialCommandService } from "@/lib/services/financial-command.service";
import { revalidatePath } from "next/cache";

export type ForgottenInitialPositionInput =
  | {
      itemType: "ACCOUNT";
      data: { name: string; type: string; initialBalance: number };
    }
  | {
      itemType: "INVESTMENT";
      data: { accountId: string; instrumentName: string; instrumentType: string; currentValue: number };
    }
  | {
      itemType: "ASSET";
      data: { name: string; category: string; currentValue: number };
    }
  | {
      itemType: "LIABILITY";
      data: { name: string; type: string; institution?: string; currentBalance: number; originalValue?: number };
    };

export async function addForgottenInitialPosition(input: ForgottenInitialPositionInput) {
  const userId = await getDefaultUserId();

  const result = await FinancialCommandService.addRetroactiveInitialItem({
    userId,
    itemType: input.itemType,
    data: input.data,
  });

  revalidatePath("/");
  revalidatePath("/ajustar-posicao-inicial");
  revalidatePath("/contas");
  revalidatePath("/investimentos");
  revalidatePath("/meu-patrimonio");
  revalidatePath("/patrimonio");
  revalidatePath("/dividas");
  revalidatePath("/resultado-mes");

  return result;
}
