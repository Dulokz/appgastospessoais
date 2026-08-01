import { Decimal, toDecimal } from "../decimal";

export interface ReconciliationCheckInput {
  accountId: string;
  calculatedBalance: Decimal | number | string;
  reportedBalance: Decimal | number | string;
  notes?: string | null;
}

export interface ReconciliationCheckResult {
  accountId: string;
  calculatedBalance: Decimal;
  reportedBalance: Decimal;
  difference: Decimal; // reportedBalance - calculatedBalance
  hasDifference: boolean;
  notes?: string | null;
}

export class ReconciliationService {
  /**
   * Processa uma conferência de saldo informada pelo usuário.
   * Regra estrita: NUNCA apaga ou modifica silenciosamente transações históricas.
   */
  public static processCheck(input: ReconciliationCheckInput): ReconciliationCheckResult {
    const calc = toDecimal(input.calculatedBalance);
    const rep = toDecimal(input.reportedBalance);
    const difference = rep.sub(calc);

    return {
      accountId: input.accountId,
      calculatedBalance: calc,
      reportedBalance: rep,
      difference,
      hasDifference: !difference.isZero(),
      notes: input.notes,
    };
  }
}
