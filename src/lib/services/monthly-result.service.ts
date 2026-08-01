import { Decimal, toDecimal } from "../decimal";

export interface TransactionSummaryItem {
  id: string;
  type: string; // INCOME, EXPENSE, TRANSFER, INVESTMENT_CONTRIBUTION, LIABILITY_PAYMENT, LOAN_RECEIVED, ASSET_PURCHASE
  amount: Decimal | number | string;
  categoryName?: string | null;
  allocations?: {
    type: string;
    amount: Decimal | number | string;
    categoryName?: string | null;
  }[];
}

export interface CategoryGroup {
  name: string;
  total: Decimal;
}

export interface MonthlyResultReport {
  totalIncome: Decimal;
  totalExpenses: Decimal;
  monthlyResult: Decimal; // totalIncome - totalExpenses
  incomeCategories: CategoryGroup[];
  expenseCategories: CategoryGroup[];
}

export class MonthlyResultService {
  /**
   * Calcula o Demonstrativo do Resultado do Mês (DRE Pessoal).
   * Regras estritas:
   * - Transferências não entram como receita nem despesa.
   * - Aportes em investimentos não entram como despesa.
   * - Empréstimos recebidos não entram como receita.
   * - Amortização do principal de dívida não entra como despesa (apenas juros e tarifas).
   */
  public static calculateReport(transactions: TransactionSummaryItem[]): MonthlyResultReport {
    let totalIncome = new Decimal(0);
    let totalExpenses = new Decimal(0);

    const incomeMap = new Map<string, Decimal>();
    const expenseMap = new Map<string, Decimal>();

    for (const tx of transactions) {
      // Ignore transfers completely from DRE
      if (tx.type === "TRANSFER") continue;
      // Ignore loan received from DRE (it creates liability, not income)
      if (tx.type === "LOAN_RECEIVED") continue;
      // Ignore asset purchases treated as assets from DRE (handled at asset level)
      if (tx.type === "ASSET_PURCHASE") continue;

      if (tx.allocations && tx.allocations.length > 0) {
        for (const alloc of tx.allocations) {
          const amount = toDecimal(alloc.amount);
          const catName = alloc.categoryName || "Geral";

          if (alloc.type === "INCOME") {
            totalIncome = totalIncome.add(amount);
            incomeMap.set(catName, (incomeMap.get(catName) || new Decimal(0)).add(amount));
          } else if (
            alloc.type === "EXPENSE" ||
            alloc.type === "INTEREST" ||
            alloc.type === "FEE"
          ) {
            totalExpenses = totalExpenses.add(amount);
            expenseMap.set(catName, (expenseMap.get(catName) || new Decimal(0)).add(amount));
          }
          // Note: LIABILITY_REDUCTION, TRANSFER, ASSET_INCREASE are excluded from expenses
        }
      } else {
        const amount = toDecimal(tx.amount);
        const catName = tx.categoryName || "Geral";

        if (tx.type === "INCOME") {
          totalIncome = totalIncome.add(amount);
          incomeMap.set(catName, (incomeMap.get(catName) || new Decimal(0)).add(amount));
        } else if (tx.type === "EXPENSE" || tx.type === "INTEREST_EXPENSE" || tx.type === "FEE") {
          totalExpenses = totalExpenses.add(amount);
          expenseMap.set(catName, (expenseMap.get(catName) || new Decimal(0)).add(amount));
        }
      }
    }

    const incomeCategories: CategoryGroup[] = Array.from(incomeMap.entries()).map(
      ([name, total]) => ({ name, total })
    );

    const expenseCategories: CategoryGroup[] = Array.from(expenseMap.entries()).map(
      ([name, total]) => ({ name, total })
    );

    const monthlyResult = totalIncome.sub(totalExpenses);

    return {
      totalIncome,
      totalExpenses,
      monthlyResult,
      incomeCategories,
      expenseCategories,
    };
  }
}
