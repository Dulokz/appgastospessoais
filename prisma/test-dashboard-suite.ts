import { PrismaClient, TransactionNature, Prisma } from '@prisma/client';
import { FinancialOSEngine } from '../src/lib/services/dashboard/financial-os-engine';

const prisma = new PrismaClient();

async function runDashboardTests() {
  console.log('=====================================================');
  console.log('   SUÍTE DE TESTES AUTOMATIZADOS - ETAPA 8 (DASHBOARD)');
  console.log('=====================================================\n');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Dashboard',
        email: 'dashboard_test@domain.com',
      },
    });
  }

  let account = await prisma.account.findFirst({ where: { userId: user.id } });
  if (!account) {
    account = await prisma.account.create({
      data: { userId: user.id, name: 'Conta Corrente Teste', type: 'CHECKING' },
    });
  }

  // Limpeza prévia
  await prisma.transaction.deleteMany({ where: { accountId: account.id } });

  console.log(`[SETUP] Usuário: ${user.name} | Conta: ${account.name}\n`);

  const compDate = new Date('2025-01-15T12:00:00Z');

  // 1. Receita Real: R$ 10.000 (INCOME)
  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: compDate,
      amount: new Prisma.Decimal(10000.00),
      direction: 'CREDIT',
      description: 'SALÁRIO REGULAR',
      transactionType: 'INCOME',
      nature: TransactionNature.INCOME,
    },
  });

  // 2. Consumo Pessoal: R$ 3.000 (EXPENSE)
  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: compDate,
      amount: new Prisma.Decimal(-3000.00),
      direction: 'DEBIT',
      description: 'ALUGUEL E ALIMENTAÇÃO',
      transactionType: 'EXPENSE',
      nature: TransactionNature.EXPENSE,
    },
  });

  // 3. Desperdício Financeiro: R$ 200 (DEBT_INTEREST)
  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: compDate,
      amount: new Prisma.Decimal(-200.00),
      direction: 'DEBIT',
      description: 'JUROS CHEQUE ESPECIAL',
      transactionType: 'EXPENSE',
      nature: TransactionNature.DEBT_INTEREST,
    },
  });

  // 4. Formação Patrimonial: R$ 1.500 Amortização Apt (ASSET_ACQUISITION) + R$ 2.000 Aporte Fundo (INVESTMENT_CONTRIBUTION)
  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: compDate,
      amount: new Prisma.Decimal(-1500.00),
      direction: 'DEBIT',
      description: 'PARCELA APARTAMENTO AMORTIZACAO PRINCIPAL',
      transactionType: 'ASSET_PURCHASE',
      nature: TransactionNature.ASSET_ACQUISITION,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: compDate,
      amount: new Prisma.Decimal(-2000.00),
      direction: 'DEBIT',
      description: 'APORTE TESOURO DIRETO',
      transactionType: 'TRANSFER',
      nature: TransactionNature.INVESTMENT_CONTRIBUTION,
    },
  });

  // 5. Pagamento de Cartão de Crédito: R$ 4.000 (CREDIT_CARD_PAYMENT) -> DEVE SER 100% EXCLUÍDO DO CONSUMO!
  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      date: compDate,
      amount: new Prisma.Decimal(-4000.00),
      direction: 'DEBIT',
      description: 'PAGAMENTO FATURA CARTAO BANCO',
      transactionType: 'EXPENSE',
      nature: TransactionNature.CREDIT_CARD_PAYMENT,
    },
  });

  // Apurar métricas do mês 2025-01
  const result = await FinancialOSEngine.getMonthlyResult(user.id, '2025-01');

  console.log('--- RESULTADO APURADO PARA O DASHBOARD ---');
  console.log(`- Receita Real: R$ ${result.receitaReal}`);
  console.log(`- Consumo Pessoal: R$ ${result.consumoPessoal}`);
  console.log(`- Desperdício Financeiro: R$ ${result.desperdicioFinanceiro}`);
  console.log(`- Sobra Investível: R$ ${result.sobraInvestivel}`);
  console.log(`- Formação Patrimonial Total: R$ ${result.formacaoPatrimonial}`);
  console.log(`- Aporte Real: R$ ${result.aporteReal}`);
  console.log(`- Gap de Aporte: R$ ${result.gapAporte}`);
  console.log(`- Eficiência Patrimonial: ${result.eficienciaPatrimonial}%`);

  // Validações Rígidas das Fórmulas:
  // Receita Real = 10.000
  // Consumo Pessoal = 3.000 (Sem os 4.000 do CREDIT_CARD_PAYMENT!)
  // Desperdício = 200
  // Sobra Investível = 10.000 - 3.000 - 200 = 6.800
  // Formação Patrimonial = 1.500 + 2.000 = 3.500
  // Aporte Real = 2.000
  // Gap de Aporte = 6.800 - 2.000 = 4.800
  // Eficiência Patrimonial = (3.500 / 10.000) * 100 = 35.0%

  if (result.receitaReal !== 10000.00) throw new Error('DASHBOARD FAIL: Receita Real incorreta.');
  if (result.consumoPessoal !== 3000.00) throw new Error('DASHBOARD FAIL: Consumo Pessoal incluiu indevidamente pagamento de cartão!');
  if (result.desperdicioFinanceiro !== 200.00) throw new Error('DASHBOARD FAIL: Desperdício incorreto.');
  if (result.sobraInvestivel !== 6800.00) throw new Error(`DASHBOARD FAIL: Sobra Investível esperada 6800.00, apurado ${result.sobraInvestivel}`);
  if (result.formacaoPatrimonial !== 3500.00) throw new Error('DASHBOARD FAIL: Formação Patrimonial incorreta.');
  if (result.aporteReal !== 2000.00) throw new Error('DASHBOARD FAIL: Aporte Real incorreto.');
  if (result.gapAporte !== 4800.00) throw new Error('DASHBOARD FAIL: Gap de Aporte incorreto.');
  if (result.eficienciaPatrimonial !== 35.0) throw new Error(`DASHBOARD FAIL: Eficiência Patrimonial esperada 35.0%, apurada ${result.eficienciaPatrimonial}%`);

  console.log('\n✅ TODOS OS CÁLCULOS DO DASHBOARD FORAM RIGOROSAMENTE VALIDADOS!');

  // Limpeza
  await prisma.transaction.deleteMany({ where: { accountId: account.id } });

  console.log('=====================================================');
  console.log('🎉 TODOS OS TESTES DA ETAPA 8 PASSARAM COM SUCESSO! 🎉');
  console.log('=====================================================\n');
}

runDashboardTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
