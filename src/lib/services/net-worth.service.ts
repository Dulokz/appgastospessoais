import { Decimal, toDecimal } from "../decimal";

export interface AccountData {
  id: string;
  type: "CHECKING" | "SAVINGS" | "CASH" | "BROKERAGE" | "INVESTMENT" | "CREDIT_CARD" | "OTHER";
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
  liquidAssets: Decimal;
  investmentAssets: Decimal;
  physicalAssets: Decimal;
  totalAssets: Decimal;
  totalLiabilities: Decimal;
  netWorth: Decimal;
  liquidNetWorth: Decimal;
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

    for (const acc of accounts) {
      if (!acc.active) continue;
      const balance = toDecimal(acc.calculatedBalance);

      // Cartão é conta passiva: compras deixam o saldo negativo; pagamento aproxima de zero.
      if (acc.type === "CREDIT_CARD") {
        if (balance.lt(0)) totalLiabilities = totalLiabilities.add(balance.abs());
        else if (balance.gt(0)) liquidAssets = liquidAssets.add(balance); // crédito/estorno excedente
        continue;
      }

      // Conta bancária negativa também é passivo (cheque especial), não "ativo negativo".
      if (balance.lt(0)) {
        totalLiabilities = totalLiabilities.add(balance.abs());
        continue;
      }

      if (acc.type === "CHECKING" || acc.type === "SAVINGS" || acc.type === "CASH" || acc.type === "OTHER") {
        liquidAssets = liquidAssets.add(balance);
      } else if (acc.type === "BROKERAGE" || acc.type === "INVESTMENT") {
        investmentAssets = investmentAssets.add(balance);
      }
    }

    for (const asset of assets) {
      if (!asset.active || !asset.considerInNetWorth) continue;
      const value = toDecimal(asset.currentValue);

      if (asset.category === "FINANCIAL_TICKER" || asset.category === "FIXED_INCOME" || asset.category === "FUNDS") {
        investmentAssets = investmentAssets.add(value);
      } else {
        physicalAssets = physicalAssets.add(value);
      }
    }

    for (const liability of liabilities) {
      if (!liability.active) continue;
      totalLiabilities = totalLiabilities.add(toDecimal(liability.currentBalance));
    }

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
