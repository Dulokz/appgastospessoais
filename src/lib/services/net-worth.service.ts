import { Decimal, toDecimal } from "../decimal";

export interface AccountData {
  id: string;
  type: "CHECKING" | "SAVINGS" | "CASH" | "BROKERAGE" | "INVESTMENT" | "OTHER";
  calculatedBalance: Decimal | number | string;
  confirmedBalance?: Decimal | number | string | null;
  active: boolean;
}

export interface AssetData {
  id: string;
  category: "REAL_ESTATE" | "VEHICLE" | "EQUIPMENT" | "CORPORATE_SHARE" | "FINANCIAL_TICKER" | "FIXED_INCOME" | "FUNDS" | "OTHER";
  currentValue: Decimal | number | string;
  considerInNetWorth: boolean;
  active: boolean;
}

export interface LiabilityData {
  id: string;
  currentBalance: Decimal | number | string;
  active: boolean;
}

export interface NetWorthSummary {
  liquidAssets: Decimal;      // Dinheiro disponível em contas bancárias/caixa (CHECKING, SAVINGS, CASH)
  investmentAssets: Decimal;  // Posições financeiras (Ações, Tesouro, CDBs) + saldo em corretora
  physicalAssets: Decimal;    // Bens físicos (Imóveis, Veículos, Equipamentos, Participações)
  totalAssets: Decimal;       // Soma total dos ativos
  totalLiabilities: Decimal;  // Soma total dos passivos/dívidas
  netWorth: Decimal;          // Total Ativos - Total Passivos
  liquidNetWorth: Decimal;    // (Disponível + Investimentos) - Passivos
}

export class NetWorthService {
  public static calculateSummary(
    accounts: AccountData[],
    assets: AssetData[],
    liabilities: LiabilityData[]
  ): NetWorthSummary {
    let liquidAssets = new Decimal(0);
    let investmentAssets = new Decimal(0);
    let physicalAssets = new Decimal(0);
    let totalLiabilities = new Decimal(0);

    // 1. Processar Contas (Custódia)
    for (const acc of accounts) {
      if (!acc.active) continue;
      const balance = toDecimal(acc.calculatedBalance);

      if (acc.type === "CHECKING" || acc.type === "SAVINGS" || acc.type === "CASH") {
        liquidAssets = liquidAssets.add(balance);
      } else if (acc.type === "BROKERAGE" || acc.type === "INVESTMENT") {
        // Caixa líquido retido na corretora é contabilizado como liquidez para investimentos
        investmentAssets = investmentAssets.add(balance);
      } else {
        liquidAssets = liquidAssets.add(balance);
      }
    }

    // 2. Processar Ativos (Posições de Investimento e Bens Físicos)
    for (const asset of assets) {
      if (!asset.active || !asset.considerInNetWorth) continue;
      const val = toDecimal(asset.currentValue);

      if (
        asset.category === "FINANCIAL_TICKER" ||
        asset.category === "FIXED_INCOME" ||
        asset.category === "FUNDS"
      ) {
        investmentAssets = investmentAssets.add(val);
      } else {
        physicalAssets = physicalAssets.add(val);
      }
    }

    // 3. Processar Passivos (Dívidas)
    for (const liab of liabilities) {
      if (!liab.active) continue;
      totalLiabilities = totalLiabilities.add(toDecimal(liab.currentBalance));
    }

    // 4. Consolidação
    const totalAssets = liquidAssets.add(investmentAssets).add(physicalAssets);
    const netWorth = totalAssets.sub(totalLiabilities);
    const liquidNetWorth = liquidAssets.add(investmentAssets).sub(totalLiabilities);

    return {
      liquidAssets,
      investmentAssets,
      physicalAssets,
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidNetWorth,
    };
  }
}
