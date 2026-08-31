'use server';

import { getDefaultUserId } from '../auth-user';
import { CreditCardEngine } from '../services/credit-card/credit-card-engine';

/**
 * Server Action para obter ou criar um cartão de crédito
 */
export async function getOrCreateCreditCardAction(params: {
  name: string;
  closingDay: number;
  dueDay: number;
  limit?: number;
}) {
  try {
    const userId = await getDefaultUserId();

    const result = await CreditCardEngine.getOrCreateCreditCard({
      userId,
      ...params,
    });

    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao criar/obter cartão de crédito.' };
  }
}

/**
 * Server Action para registrar uma compra no cartão (à vista ou parcelada)
 */
export async function registerCardPurchaseAction(params: {
  creditCardId: string;
  date: Date;
  description: string;
  totalAmount: number;
  categoryId?: string;
  subcategoryId?: string;
  installments?: number;
}) {
  try {
    const userId = await getDefaultUserId();

    const result = await CreditCardEngine.registerPurchase({
      userId,
      ...params,
    });

    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao registrar compra no cartão.' };
  }
}

/**
 * Server Action para calcular detalhes da fatura
 */
export async function getInvoiceDetailsAction(creditCardId: string, competence: string) {
  try {
    const userId = await getDefaultUserId();

    const data = await CreditCardEngine.calculateInvoice(userId, creditCardId, competence);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao buscar detalhes da fatura.' };
  }
}

/**
 * Server Action para processar o pagamento da fatura no extrato bancário
 */
export async function processInvoicePaymentAction(params: {
  creditCardId: string;
  bankAccountId: string;
  paymentDate: Date;
  amount: number;
  competence: string;
  bankTransactionId?: string;
}) {
  try {
    const userId = await getDefaultUserId();

    const result = await CreditCardEngine.processInvoicePayment({
      userId,
      ...params,
    });

    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao processar pagamento da fatura.' };
  }
}
