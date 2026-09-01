export type FinancialImpact = {
  cash: number;
  financialAssets: number;
  physicalAssets: number;
  liabilities: number;
  monthIncome: number;
  monthExpense: number;
  netWorth: number;
};

const zero = (): FinancialImpact => ({
  cash: 0,
  financialAssets: 0,
  physicalAssets: 0,
  liabilities: 0,
  monthIncome: 0,
  monthExpense: 0,
  netWorth: 0,
});

/**
 * Contrato conceitual do sistema.
 * Estes efeitos servem como regra de negócio antes da persistência no banco.
 * Fatura de cartão é agrupamento/fechamento: não deve reconhecer despesa novamente.
 */
export const FinancialImpactRules = {
  cashExpense(amount: number): FinancialImpact {
    return { ...zero(), cash: -amount, monthExpense: amount, netWorth: -amount };
  },

  cashAssetPurchase(amount: number): FinancialImpact {
    return { ...zero(), cash: -amount, physicalAssets: amount, netWorth: 0 };
  },

  creditCardExpense(amount: number): FinancialImpact {
    return { ...zero(), liabilities: amount, monthExpense: amount, netWorth: -amount };
  },

  creditCardAssetPurchase(amount: number): FinancialImpact {
    return { ...zero(), physicalAssets: amount, liabilities: amount, netWorth: 0 };
  },

  creditCardInvoiceClose(): FinancialImpact {
    return zero();
  },

  creditCardPayment(amount: number): FinancialImpact {
    return { ...zero(), cash: -amount, liabilities: -amount, netWorth: 0 };
  },

  loanReceived(amount: number): FinancialImpact {
    return { ...zero(), cash: amount, liabilities: amount, netWorth: 0 };
  },

  liabilityAmortization(amortization: number, interest: number): FinancialImpact {
    return {
      ...zero(),
      cash: -(amortization + interest),
      liabilities: -amortization,
      monthExpense: interest,
      netWorth: -interest,
    };
  },

  initialLiabilityCorrection(amount: number): FinancialImpact {
    return { ...zero(), liabilities: amount, netWorth: -amount };
  },

  initialAssetCorrection(amount: number): FinancialImpact {
    return { ...zero(), physicalAssets: amount, netWorth: amount };
  },
};
