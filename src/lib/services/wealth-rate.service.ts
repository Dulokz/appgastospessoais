import { Decimal, toDecimal } from "../decimal";

export interface WealthRateInput {
  totalIncome: Decimal | number | string;           // Receitas operacionais brutas no período
  netInvestmentContributions: Decimal | number | string; // Aportes líquidos em investimentos (Aportes - Retiradas)
  liabilityAmortization: Decimal | number | string;  // Amortização do principal de dívidas
  unrealizedGains?: Decimal | number | string;       // Opcional: valorização de mercado
}

export class WealthRateService {
  /**
   * Modo Padrão: Fluxo de Riqueza Puro
   * Fórmula: ((Aportes Líquidos + Amortização de Dívidas) / Receitas) * 100
   * Não mistura valorização de mercado.
   */
  public static calculateStandardRate(input: WealthRateInput): Decimal {
    const income = toDecimal(input.totalIncome);
    if (income.isZero() || income.isNegative()) {
      return new Decimal(0);
    }

    const contributions = toDecimal(input.netInvestmentContributions);
    const amortizations = toDecimal(input.liabilityAmortization);
    const wealthBuildingFlow = contributions.add(amortizations);

    return wealthBuildingFlow.div(income).mul(100);
  }

  /**
   * Modo Amplo: Fluxo + Rendimentos Operacionais
   */
  public static calculateBroadRate(input: WealthRateInput): Decimal {
    const income = toDecimal(input.totalIncome);
    if (income.isZero() || income.isNegative()) {
      return new Decimal(0);
    }

    const contributions = toDecimal(input.netInvestmentContributions);
    const amortizations = toDecimal(input.liabilityAmortization);
    const gains = toDecimal(input.unrealizedGains || 0);

    const totalWealthGain = contributions.add(amortizations).add(gains);
    return totalWealthGain.div(income).mul(100);
  }
}
