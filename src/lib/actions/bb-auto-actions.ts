'use server';

import { revalidatePath } from 'next/cache';
import { getDefaultUserId } from '../auth-user';
import { BbAutoRedemptionEngine, BbAutoRedemptionSuggestion } from '../services/ofx/bb-auto-redemption-engine';
import { PrismaClient, TransactionNature, ClassificationStatus, TransactionOrigin, TransactionPeriodType } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function getBbAutoRedemptionSuggestionsAction(): Promise<{
  success: boolean;
  suggestions: BbAutoRedemptionSuggestion[];
  error?: string;
}> {
  try {
    const userId = await getDefaultUserId();
    const suggestions = await BbAutoRedemptionEngine.detectSuggestions(userId);
    return { success: true, suggestions };
  } catch (err: any) {
    console.error('[getBbAutoRedemptionSuggestionsAction] Erro:', err);
    return { success: false, suggestions: [], error: err.message };
  }
}

export async function confirmBbAutoRedemptionAction(params: {
  transactionId: string;
  matchedTransactionId?: string;
  targetAccountId?: string;
  createSavingsAccountIfMissing?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId();
    await BbAutoRedemptionEngine.confirmPair({
      userId,
      ...params,
    });

    revalidatePath('/transacoes/pendentes');
    revalidatePath('/transacoes');
    revalidatePath('/');
    revalidatePath('/resultado-mes');

    return { success: true };
  } catch (err: any) {
    console.error('[confirmBbAutoRedemptionAction] Erro:', err);
    return { success: false, error: err.message };
  }
}

export async function generateMissingBbResgateAction(
  debitTransactionId: string
): Promise<{ success: boolean; creditTransactionId?: string; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const debitTx = await prisma.transaction.findFirst({
      where: { id: debitTransactionId, userId, deletedAt: null },
      include: { account: true },
    });

    if (!debitTx) {
      throw new Error(`Lançamento de débito ${debitTransactionId} não encontrado.`);
    }

    let savingsAccount = await prisma.account.findFirst({
      where: { userId, name: { contains: 'Poupança', mode: 'insensitive' }, deletedAt: null },
    });

    if (!savingsAccount) {
      savingsAccount = await prisma.account.create({
        data: {
          userId,
          name: 'Poupança / Aplicação BB',
          type: 'SAVINGS',
          currency: 'BRL',
        },
      });
    }

    const absAmount = Math.abs(Number(debitTx.amount));

    const creditTx = await prisma.$transaction(async (txPrisma) => {
      // 1. Criar o lançamento de Crédito de Resgate Poupança BB correspondente
      const createdCredit = await txPrisma.transaction.create({
        data: {
          userId,
          accountId: debitTx.accountId,
          destinationAccountId: savingsAccount.id,
          date: debitTx.date,
          amount: new Prisma.Decimal(absAmount),
          direction: 'CREDIT',
          description: `Resgate Poupança (var.51) - ${debitTx.originalDescription || debitTx.description}`,
          originalDescription: `Resgate Poupança Poupança (var.51) - Automático BB`,
          transactionType: 'TRANSFER',
          nature: TransactionNature.INTERNAL_TRANSFER,
          origin: debitTx.origin,
          periodType: debitTx.periodType,
          source: 'SYSTEM',
          fitId: debitTx.fitId ? `${debitTx.fitId}_resgate` : null,
          classificationStatus: ClassificationStatus.CONFIRMED,
          counterpartyName: 'Poupança / Aplicação BB',
        },
      });

      // 2. Classificar o Débito também como transferência própria (isolado da DRE)
      await txPrisma.transaction.update({
        where: { id: debitTx.id },
        data: {
          nature: TransactionNature.INTERNAL_TRANSFER,
          transactionType: 'TRANSFER',
          classificationStatus: ClassificationStatus.CONFIRMED,
          destinationAccountId: savingsAccount.id,
          counterpartyName: 'Resgate Poupança BB',
        },
      });

      return createdCredit;
    });

    revalidatePath('/transacoes/pendentes');
    revalidatePath('/transacoes');
    revalidatePath('/');
    revalidatePath('/resultado-mes');

    return { success: true, creditTransactionId: creditTx.id };
  } catch (err: any) {
    console.error('[generateMissingBbResgateAction] Erro:', err);
    return { success: false, error: err.message };
  }
}

export async function unpairBbAutoRedemptionAction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId();
    await BbAutoRedemptionEngine.unpair(userId, transactionId);

    revalidatePath('/transacoes/pendentes');
    revalidatePath('/transacoes');
    revalidatePath('/');
    revalidatePath('/resultado-mes');

    return { success: true };
  } catch (err: any) {
    console.error('[unpairBbAutoRedemptionAction] Erro:', err);
    return { success: false, error: err.message };
  }
}
