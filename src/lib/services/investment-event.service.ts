import { Decimal, toDecimal } from "../decimal";

export interface ProcessInvestmentEventInput {
  eventType: "CONTRIBUTION" | "WITHDRAWAL" | "INCOME_RECEIVED" | "DIVIDEND" | "JCP" | "APPRECIATION" | "DEPRECIATION";
  amount: Decimal | number | string;
  positionCurrentValue: Decimal | number | string;
  accountCalculatedBalance: Decimal | number | string;
}

export interface ProcessInvestmentEventResult {
  newPositionValue: Decimal;
  newAccountBalance: Decimal;
  netWorthChange: Decimal;
  isRealizedIncome: boolean;
  isUnrealizedGain: boolean;
}

export class InvestmentEventService {
  /**
   * Processa o impacto de um evento de investimento sobre a posição, a conta e o patrimônio líquido.
   * Regra estrita: NUNCA soma o mesmo ganho duas vezes.
   */
  public static processEvent(input: ProcessInvestmentEventInput): ProcessInvestmentEventResult {
    const amt = toDecimal(input.amount);
    let posValue = toDecimal(input.positionCurrentValue);
    let accBal = toDecimal(input.accountCalculatedBalance);

    let netWorthChange = new Decimal(0);
    let isRealizedIncome = false;
    let isUnrealizedGain = false;

    switch (input.eventType) {
      case "CONTRIBUTION":
        // Aporte: Dinheiro sai da conta e entra na posição.
        // Posição: +amt | Conta: -amt | PL: R$ 0
        posValue = posValue.add(amt);
        accBal = accBal.sub(amt);
        netWorthChange = new Decimal(0);
        break;

      case "WITHDRAWAL":
        // Resgate: Dinheiro sai da posição e entra na conta.
        // Posição: -amt | Conta: +amt | PL: R$ 0
        posValue = posValue.sub(amt);
        accBal = accBal.add(amt);
        netWorthChange = new Decimal(0);
        break;

      case "INCOME_RECEIVED":
      case "DIVIDEND":
      case "JCP":
        // Rendimento / Dividendo / JCP em dinheiro: Crédito no caixa da conta.
        // Posição: inalterada | Conta: +amt | PL: +amt
        accBal = accBal.add(amt);
        netWorthChange = amt;
        isRealizedIncome = true;
        break;

      case "APPRECIATION":
        // Valorização não realizada: Aumento do valor de mercado da posição.
        // Posição: +amt | Conta: inalterada | PL: +amt (ganho não realizado)
        posValue = posValue.add(amt);
        netWorthChange = amt;
        isUnrealizedGain = true;
        break;

      case "DEPRECIATION":
        // Desvalorização não realizada: Queda do valor de mercado da posição.
        // Posição: -amt | Conta: inalterada | PL: -amt (perda não realizada)
        posValue = posValue.sub(amt);
        netWorthChange = amt.negated();
        isUnrealizedGain = true;
        break;
    }

    return {
      newPositionValue: posValue,
      newAccountBalance: accBal,
      netWorthChange,
      isRealizedIncome,
      isUnrealizedGain,
    };
  }
}
