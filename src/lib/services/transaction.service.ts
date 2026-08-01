import { Decimal, toDecimal } from "../decimal";

export interface AllocationInput {
  allocationType:
    | "EXPENSE"
    | "INCOME"
    | "ASSET_INCREASE"
    | "ASSET_DECREASE"
    | "LIABILITY_INCREASE"
    | "LIABILITY_REDUCTION"
    | "TRANSFER"
    | "INVESTMENT"
    | "INTEREST"
    | "FEE";
  amount: Decimal | number | string;
  categoryId?: string | null;
  assetId?: string | null;
  liabilityId?: string | null;
  notes?: string | null;
}

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  destinationAccountId?: string | null;
  date: Date;
  description: string;
  amount: Decimal | number | string;
  direction: "CREDIT" | "DEBIT";
  transactionType:
    | "INCOME"
    | "EXPENSE"
    | "TRANSFER"
    | "INVESTMENT_CONTRIBUTION"
    | "INVESTMENT_WITHDRAWAL"
    | "ASSET_PURCHASE"
    | "ASSET_SALE"
    | "LIABILITY_PAYMENT"
    | "LOAN_RECEIVED"
    | "REFUND"
    | "INTEREST_INCOME"
    | "INTEREST_EXPENSE"
    | "FEE"
    | "OTHER";
  categoryId?: string | null;
  notes?: string | null;
  source?: "MANUAL" | "OFX" | "CSV" | "XLSX" | "OPEN_FINANCE" | "BANK_API" | "BROKER_API" | "OTHER";
  externalId?: string | null;
  importHash?: string | null;
  allocations: AllocationInput[];
}

export class TransactionService {
  /**
   * Valida a integridade estrita das allocations de uma transação.
   * Regra fundamental: A soma das allocations deve ser exatamente igual ao valor da transação.
   */
  public static validateAllocations(amount: Decimal | number | string, allocations: AllocationInput[]): void {
    const txAmount = toDecimal(amount);
    let totalAllocation = new Decimal(0);

    if (!allocations || allocations.length === 0) {
      throw new Error("Toda transação deve possuir pelo menos uma allocation.");
    }

    for (const alloc of allocations) {
      totalAllocation = totalAllocation.add(toDecimal(alloc.amount));
    }

    if (!totalAllocation.equals(txAmount)) {
      throw new Error(
        `A soma das allocations (${totalAllocation.toString()}) deve ser exatamente igual ao valor total da transação (${txAmount.toString()}).`
      );
    }
  }

  /**
   * Determina o efeito de uma transação no saldo calculado de uma conta.
   */
  public static calculateAccountBalanceDelta(direction: "CREDIT" | "DEBIT", amount: Decimal | number | string): Decimal {
    const dec = toDecimal(amount);
    return direction === "CREDIT" ? dec : dec.negated();
  }
}
