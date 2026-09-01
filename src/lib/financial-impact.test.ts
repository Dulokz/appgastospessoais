import { FinancialImpactRules as R } from "./financial-impact";

describe("regras patrimoniais centrais", () => {
  test("compra de consumo no cartão reconhece despesa e aumenta passivo sem mexer no caixa", () => {
    expect(R.creditCardExpense(1000)).toEqual({
      cash: 0,
      financialAssets: 0,
      physicalAssets: 0,
      liabilities: 1000,
      monthIncome: 0,
      monthExpense: 1000,
      netWorth: -1000,
    });
  });

  test("compra de bem patrimonial no cartão troca origem de financiamento por ativo sem alterar PL", () => {
    expect(R.creditCardAssetPurchase(2000)).toEqual({
      cash: 0,
      financialAssets: 0,
      physicalAssets: 2000,
      liabilities: 2000,
      monthIncome: 0,
      monthExpense: 0,
      netWorth: 0,
    });
  });

  test("fechamento da fatura não gera nova despesa", () => {
    expect(R.creditCardInvoiceClose()).toEqual({
      cash: 0,
      financialAssets: 0,
      physicalAssets: 0,
      liabilities: 0,
      monthIncome: 0,
      monthExpense: 0,
      netWorth: 0,
    });
  });

  test("pagamento da fatura reduz caixa e passivo sem nova despesa nem impacto no PL", () => {
    expect(R.creditCardPayment(1000)).toEqual({
      cash: -1000,
      financialAssets: 0,
      physicalAssets: 0,
      liabilities: -1000,
      monthIncome: 0,
      monthExpense: 0,
      netWorth: 0,
    });
  });

  test("compra de bem à vista reduz caixa e aumenta ativo em igual valor", () => {
    expect(R.cashAssetPurchase(2000).netWorth).toBe(0);
    expect(R.cashAssetPurchase(2000).cash).toBe(-2000);
    expect(R.cashAssetPurchase(2000).physicalAssets).toBe(2000);
  });

  test("amortização só reduz PL pelos juros", () => {
    expect(R.liabilityAmortization(900, 300)).toEqual({
      cash: -1200,
      financialAssets: 0,
      physicalAssets: 0,
      liabilities: -900,
      monthIncome: 0,
      monthExpense: 300,
      netWorth: -300,
    });
  });
});
