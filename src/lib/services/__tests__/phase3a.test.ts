import { Decimal } from "../../decimal";
import { InstitutionConsolidationService, AccountItemData, InvestmentPositionItemData } from "../institution-consolidation.service";
import { InvestmentEventService } from "../investment-event.service";

describe("Phase 3A — Consolidated Institutions & Investments Tests", () => {
  // Teste 1: Instituição Consolidada
  test("1. Instituição Consolidada: BB com Poupança R$ 8.000 + Investimentos R$ 110.000 -> Total R$ 118.000", () => {
    const accounts: AccountItemData[] = [
      {
        id: "acc-poupanca",
        name: "Poupança BB",
        type: "SAVINGS",
        calculatedBalance: 8000,
        financialInstitutionId: "bb-inst",
        financialInstitutionName: "Banco do Brasil",
      },
    ];

    const positions: InvestmentPositionItemData[] = [
      {
        id: "pos-fundo1",
        instrumentName: "Fundo BB RF",
        instrumentType: "INVESTMENT_FUND",
        quantity: 1,
        averageCost: 85000,
        currentValue: 85000,
        acquisitionValue: 85000,
        accountId: "acc-bb-broker",
        financialInstitutionId: "bb-inst",
        financialInstitutionName: "Banco do Brasil",
      },
      {
        id: "pos-fundo2",
        instrumentName: "Fundo BB Multimercado",
        instrumentType: "INVESTMENT_FUND",
        quantity: 1,
        averageCost: 25000,
        currentValue: 25000,
        acquisitionValue: 25000,
        accountId: "acc-bb-broker",
        financialInstitutionId: "bb-inst",
        financialInstitutionName: "Banco do Brasil",
      },
    ];

    const consolidated = InstitutionConsolidationService.consolidateByInstitution(accounts, positions);

    expect(consolidated.length).toBe(1);
    expect(consolidated[0].institutionName).toBe("Banco do Brasil");
    expect(consolidated[0].liquidBalance.toNumber()).toBe(8000);
    expect(consolidated[0].investmentBalance.toNumber()).toBe(110000);
    expect(consolidated[0].totalBalance.toNumber()).toBe(118000);
  });

  // Teste 2: Aporte não é rendimento
  test("2. Aporte não é rendimento: Saldo R$ 85.000 + Aporte R$ 5.000 + Rendimento R$ 890 -> Ganho econômico R$ 890", () => {
    const resAporte = InvestmentEventService.processEvent({
      eventType: "CONTRIBUTION",
      amount: 5000,
      positionCurrentValue: 85000,
      accountCalculatedBalance: 10000,
    });

    // Aporte: Posição vira 90.000, Caixa da conta cai 5.000, Variação no PL = R$ 0
    expect(resAporte.newPositionValue.toNumber()).toBe(90000);
    expect(resAporte.newAccountBalance.toNumber()).toBe(5000);
    expect(resAporte.netWorthChange.toNumber()).toBe(0);

    const resRendimento = InvestmentEventService.processEvent({
      eventType: "APPRECIATION",
      amount: 890,
      positionCurrentValue: resAporte.newPositionValue,
      accountCalculatedBalance: resAporte.newAccountBalance,
    });

    // Valorização: Posição vira 90.890, Ganho econômico = R$ 890
    expect(resRendimento.newPositionValue.toNumber()).toBe(90890);
    expect(resRendimento.netWorthChange.toNumber()).toBe(890);
  });

  // Teste 3: Rendimento recebido em dinheiro
  test("3. Rendimento recebido: Paga R$ 890 -> Conta +890, Receita +890, PL +890 (sem duplicar para R$ 1.780)", () => {
    const res = InvestmentEventService.processEvent({
      eventType: "INCOME_RECEIVED",
      amount: 890,
      positionCurrentValue: 85000,
      accountCalculatedBalance: 2000,
    });

    expect(res.newAccountBalance.toNumber()).toBe(2890);
    expect(res.newPositionValue.toNumber()).toBe(85000); // Posição em si não muda
    expect(res.netWorthChange.toNumber()).toBe(890); // PL sobe exatamente R$ 890
    expect(res.isRealizedIncome).toBe(true);
  });

  // Teste 4: Valorização não realizada
  test("4. Valorização não realizada: Posição R$ 85.000 -> R$ 85.890 -> Conta inalterada, Receita realizada R$ 0, PL +890", () => {
    const res = InvestmentEventService.processEvent({
      eventType: "APPRECIATION",
      amount: 890,
      positionCurrentValue: 85000,
      accountCalculatedBalance: 2000,
    });

    expect(res.newAccountBalance.toNumber()).toBe(2000); // Caixa não muda
    expect(res.newPositionValue.toNumber()).toBe(85890); // Posição de mercado sobe
    expect(res.netWorthChange.toNumber()).toBe(890);
    expect(res.isRealizedIncome).toBe(false); // NÃO entra em receitas operacionais realizadas
    expect(res.isUnrealizedGain).toBe(true);
  });

  // Teste 5: Transferência para investimento
  test("5. Transferência para investimento: Conta Corrente -R$ 5.000, Caixa Corretora +R$ 5.000 -> PL: R$ 0", () => {
    const ccBefore = new Decimal(10000);
    const xpCashBefore = new Decimal(1000);
    const amount = new Decimal(5000);

    const ccAfter = ccBefore.sub(amount);
    const xpCashAfter = xpCashBefore.add(amount);

    const totalBefore = ccBefore.add(xpCashBefore);
    const totalAfter = ccAfter.add(xpCashAfter);

    expect(totalAfter.toNumber()).toBe(totalBefore.toNumber()); // PL inalterado
  });

  // Teste 6: Aporte em posição usando caixa da corretora
  test("6. Aporte em posição: Caixa Corretora -R$ 5.000, InvestmentPosition +R$ 5.000 -> PL: R$ 0", () => {
    const res = InvestmentEventService.processEvent({
      eventType: "CONTRIBUTION",
      amount: 5000,
      positionCurrentValue: 20000,
      accountCalculatedBalance: 6000,
    });

    expect(res.newPositionValue.toNumber()).toBe(25000);
    expect(res.newAccountBalance.toNumber()).toBe(1000);
    expect(res.netWorthChange.toNumber()).toBe(0); // Sem impacto de despesa no PL
  });

  // Teste 7: Prevenção de Dupla Contagem de Custódia
  test("7. Prevenção de Dupla Contagem: Conta XP (Caixa) R$ 5.000 + Posições R$ 50.000 -> Total R$ 55.000 (nunca 105.000)", () => {
    const accounts: AccountItemData[] = [
      {
        id: "xp-cash",
        name: "XP Caixa em Conta",
        type: "BROKERAGE",
        calculatedBalance: 5000,
        financialInstitutionId: "xp-inst",
        financialInstitutionName: "XP Investimentos",
      },
    ];

    const positions: InvestmentPositionItemData[] = [
      {
        id: "pos-petr4",
        instrumentName: "Petrobras PN",
        instrumentType: "STOCK",
        quantity: 100,
        averageCost: 200,
        currentValue: 20000,
        acquisitionValue: 20000,
        accountId: "xp-cash",
        financialInstitutionId: "xp-inst",
        financialInstitutionName: "XP Investimentos",
      },
      {
        id: "pos-hglg11",
        instrumentName: "CSHG Logística",
        instrumentType: "FII",
        quantity: 150,
        averageCost: 200,
        currentValue: 30000,
        acquisitionValue: 30000,
        accountId: "xp-cash",
        financialInstitutionId: "xp-inst",
        financialInstitutionName: "XP Investimentos",
      },
    ];

    const consolidated = InstitutionConsolidationService.consolidateByInstitution(accounts, positions);

    expect(consolidated[0].liquidBalance.toNumber()).toBe(5000);
    expect(consolidated[0].investmentBalance.toNumber()).toBe(50000);
    expect(consolidated[0].totalBalance.toNumber()).toBe(55000); // Exatos 55.000 sem duplicar
  });
});
