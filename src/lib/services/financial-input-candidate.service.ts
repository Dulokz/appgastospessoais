import { Decimal, toDecimal } from "@/lib/decimal";

export type FinancialChannelSource =
  | "MANUAL"
  | "INITIAL_POSITION"
  | "IMPORT_OFX"
  | "IMPORT_CSV"
  | "IMPORT_PDF"
  | "OPEN_FINANCE"
  | "WHATSAPP_AI"
  | "OTHER";

export interface FinancialInputCandidate {
  id: string;
  source: FinancialChannelSource;
  externalId?: string;
  rawInputText?: string;
  intentType:
    | "EXPENSE"
    | "INCOME"
    | "TRANSFER"
    | "INVESTMENT_CONTRIBUTION"
    | "ASSET_PURCHASE"
    | "LIABILITY_PAYMENT";
  amount: Decimal;
  date: Date;
  description: string;
  suggestedAccountName?: string;
  suggestedCategoryName?: string;
  confidenceScore?: number; // Ex: 0.95 para NLP/WhatsApp, 1.0 para OFX
  metadata?: Record<string, any>;
}

export class FinancialInputCandidateService {
  /**
   * Normaliza uma intenção bruta vinda de um canal externo (WhatsApp, OFX, Open Finance)
   * em um objeto padronizado FinancialInputCandidate pronto para revisão ou envio ao FinancialCommandService.
   */
  public static createCandidate(raw: {
    source: FinancialChannelSource;
    intentType: FinancialInputCandidate["intentType"];
    amount: number | string | Decimal;
    description: string;
    date?: Date | string;
    externalId?: string;
    rawInputText?: string;
    suggestedAccountName?: string;
    suggestedCategoryName?: string;
    confidenceScore?: number;
  }): FinancialInputCandidate {
    return {
      id: raw.externalId || `cand_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      source: raw.source,
      externalId: raw.externalId,
      rawInputText: raw.rawInputText,
      intentType: raw.intentType,
      amount: toDecimal(raw.amount),
      date: raw.date ? new Date(raw.date) : new Date(),
      description: raw.description.trim(),
      suggestedAccountName: raw.suggestedAccountName?.trim(),
      suggestedCategoryName: raw.suggestedCategoryName?.trim(),
      confidenceScore: raw.confidenceScore ?? 1.0,
    };
  }
}
