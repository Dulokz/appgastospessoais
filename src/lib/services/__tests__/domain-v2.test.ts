import { NetWorthService, AccountData, AssetData, LiabilityData } from "../net-worth.service";
import { ReconciliationService } from "../reconciliation.service";
import { MonthlyResultService, TransactionSummaryItem } from "../monthly-result.service";

describe("Product V2 Domain & Financial Tests", () => {
  // Teste 1: Gasto simples
  test("1. Gasto simples: BB 10.000 -> Gasto 300 -> BB 9.700, Despesa 300, PL -300", () => {
    const bbBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 10000, active: true };
    const summaryBefore = NetWorthService.calculateSummary([bbBefore], [], []);

    const bbAfter: AccountData = { ...bbBefore, calculatedBalance: 9700 };
    const summaryAfter = NetWorthService.calculateSummary([bbAfter], [], []);

    expect(summaryAfter.liquidAssets.toNumber()).toBe(9700);
    expect(summaryAfter.netWorth.toNumber()).toBe(9700);
    expect(summaryAfter.netWorth.sub(summaryBefore.netWorth).toNumber()).toBe(-300);
  });

  // Teste 2: Receita simples
  test("2. Receita simples: Saldo 9.700 -> Receita 1.000 -> Saldo 10.700, Receita 1.000, PL +1.000", () => {
    const bbBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 9700, active: true };
    const summaryBefore = NetWorthService.calculateSummary([bbBefore], [], []);

    const bbAfter: AccountData = { ...bbBefore, calculatedBalance: 10700 };
    const summaryAfter = NetWorthService.calculateSummary([bbAfter], [], []);

    expect(summaryAfter.liquidAssets.toNumber()).toBe(10700);
    expect(summaryAfter.netWorth.sub(summaryBefore.netWorth).toNumber()).toBe(1000);
  });

  // Teste 3: Transferência
  test("3. Transferência: BB 10.000, Sicredi 5.000 -> Transf 2.000 -> BB 8.000, Sicredi 7.000, PL inalterado", () => {
    const bbBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 10000, active: true };
    const sicrediBefore: AccountData = { id: "sicredi", type: "CHECKING", calculatedBalance: 5000, active: true };
    const summaryBefore = NetWorthService.calculateSummary([bbBefore, sicrediBefore], [], []);

    const bbAfter: AccountData = { ...bbBefore, calculatedBalance: 8000 };
    const sicrediAfter: AccountData = { ...sicrediBefore, calculatedBalance: 7000 };
    const summaryAfter = NetWorthService.calculateSummary([bbAfter, sicrediAfter], [], []);

    expect(summaryAfter.netWorth.toNumber()).toBe(15000);
    expect(summaryAfter.netWorth.sub(summaryBefore.netWorth).toNumber()).toBe(0);

    // Validação DRE: Transferência não entra no resultado do mês
    const txs: TransactionSummaryItem[] = [
      { id: "tx1", type: "TRANSFER", amount: 2000 },
    ];
    const dre = MonthlyResultService.calculateReport(txs);
    expect(dre.totalIncome.toNumber()).toBe(0);
    expect(dre.totalExpenses.toNumber()).toBe(0);
  });

  // Teste 4: Compra de ativo patrimonial
  test("4. Compra de ativo: BB 10.000 -> Compra Computador 3.000 (Ativo) -> BB 7.000, Asset 3.000, PL inalterado", () => {
    const bbBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 10000, active: true };
    const summaryBefore = NetWorthService.calculateSummary([bbBefore], [], []);

    const bbAfter: AccountData = { ...bbBefore, calculatedBalance: 7000 };
    const asset: AssetData = { id: "pc", category: "EQUIPMENT", currentValue: 3000, considerInNetWorth: true, active: true };
    const summaryAfter = NetWorthService.calculateSummary([bbAfter], [asset], []);

    expect(summaryAfter.netWorth.toNumber()).toBe(10000);
    expect(summaryAfter.netWorth.sub(summaryBefore.netWorth).toNumber()).toBe(0);
  });

  // Teste 5: Compra tratada como despesa
  test("5. Compra como gasto: BB 10.000 -> Compra 3.000 (Gasto) -> BB 7.000, Despesa 3.000, PL -3.000", () => {
    const bbBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 10000, active: true };
    const summaryBefore = NetWorthService.calculateSummary([bbBefore], [], []);

    const bbAfter: AccountData = { ...bbBefore, calculatedBalance: 7000 };
    const summaryAfter = NetWorthService.calculateSummary([bbAfter], [], []);

    expect(summaryAfter.netWorth.toNumber()).toBe(7000);
    expect(summaryAfter.netWorth.sub(summaryBefore.netWorth).toNumber()).toBe(-3000);
  });

  // Teste 6: Empréstimo recebido
  test("6. Empréstimo: Entrada 20.000, Passivo 20.000 -> PL inalterado, Receita 0", () => {
    const bbBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 5000, active: true };
    const summaryBefore = NetWorthService.calculateSummary([bbBefore], [], []);

    const bbAfter: AccountData = { ...bbBefore, calculatedBalance: 25000 };
    const liability: LiabilityData = { id: "loan", currentBalance: 20000, active: true };
    const summaryAfter = NetWorthService.calculateSummary([bbAfter], [], [liability]);

    expect(summaryAfter.netWorth.toNumber()).toBe(5000);
    expect(summaryAfter.netWorth.sub(summaryBefore.netWorth).toNumber()).toBe(0);

    // Validação DRE: Empréstimo não entra como receita
    const txs: TransactionSummaryItem[] = [
      { id: "tx1", type: "LOAN_RECEIVED", amount: 20000 },
    ];
    const dre = MonthlyResultService.calculateReport(txs);
    expect(dre.totalIncome.toNumber()).toBe(0);
  });

  // Teste 7: Reconciliação
  test("7. Reconciliação: Saldo calculado 7.980 vs Saldo informado 8.000 -> Diferença 20 sem alterar histórico", () => {
    const res = ReconciliationService.processCheck({
      accountId: "bb",
      calculatedBalance: 7980,
      reportedBalance: 8000,
      notes: "Conferência via app do banco",
    });

    expect(res.difference.toNumber()).toBe(20);
    expect(res.hasDifference).toBe(true);
    expect(res.calculatedBalance.toNumber()).toBe(7980);
    expect(res.reportedBalance.toNumber()).toBe(8000);
  });
});
