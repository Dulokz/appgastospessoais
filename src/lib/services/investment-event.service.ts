import { Decimal, toDecimal } from "../decimal";

export interface ProcessInvestmentEventInput {
  eventType:
    | "INITIAL_POSITION"
    | "CONTRIBUTION"
    | "WITHDRAWAL"
    | "INCOME_RECEIVED"
    | "DIVIDEND"
    | "JCP"
    | "APPRECIATION"
    | "DEPRECIATION"
    | "REALIZED_GAIN"
    | "REALIZED_LOSS";
  amount: Decimal | number | string;
  positionCurrentValue: Decimal | number | string;
  accountCalculatedBalance: Decimal | number | string;
  realizedGainOrLoss?: Decimal | number | string;
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
   * Regra estrita: NUNCA soma o mesmo ganho duas vezes e suporta resgate com ganho/perda realizada.
   */
  public static processEvent(input: ProcessInvestmentEventInput): ProcessInvestmentEventResult {
    const amt = toDecimal(input.amount);
    let posValue = toDecimal(input.positionCurrentValue);
    let accBal = toDecimal(input.accountCalculatedBalance);

    let netWorthChange = new Decimal(0);
    let isRealizedIncome = false;
    let isUnrealizedGain = false;

    switch (input.eventType) {
      case "INITIAL_POSITION":
        // Reconhecimento de Posição Inicial: Posição patrimonial já existente.
        // Posição: +amt | Conta: inalterada | PL: +amt (reconhecimento inicial sem gerar receita no mês)
        posValue = posValue.add(amt);
        netWorthChange = amt;
        break;

      case "CONTRIBUTION":
        // Aporte Real: Dinheiro sai da conta e entra na posição.
        // Posição: +amt | Conta: -amt | PL: R$ 0
        posValue = posValue.add(amt);
        accBal = accBal.sub(amt);
        netWorthChange = new Decimal(0);
        break;

      case "WITHDRAWAL": {
        // Resgate: Dinheiro sai da posição e entra no caixa da conta.
        // Posição: -amt | Conta: +amt | PL: R$ 0 (a menos que haja ganho/perda realizada informado)
        posValue = posValue.sub(amt);
        if (posValue.isNegative()) posValue = new Decimal(0);
        accBal = accBal.add(amt);

        if (input.realizedGainOrLoss) {
          const gainOrLoss = toDecimal(input.realizedGainOrLoss);
          if (gainOrLoss.isPositive()) {
            isRealizedIncome = true;
          }
        }
        netWorthChange = new Decimal(0);
        break;
      }

      case "INCOME_RECEIVED":
      case "DIVIDEND":
      case "JCP":
      case "REALIZED_GAIN":
        // Rendimento / Dividendo / JCP / Ganho Realizado: Crédito no caixa da conta.
        // Posição: inalterada | Conta: +amt | PL: +amt
        accBal = accBal.add(amt);
        netWorthChange = amt;
        isRealizedIncome = true;
        break;

      case "REALIZED_LOSS":
        // Perda Realizada em Investimento
        netWorthChange = amt.negated();
        break;

      case "APPRECIATION":
        // Valorização não realizada: Aumento do valor de mercado da posição.
        posValue = posValue.add(amt);
        netWorthChange = amt;
        isUnrealizedGain = true;
        break;

      case "DEPRECIATION":
        // Desvalorização não realizada: Queda do valor de mercado da posição.
        posValue = posValue.sub(amt);
        if (posValue.isNegative()) posValue = new Decimal(0);
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
