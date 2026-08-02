import { Decimal, toDecimal } from "../decimal";
import { INSTRUMENT_TYPE_LABELS } from "../translations";
import { InvestmentPositionItemData } from "./institution-consolidation.service";

export interface AssetClassSummary {
  type: string;
  typeLabel: string;
  totalValue: Decimal;
  percentage: number;
}

export class AssetClassService {
  /**
   * Agrupa posições de investimento por classe de ativo via InstrumentType.
   */
  public static consolidateByClass(
    positions: InvestmentPositionItemData[],
    liquidBalance: Decimal | number | string
  ): AssetClassSummary[] {
    const map = new Map<string, Decimal>();

    // 1. Incluir Dinheiro Líquido como Classe
    const liquid = toDecimal(liquidBalance);
    if (!liquid.isZero()) {
      map.set("CASH_LIQUID", liquid);
    }

    // 2. Agrupar Posições por tipo de instrumento
    let totalInvested = liquid;

    for (const pos of positions) {
      const type = pos.instrumentType || "OTHER";
      const val = toDecimal(pos.currentValue);

      map.set(type, (map.get(type) || new Decimal(0)).add(val));
      totalInvested = totalInvested.add(val);
    }

    if (totalInvested.isZero()) return [];

    const summaries: AssetClassSummary[] = [];

    for (const [type, total] of map.entries()) {
      const label = type === "CASH_LIQUID" ? "Dinheiro / Liquidez" : INSTRUMENT_TYPE_LABELS[type] || type;
      const percentage = total.div(totalInvested).mul(100).toNumber();

      summaries.push({
        type,
        typeLabel: label,
        totalValue: total,
        percentage,
      });
    }

    return summaries.sort((a, b) => b.totalValue.sub(a.totalValue).toNumber());
  }
}
