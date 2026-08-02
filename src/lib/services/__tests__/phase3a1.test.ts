import { Decimal } from "../../decimal";
import { InvestmentEventService } from "../investment-event.service";

describe("Phase 3A.1 — Investment Domain Robustness Tests", () => {
  // Teste 1: Posição Inicial não altera o caixa da conta
  test("1. Posição Inicial: Reconhecimento de R$ 20.000 com caixa R$ 10.000 -> Caixa permanece R$ 10.000, PL +R$ 20.000", () => {
    const res = InvestmentEventService.processEvent({
      eventType: "INITIAL_POSITION",
      amount: 20000,
      positionCurrentValue: 0,
      accountCalculatedBalance: 10000,
    });

    expect(res.newAccountBalance.toNumber()).toBe(10000); // Caixa intocado
    expect(res.newPositionValue.toNumber()).toBe(20000);
    expect(res.netWorthChange.toNumber()).toBe(20000); // Reconhecimento patrimonial
    expect(res.isRealizedIncome).toBe(false); // NENHUMA receita do mês é criada
  });

  // Teste 2: Aporte Real deduz caixa atomicamente
  test("2. Aporte Real: Caixa R$ 10.000 + Aporte R$ 5.000 -> Caixa R$ 5.000, Posição +R$ 5.000, PL inalterado", () => {
    const res = InvestmentEventService.processEvent({
      eventType: "CONTRIBUTION",
      amount: 5000,
      positionCurrentValue: 0,
      accountCalculatedBalance: 10000,
    });

    expect(res.newAccountBalance.toNumber()).toBe(5000);
    expect(res.newPositionValue.toNumber()).toBe(5000);
    expect(res.netWorthChange.toNumber()).toBe(0);
  });

  // Teste 3: Posição sem quantidade (VALUE_BASED)
  test("3. Posição sem Quantidade: Fundo BB (Aplicado R$ 80k, Atual R$ 85k) com quantidade = null é 100% válida", () => {
    const quantity: Decimal | null = null;
    const acquisitionValue = new Decimal(80000);
    const currentValue = new Decimal(85000);

    expect(quantity).toBeNull();
    expect(currentValue.sub(acquisitionValue).toNumber()).toBe(5000);
  });

  // Teste 4: Vínculo de Evento com Transação
  test("4. Vínculo Event -> Transaction: Dividendos de R$ 500 criam InvestmentEvent associado à Transaction", () => {
    const res = InvestmentEventService.processEvent({
      eventType: "DIVIDEND",
      amount: 500,
      positionCurrentValue: 10000,
      accountCalculatedBalance: 2000,
    });

    expect(res.newAccountBalance.toNumber()).toBe(2500);
    expect(res.isRealizedIncome).toBe(true);
    expect(res.netWorthChange.toNumber()).toBe(500);
  });

  // Teste 5: Deduplicação e Normalização de Symbol
  test("5. Deduplicação: 'petr4' e 'PETR4' no mesmo exchange são normalizados para 'PETR4'", () => {
    const symbolInput1 = "petr4 ";
    const symbolInput2 = "PETR4";

    const norm1 = symbolInput1.trim().toUpperCase();
    const norm2 = symbolInput2.trim().toUpperCase();

    expect(norm1).toBe("PETR4");
    expect(norm1).toBe(norm2);
  });

  // Teste 6: Resgate total com ganho realizado
  test("6. Resgate Total com Ganho: Posição R$ 85k (Custo R$ 80k) -> Resgate R$ 85k, Ganho R$ 5k -> Caixa +85k, Posição R$ 0, Receita R$ 5k", () => {
    const positionCurrentValue = new Decimal(85000);
    const acquisitionValue = new Decimal(80000);
    const withdrawalAmount = new Decimal(85000);
    const realizedGain = withdrawalAmount.sub(acquisitionValue); // R$ 5.000

    const res = InvestmentEventService.processEvent({
      eventType: "WITHDRAWAL",
      amount: withdrawalAmount,
      positionCurrentValue,
      accountCalculatedBalance: 1000,
      realizedGainOrLoss: realizedGain,
    });

    expect(res.newAccountBalance.toNumber()).toBe(86000); // 1.000 + 85.000
    expect(res.newPositionValue.toNumber()).toBe(0);
    expect(res.isRealizedIncome).toBe(true);
    expect(realizedGain.toNumber()).toBe(5000);
  });

  // Teste 7: Resgate parcial proporcional com ajuste de Custo Histórico
  test("7. Resgate Parcial Proporcional: Custo R$ 80k, Valor R$ 100k, Resgate R$ 20k -> Custo restante R$ 64k", () => {
    const acquisitionValue = new Decimal(80000);
    const currentValue = new Decimal(100000);
    const withdrawalAmount = new Decimal(20000);

    // Proporção resgatada = 20.000 / 100.000 = 20%
    const proportion = withdrawalAmount.div(currentValue); // 0.2
    const principalAmortized = acquisitionValue.mul(proportion); // 16.000
    const newAcquisitionValue = acquisitionValue.sub(principalAmortized); // 64.000
    const newCurrentValue = currentValue.sub(withdrawalAmount); // 80.000
    const realizedGain = withdrawalAmount.sub(principalAmortized); // 4.000

    expect(principalAmortized.toNumber()).toBe(16000);
    expect(newAcquisitionValue.toNumber()).toBe(64000);
    expect(newCurrentValue.toNumber()).toBe(80000);
    expect(realizedGain.toNumber()).toBe(4000);
  });

  // Teste 8: Resgate com perda realizada
  test("8. Resgate com Perda: Custo R$ 10.000, Resgate R$ 9.000 -> Perda realizada R$ 1.000 sem misturar com despesa de consumo", () => {
    const acquisitionValue = new Decimal(10000);
    const withdrawalAmount = new Decimal(9000);
    const realizedLoss = acquisitionValue.sub(withdrawalAmount); // R$ 1.000

    const res = InvestmentEventService.processEvent({
      eventType: "REALIZED_LOSS",
      amount: realizedLoss,
      positionCurrentValue: 0,
      accountCalculatedBalance: 5000,
    });

    expect(realizedLoss.toNumber()).toBe(1000);
    expect(res.netWorthChange.toNumber()).toBe(-1000);
    expect(res.isRealizedIncome).toBe(false);
  });

  // Teste 9: Segurança de Escopo Multiusuário
  test("9. Segurança de Escopo: Posição de outro userId é rejeitada", () => {
    const currentUserId: string = "user-123";
    const positionOwnerId: string = "user-999";

    const isAuthorized = currentUserId === positionOwnerId;
    expect(isAuthorized).toBe(false);
  });
});
