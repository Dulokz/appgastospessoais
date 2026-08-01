import { NetWorthService, AccountData, AssetData, LiabilityData } from "../net-worth.service";
import { TransactionService, AllocationInput } from "../transaction.service";
import { VariationService } from "../variation.service";
import { Decimal } from "../../decimal";

describe("Domain Rules & Financial Calculations", () => {
  // Teste 1: Transferência entre Contas Próprias
  test("Transfer: BB -R$5.000, Sicredi +R$5.000 -> Patrimônio: 0, Receita: 0, Despesa: 0", () => {
    const bbBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 10000, active: true };
    const sicrediBefore: AccountData = { id: "sicredi", type: "CHECKING", calculatedBalance: 2000, active: true };

    const initialSummary = NetWorthService.calculateSummary([bbBefore, sicrediBefore], [], []);
    expect(initialSummary.netWorth.toNumber()).toBe(12000);

    // Efeito da transferência
    const bbAfter: AccountData = { ...bbBefore, calculatedBalance: 5000 };
    const sicrediAfter: AccountData = { ...sicrediBefore, calculatedBalance: 7000 };

    const finalSummary = NetWorthService.calculateSummary([bbAfter, sicrediAfter], [], []);

    expect(finalSummary.netWorth.toNumber()).toBe(12000);
    expect(finalSummary.netWorth.sub(initialSummary.netWorth).toNumber()).toBe(0);
  });

  // Teste 2: Despesa de Consumo
  test("Expense: Supermercado -R$500 -> Disponível -500, Patrimônio -500, Despesa: 500", () => {
    const accountBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 5000, active: true };
    const initialSummary = NetWorthService.calculateSummary([accountBefore], [], []);

    const accountAfter: AccountData = { ...accountBefore, calculatedBalance: 4500 };
    const finalSummary = NetWorthService.calculateSummary([accountAfter], [], []);

    expect(finalSummary.liquidAssets.toNumber()).toBe(4500);
    expect(finalSummary.netWorth.toNumber()).toBe(4500);
    expect(finalSummary.netWorth.sub(initialSummary.netWorth).toNumber()).toBe(-500);
  });

  // Teste 3: Receita
  test("Income: Recebimento +R$1.000 -> Disponível +1000, Patrimônio +1000", () => {
    const accountBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 5000, active: true };
    const initialSummary = NetWorthService.calculateSummary([accountBefore], [], []);

    const accountAfter: AccountData = { ...accountBefore, calculatedBalance: 6000 };
    const finalSummary = NetWorthService.calculateSummary([accountAfter], [], []);

    expect(finalSummary.liquidAssets.toNumber()).toBe(6000);
    expect(finalSummary.netWorth.toNumber()).toBe(6000);
    expect(finalSummary.netWorth.sub(initialSummary.netWorth).toNumber()).toBe(1000);
  });

  // Teste 4: Pagamento de Financiamento (Split Allocation)
  test("Loan Payment: Saída R$1.200, Allocations (800 REDUCTION, 350 INTEREST, 50 FEE) -> Conta -1200, Passivo -800, Despesa 400, Impacto Patrimonial -400", () => {
    const accountBefore: AccountData = { id: "cef", type: "CHECKING", calculatedBalance: 10000, active: true };
    const liabilityBefore: LiabilityData = { id: "mortgage", currentBalance: 100000, active: true };

    const initialSummary = NetWorthService.calculateSummary([accountBefore], [], [liabilityBefore]);
    expect(initialSummary.netWorth.toNumber()).toBe(-90000); // 10000 - 100000 = -90000

    // Allocations desmembradas
    const allocations: AllocationInput[] = [
      { allocationType: "LIABILITY_REDUCTION", amount: 800, liabilityId: "mortgage" },
      { allocationType: "INTEREST", amount: 350 },
      { allocationType: "FEE", amount: 50 },
    ];

    // Validação da soma das allocations
    expect(() => TransactionService.validateAllocations(1200, allocations)).not.toThrow();

    // Efeitos do pagamento
    const accountAfter: AccountData = { ...accountBefore, calculatedBalance: 8800 }; // -1200
    const liabilityAfter: LiabilityData = { ...liabilityBefore, currentBalance: 99200 }; // -800

    const finalSummary = NetWorthService.calculateSummary([accountAfter], [], [liabilityAfter]);

    expect(finalSummary.netWorth.toNumber()).toBe(-90400); // 8800 - 99200 = -90400
    expect(finalSummary.netWorth.sub(initialSummary.netWorth).toNumber()).toBe(-400); // Impacto líquido patrimonial = -400
  });

  // Teste 5: Compra de Ativo à Vista
  test("Asset Purchase: Conta -R$50.000, Novo Ativo +R$50.000 -> Resultado Patrimonial Inicial: R$0", () => {
    const accountBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 60000, active: true };
    const initialSummary = NetWorthService.calculateSummary([accountBefore], [], []);
    expect(initialSummary.netWorth.toNumber()).toBe(60000);

    const accountAfter: AccountData = { ...accountBefore, calculatedBalance: 10000 };
    const newAsset: AssetData = { id: "car", category: "VEHICLE", currentValue: 50000, considerInNetWorth: true, active: true };

    const finalSummary = NetWorthService.calculateSummary([accountAfter], [newAsset], []);

    expect(finalSummary.netWorth.toNumber()).toBe(60000);
    expect(finalSummary.netWorth.sub(initialSummary.netWorth).toNumber()).toBe(0);
  });

  // Teste 6: Empréstimo Recebido
  test("Loan Received: Conta +R$20.000, Passivo +R$20.000 -> Impacto Patrimonial: R$0", () => {
    const accountBefore: AccountData = { id: "bb", type: "CHECKING", calculatedBalance: 5000, active: true };
    const initialSummary = NetWorthService.calculateSummary([accountBefore], [], []);

    const accountAfter: AccountData = { ...accountBefore, calculatedBalance: 25000 };
    const newLiability: LiabilityData = { id: "loan", currentBalance: 20000, active: true };

    const finalSummary = NetWorthService.calculateSummary([accountAfter], [], [newLiability]);

    expect(finalSummary.netWorth.toNumber()).toBe(5000);
    expect(finalSummary.netWorth.sub(initialSummary.netWorth).toNumber()).toBe(0);
  });
});
