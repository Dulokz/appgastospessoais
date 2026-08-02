import { Decimal, toDecimal } from "../decimal";

export interface AccountItemData {
  id: string;
  name: string;
  type: string;
  calculatedBalance: Decimal | number | string;
  financialInstitutionId?: string | null;
  financialInstitutionName?: string | null;
}

export interface InvestmentPositionItemData {
  id: string;
  instrumentName: string;
  instrumentSymbol?: string | null;
  instrumentType: string;
  quantity: Decimal | number | string;
  averageCost: Decimal | number | string;
  currentValue: Decimal | number | string;
  acquisitionValue: Decimal | number | string;
  accountId: string;
  financialInstitutionId?: string | null;
  financialInstitutionName?: string | null;
}

export interface ConsolidatedInstitution {
  institutionId: string;
  institutionName: string;
  liquidBalance: Decimal;       // Subtotal de dinheiro/caixa disponível
  investmentBalance: Decimal;   // Subtotal de posições de investimento
  totalBalance: Decimal;        // liquidBalance + investmentBalance
  accounts: AccountItemData[];
  positions: InvestmentPositionItemData[];
}

export class InstitutionConsolidationService {
  /**
   * Consolida posições financeiras agrupando dinamicamente por Instituição Financeira.
   * Regra estrita: O saldo de Account (caixa) e Posições são somados 1 única vez.
   */
  public static consolidateByInstitution(
    accounts: AccountItemData[],
    positions: InvestmentPositionItemData[]
  ): ConsolidatedInstitution[] {
    const map = new Map<string, ConsolidatedInstitution>();

    // 1. Agrupar Contas (Caixa/Liquidez)
    for (const acc of accounts) {
      const instId = acc.financialInstitutionId || "OTHER_INST";
      const instName = acc.financialInstitutionName || "Outras Custódias / Dinheiro";

      if (!map.has(instId)) {
        map.set(instId, {
          institutionId: instId,
          institutionName: instName,
          liquidBalance: new Decimal(0),
          investmentBalance: new Decimal(0),
          totalBalance: new Decimal(0),
          accounts: [],
          positions: [],
        });
      }

      const inst = map.get(instId)!;
      const bal = toDecimal(acc.calculatedBalance);
      inst.liquidBalance = inst.liquidBalance.add(bal);
      inst.accounts.push(acc);
    }

    // 2. Agrupar Posições de Investimento
    for (const pos of positions) {
      const instId = pos.financialInstitutionId || "OTHER_INST";
      const instName = pos.financialInstitutionName || "Outras Custódias / Carteira";

      if (!map.has(instId)) {
        map.set(instId, {
          institutionId: instId,
          institutionName: instName,
          liquidBalance: new Decimal(0),
          investmentBalance: new Decimal(0),
          totalBalance: new Decimal(0),
          accounts: [],
          positions: [],
        });
      }

      const inst = map.get(instId)!;
      const val = toDecimal(pos.currentValue);
      inst.investmentBalance = inst.investmentBalance.add(val);
      inst.positions.push(pos);
    }

    // 3. Somar Total Geral por Instituição
    const result: ConsolidatedInstitution[] = [];
    for (const inst of map.values()) {
      inst.totalBalance = inst.liquidBalance.add(inst.investmentBalance);
      result.push(inst);
    }

    return result.sort((a, b) => b.totalBalance.sub(a.totalBalance).toNumber());
  }
}
