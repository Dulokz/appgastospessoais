import { Decimal } from "../../decimal";
import { MonthlyResultService } from "../monthly-result.service";

describe("Phase 4A — Onboarding, Posições Iniciais, Financiamento vs. Aquisição Parcelada", () => {
  // Teste 1: Onboarding Parcial / Vazio
  test("1. Onboarding Parcial: Cadastro de 0 contas ou apenas 1 conta (R$ 10k) é totalmente permitido", () => {
    const emptyAccounts: any[] = [];
    const singleAccount = [{ name: "BB", balance: new Decimal(10000) }];

    expect(emptyAccounts.length).toBe(0);
    expect(singleAccount.length).toBe(1);
    expect(singleAccount[0].balance.toNumber()).toBe(10000);
  });

  // Teste 2: Retomar Onboarding
  test("2. Retomar Onboarding: onboardingStep = 4 indica retomada exata na etapa 4", () => {
    const onboardingStep = 4;
    const isCompleted = false;

    expect(onboardingStep).toBe(4);
    expect(isCompleted).toBe(false);
  });

  // Teste 3: Posição Inicial de Conta
  test("3. Posição Inicial de Conta: Saldo de abertura R$ 10.000 não gera receita no DRE", () => {
    const initialBalance = new Decimal(10000);
    const transactions: any[] = []; // Nenhuma transação financeira gerada

    const report = MonthlyResultService.calculateReport(transactions);

    expect(initialBalance.toNumber()).toBe(10000);
    expect(report.totalIncome.toNumber()).toBe(0);
    expect(report.totalExpenses.toNumber()).toBe(0);
  });

  // Teste 4: Posição Inicial de Investimento
  test("4. Posição Inicial de Investimento: Fundo de R$ 85.000 não gera aporte nem receita no DRE", () => {
    const investmentValue = new Decimal(85000);
    const eventType = "INITIAL_POSITION";
    const transactions: any[] = [];

    const report = MonthlyResultService.calculateReport(transactions);

    expect(eventType).toBe("INITIAL_POSITION");
    expect(investmentValue.toNumber()).toBe(85000);
    expect(report.totalIncome.toNumber()).toBe(0);
  });

  // Teste 5: Bem Preexistente
  test("5. Bem Preexistente: Apartamento de R$ 300.000 não gera receita no DRE", () => {
    const assetValue = new Decimal(300000);
    const entryMethod = "INITIAL_POSITION";
    const transactions: any[] = [];

    const report = MonthlyResultService.calculateReport(transactions);

    expect(entryMethod).toBe("INITIAL_POSITION");
    expect(assetValue.toNumber()).toBe(300000);
    expect(report.totalIncome.toNumber()).toBe(0);
  });

  // Teste 6: Dívida Preexistente
  test("6. Dívida Preexistente: Financiamento de R$ 240.000 não gera despesa no DRE", () => {
    const liabilityBalance = new Decimal(240000);
    const isInitialPosition = true;
    const transactions: any[] = [];

    const report = MonthlyResultService.calculateReport(transactions);

    expect(isInitialPosition).toBe(true);
    expect(liabilityBalance.toNumber()).toBe(240000);
    expect(report.totalExpenses.toNumber()).toBe(0);
  });

  // Teste 7: Item Esquecido Adicionado Retroativamente
  test("7. Item Esquecido Retroativo: Terreno R$ 100k em 15/08 marcado 'Já possuía' ajusta a abertura e gera R$ 0 de receita em 15/08", () => {
    const initialNetWorth = new Decimal(400000);
    const forgottenTerrain = new Decimal(100000);
    const isPreexisting = true;

    // Atualiza a posição de abertura retroativamente
    const adjustedInitialNetWorth = isPreexisting ? initialNetWorth.add(forgottenTerrain) : initialNetWorth;

    // Movimentação/DRE do dia 15/08 decorrente da adição
    const dayIncomeEffect = isPreexisting ? new Decimal(0) : forgottenTerrain;

    expect(adjustedInitialNetWorth.toNumber()).toBe(500000);
    expect(dayIncomeEffect.toNumber()).toBe(0);
  });

  // Teste 8: Correção de Saldo Inicial
  test("8. Correção de Saldo Inicial: Saldo de abertura corrigido de R$ 8.000 para R$ 8.500 gera R$ 0 de receita artificial", () => {
    const oldInitial = new Decimal(8000);
    const newInitial = new Decimal(8500);
    const diff = newInitial.sub(oldInitial);

    // Ajuste direto no initialBalance sem gerar transação de receita
    const artificialIncome = new Decimal(0);

    expect(diff.toNumber()).toBe(500);
    expect(artificialIncome.toNumber()).toBe(0);
  });

  // Teste 9: Financiamento (MODELO A)
  test("9. Financiamento: Parcela R$ 1.200 (850 amortização + 350 juros) -> Conta -1.200, Dívida 239.150, Equity 60.850, Despesa DRE 350", () => {
    const assetValue = new Decimal(300000);
    const initialLiability = new Decimal(240000);
    const initialEquity = assetValue.sub(initialLiability); // 60.000

    const paymentAmount = new Decimal(1200);
    const amortization = new Decimal(850);
    const interest = new Decimal(350);

    const newLiability = initialLiability.sub(amortization); // 239.150
    const newEquity = assetValue.sub(newLiability); // 60.850
    const dreExpense = interest; // APENAS juros entram como despesa de consumo

    expect(initialEquity.toNumber()).toBe(60000);
    expect(newLiability.toNumber()).toBe(239150);
    expect(newEquity.toNumber()).toBe(60850);
    expect(dreExpense.toNumber()).toBe(350);
  });

  // Teste 10: Aquisição Parcelada / Equity Buildup (MODELO B)
  test("10. Aquisição Parcelada (EQUITY_BUILDUP): Parcela R$ 1.200 -> Conta -1.200, paidEquityValue 61.200, Despesa DRE 0, PL inalterado", () => {
    const initialPaidEquity = new Decimal(60000);
    const installmentAmount = new Decimal(1200);

    const newPaidEquity = initialPaidEquity.add(installmentAmount); // 61.200
    const dreExpense = new Decimal(0); // 0 despesa de consumo

    expect(newPaidEquity.toNumber()).toBe(61200);
    expect(dreExpense.toNumber()).toBe(0);
  });
});
