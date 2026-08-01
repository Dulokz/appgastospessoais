import { Decimal, toDecimal } from "../decimal";

export interface NetWorthVariationInput {
  initialNetWorth: Decimal | number | string;
  totalIncome: Decimal | number | string;
  totalExpenses: Decimal | number | string; // Inclui consumo, juros e tarifas registradas em EXPENSE
  unrealizedGains: Decimal | number | string; // Valorizações de ativos
  unrealizedLosses: Decimal | number | string; // Desvalorizações de ativos
  reconciliationAdjustments?: Decimal | number | string; // Ajustes de conciliação bancária
}

export interface NetWorthVariationReport {
  initialNetWorth: Decimal;
  totalIncome: Decimal;
  totalExpenses: Decimal;
  netOperatingCashFlow: Decimal; // Receitas - Despesas
  unrealizedGains: Decimal;
  unrealizedLosses: Decimal;
  netAssetValuationChange: Decimal; // Ganhos - Perdas
  reconciliationAdjustments: Decimal;
  finalNetWorth: Decimal;
  totalNetWorthChange: Decimal;
}

export class VariationService {
  /**
   * Calcula a conciliação completa da variação patrimonial.
   * Regra estrita: Nenhuma despesa ou ganho pode ser contado duas vezes.
   */
  public static calculateVariationReport(input: NetWorthVariationInput): NetWorthVariationReport {
    const initial = toDecimal(input.initialNetWorth);
    const income = toDecimal(input.totalIncome);
    const expenses = toDecimal(input.totalExpenses);
    const gains = toDecimal(input.unrealizedGains);
    const losses = toDecimal(input.unrealizedLosses);
    const adjustments = toDecimal(input.reconciliationAdjustments || 0);

    const netOperatingCashFlow = income.sub(expenses);
    const netAssetValuationChange = gains.sub(losses);

    const finalNetWorth = initial
      .add(netOperatingCashFlow)
      .add(netAssetValuationChange)
      .add(adjustments);

    const totalNetWorthChange = finalNetWorth.sub(initial);

    return {
      initialNetWorth: initial,
      totalIncome: income,
      totalExpenses: expenses,
      netOperatingCashFlow,
      unrealizedGains: gains,
      unrealizedLosses: losses,
      netAssetValuationChange,
      reconciliationAdjustments: adjustments,
      finalNetWorth,
      totalNetWorthChange,
    };
  }
}
