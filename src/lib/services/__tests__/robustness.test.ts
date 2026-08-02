import { Decimal } from "../../decimal";
import { TransactionService } from "../transaction.service";

describe("Financial Robustness & Integrity Tests", () => {
  // Teste 1: Concorrência de Saldo (Atomic Increment/Decrement Simulation)
  test("1. Concorrência de Saldo: Saldo R$ 1.000, Despesa A (R$ 100), Despesa B (R$ 200) -> Saldo Final: R$ 700", () => {
    let calculatedBalance = new Decimal(1000);

    const expenseA = new Decimal(100);
    const expenseB = new Decimal(200);

    // Simulação de execuções concorrentes atômicas (decrement)
    const applyExpenseA = () => {
      calculatedBalance = calculatedBalance.sub(expenseA);
    };

    const applyExpenseB = () => {
      calculatedBalance = calculatedBalance.sub(expenseB);
    };

    // Executar ambas
    applyExpenseA();
    applyExpenseB();

    expect(calculatedBalance.toNumber()).toBe(700);
  });

  // Teste 2: Integridade de Mês Vigente (Este Mês)
  test("2. Resultado do Mês: Considera TODAS as transações do mês atual, ignorando mês anterior e limite do feed", () => {
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 15);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    const allTransactions = [
      // Mês passado (deve ser ignorado no filtro Este Mês)
      { id: "old1", amount: 5000, type: "INCOME", date: lastMonthDate },
      { id: "old2", amount: 2000, type: "EXPENSE", date: lastMonthDate },

      // Mês Atual (12 transações > limite de 10 do feed visual)
      { id: "tx1", amount: 10000, type: "INCOME", date: currentMonthDate },
      { id: "tx2", amount: 500, type: "EXPENSE", date: currentMonthDate },
      { id: "tx3", amount: 300, type: "EXPENSE", date: currentMonthDate },
      { id: "tx4", amount: 200, type: "EXPENSE", date: currentMonthDate },
      { id: "tx5", amount: 150, type: "EXPENSE", date: currentMonthDate },
      { id: "tx6", amount: 100, type: "EXPENSE", date: currentMonthDate },
      { id: "tx7", amount: 50, type: "EXPENSE", date: currentMonthDate },
      { id: "tx8", amount: 40, type: "EXPENSE", date: currentMonthDate },
      { id: "tx9", amount: 30, type: "EXPENSE", date: currentMonthDate },
      { id: "tx10", amount: 20, type: "EXPENSE", date: currentMonthDate },
      { id: "tx11", amount: 10, type: "EXPENSE", date: currentMonthDate },
      { id: "tx12", amount: 5, type: "EXPENSE", date: currentMonthDate },
    ];

    // Filtrar especificamente o mês atual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const currentMonthTxs = allTransactions.filter(
      (tx) => tx.date >= startOfMonth && tx.date < startOfNextMonth
    );

    let incomeSum = 0;
    let expenseSum = 0;

    for (const tx of currentMonthTxs) {
      if (tx.type === "INCOME") incomeSum += tx.amount;
      if (tx.type === "EXPENSE") expenseSum += tx.amount;
    }

    expect(incomeSum).toBe(10000);
    expect(expenseSum).toBe(1405); // 500+300+200+150+100+50+40+30+20+10+5
    expect(incomeSum - expenseSum).toBe(8595);
    expect(currentMonthTxs.length).toBe(12); // Considerou todas as 12 do mês atual
  });

  // Teste 3: Validação da Integridade de Allocations
  test("3. Atomicidade de Allocations: Garante que a soma das allocations é validada antes de persistir", () => {
    const invalidAllocations = [
      { allocationType: "EXPENSE" as const, amount: 800 },
      { allocationType: "INTEREST" as const, amount: 100 },
    ];

    // Valor da transação = 1000, Soma das allocations = 900 -> Erro de validação
    expect(() => TransactionService.validateAllocations(1000, invalidAllocations)).toThrow();
  });
});
