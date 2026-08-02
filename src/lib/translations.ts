export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro / Carteira",
  BROKERAGE: "Corretora",
  INVESTMENT: "Conta de investimento",
  OTHER: "Outra conta",
};

export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  REAL_ESTATE: "Imóvel",
  VEHICLE: "Veículo",
  EQUIPMENT: "Equipamento / Eletrônico",
  CORPORATE_SHARE: "Participação societária",
  COOPERATIVE_CAPITAL: "Cota Capital (Sicoob, Sicredi, etc.)",
  INTANGIBLE: "Intangível / Direitos / Patentes",
  FINANCIAL_TICKER: "Ativo negociado",
  FIXED_INCOME: "Renda fixa",
  FUNDS: "Fundo de investimento",
  OTHER: "Outro bem",
};

export const LIABILITY_TYPE_LABELS: Record<string, string> = {
  MORTGAGE: "Financiamento Imobiliário",
  VEHICLE_LOAN: "Financiamento Veicular",
  PERSONAL_LOAN: "Empréstimo Pessoal",
  INSTALLMENT: "Parcelamento",
  CREDIT_CARD: "Cartão de Crédito",
  OTHER: "Outra dívida",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência neutra",
  INVESTMENT_CONTRIBUTION: "Aporte em investimento",
  INVESTMENT_WITHDRAWAL: "Resgate de investimento",
  ASSET_PURCHASE: "Compra de patrimônio",
  ASSET_SALE: "Venda de patrimônio",
  LIABILITY_PAYMENT: "Pagamento de dívida",
  LOAN_RECEIVED: "Empréstimo recebido",
  REFUND: "Reembolso",
  INTEREST_INCOME: "Juros recebidos",
  INTEREST_EXPENSE: "Despesa com juros",
  FEE: "Tarifa bancária",
  OTHER: "Outra movimentação",
};

export const ALLOCATION_TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Despesa de consumo",
  INCOME: "Receita operacional",
  ASSET_INCREASE: "Incremento de ativo",
  ASSET_DECREASE: "Redução de ativo",
  LIABILITY_INCREASE: "Aumento de dívida",
  LIABILITY_REDUCTION: "Amortização de dívida",
  TRANSFER: "Transferência interna",
  INVESTMENT: "Aplicação em investimento",
  INTEREST: "Juros",
  FEE: "Tarifa / Seguro",
};

export const INSTRUMENT_TYPE_LABELS: Record<string, string> = {
  STOCK: "Ação",
  FII: "Fundo Imobiliário (FII)",
  BDR: "BDR",
  ETF: "ETF",
  TREASURY_BOND: "Título Público (Tesouro)",
  INVESTMENT_FUND: "Fundo de Investimento",
  FIXED_INCOME: "Renda Fixa (CDB/LCI/LCA)",
  CRYPTO: "Criptoativo",
  OTHER: "Outro investimento",
};
