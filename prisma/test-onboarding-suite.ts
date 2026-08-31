import { PrismaClient, TransactionOrigin, TransactionPeriodType, Prisma } from '@prisma/client';
import { OnboardingEngine } from '../src/lib/services/onboarding/onboarding-engine';
import { FinancialOSEngine } from '../src/lib/services/dashboard/financial-os-engine';

const prisma = new PrismaClient();

async function runOnboardingTests() {
  console.log('=====================================================');
  console.log('   SUÍTE DE TESTES AUTOMATIZADOS - ONBOARDING FLEXÍVEL');
  console.log('=====================================================\n');

  // USAR USUÁRIO DE TESTE ISOLADO PARA NÃO CORROMPER O USUÁRIO PRINCIPAL DO APP
  let user = await prisma.user.findFirst({ where: { email: 'onboarding_isolated_test@domain.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Isolado Teste Onboarding',
        email: 'onboarding_isolated_test@domain.com',
      },
    });
  }

  // Limpeza prévia no usuário isolado
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.liability.deleteMany({ where: { userId: user.id } });
  await prisma.assetValuation.deleteMany({ where: { asset: { userId: user.id } } });
  await prisma.asset.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  console.log(`[SETUP ISOLADO] Usuário: ${user.name} | ID: ${user.id}\n`);

  // TESTE 1: Setup Onboarding "Começar do Zero / Manual" com Data-Base 01/01/2025
  console.log('--- TESTE 1: FLUXO "COMEÇAR DO ZERO / MANUAL" (DATA-BASE: 01/01/2025) ---');
  const baselineDate = new Date('2025-01-01T00:00:00Z');

  const setupManual = await OnboardingEngine.setupOnboarding({
    userId: user.id,
    controlStartDate: baselineDate,
    onboardingPath: 'MANUAL',
    initialAccounts: [
      { name: 'Conta Corrente Itaú Teste', type: 'CHECKING', initialBalance: 15000.00, institutionName: 'Itaú Unibanco' },
      { name: 'Conta Custódia XP Teste', type: 'BROKERAGE', initialBalance: 100000.00, institutionName: 'XP Investimentos' },
    ],
    initialAssets: [
      { name: 'Apartamento Moema', category: 'REAL_ESTATE', acquisitionValue: 700000.00, currentValue: 850000.00 },
    ],
    initialLiabilities: [
      { name: 'Financiamento Itaú Apt', type: 'MORTGAGE', originalValue: 400000.00, currentBalance: 350000.00 },
    ],
  });

  console.log(`- Onboarding Concluído? ${setupManual.success} | Data-Base: ${setupManual.controlStartDate.toISOString().split('T')[0]}`);

  const openingTxs = await prisma.transaction.findMany({
    where: { userId: user.id, origin: TransactionOrigin.OPENING_BALANCE },
  });

  console.log(`- Lançamentos OPENING_BALANCE gerados: ${openingTxs.length}`);
  if (openingTxs.length !== 2 || openingTxs[0].origin !== TransactionOrigin.OPENING_BALANCE) {
    throw new Error('TESTE 1 FALHOU: Lançamentos de saldo de abertura com origem TransactionOrigin.OPENING_BALANCE não foram gerados.');
  }
  console.log('✅ TESTE 1 PASSOU: Fluxo manual cadastrou data-base e saldos com TransactionOrigin.OPENING_BALANCE.\n');

  // TESTE 2: Idempotência e Edição da Posição Inicial
  console.log('--- TESTE 2: IDEMPOTÊNCIA E EDIÇÃO DA POSIÇÃO INICIAL ---');
  const accItau = await prisma.account.findFirst({ where: { userId: user.id, name: 'Conta Corrente Itaú Teste' } });
  if (!accItau) throw new Error('Conta Itaú não encontrada.');

  await OnboardingEngine.setupOnboarding({
    userId: user.id,
    controlStartDate: baselineDate,
    onboardingPath: 'MANUAL',
    initialAccounts: [
      { accountId: accItau.id, name: 'Conta Corrente Itaú Teste', type: 'CHECKING', initialBalance: 20000.00 },
    ],
  });

  const openingTxsAfterReRun = await prisma.transaction.findMany({
    where: { userId: user.id, origin: TransactionOrigin.OPENING_BALANCE },
  });

  console.log(`- Total de Lançamentos OPENING_BALANCE após re-execução idempotente: ${openingTxsAfterReRun.length}`);
  const updatedItauTx = openingTxsAfterReRun.find((t) => t.accountId === accItau.id);
  console.log(`- Novo Valor Atualizado no Banco: R$ ${updatedItauTx?.amount}`);

  if (openingTxsAfterReRun.length !== 2 || Number(updatedItauTx?.amount) !== 20000.00) {
    throw new Error('TESTE 2 FALHOU: Idempotência de onboarding duplicou transação ou não atualizou o valor.');
  }
  console.log('✅ TESTE 2 PASSOU: Setup de onboarding 100% idempotente sem duplicar saldos de abertura.\n');

  // TESTE 3: Isolamento de OPENING_BALANCE no Dashboard (DRE)
  console.log('--- TESTE 3: ISOLAMENTO DE OPENING_BALANCE NO DASHBOARD ---');
  
  const dashResult = await FinancialOSEngine.getMonthlyResult(user.id, '2025-01');

  console.log(`- Receita Real Apurada no Mês: R$ ${dashResult.receitaReal}`);
  console.log(`- Consumo Pessoal Apurado no Mês: R$ ${dashResult.consumoPessoal}`);
  console.log(`- Aporte Real Apurado no Mês: R$ ${dashResult.aporteReal}`);

  if (dashResult.receitaReal !== 0 || dashResult.consumoPessoal !== 0 || dashResult.aporteReal !== 0) {
    throw new Error('TESTE 3 FALHOU: OPENING_BALANCE entrou indevidamente nos cálculos de Receita, Consumo ou Aporte!');
  }
  console.log('✅ TESTE 3 PASSOU: OPENING_BALANCE totalmente isolado dos fluxos de consumo/receita/aporte.\n');

  // TESTE 4: Verificação da Regra de Recuperação (needsOnboarding = true se 0 contas ativas)
  console.log('--- TESTE 4: VALIDAÇÃO DA REGRA DE RECUPERAÇÃO DE ONBOARDING ---');
  
  // Limpar contas do usuário de teste
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  const stateWithZeroAccounts = await OnboardingEngine.getOnboardingState(user.id);
  console.log(`- Contas Ativas: ${stateWithZeroAccounts.activeAccountsCount} | Precisa Onboarding? ${stateWithZeroAccounts.needsOnboarding}`);

  if (!stateWithZeroAccounts.needsOnboarding) {
    throw new Error('TESTE 4 FALHOU: Usuário sem contas ativas deveria ser obrigado a passar pelo onboarding!');
  }
  console.log('✅ TESTE 4 PASSOU: Regra de recuperação validada com sucesso (needsOnboarding = true quando 0 contas ativas).\n');

  // Limpeza final
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.liability.deleteMany({ where: { userId: user.id } });
  await prisma.assetValuation.deleteMany({ where: { asset: { userId: user.id } } });
  await prisma.asset.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  console.log('=====================================================');
  console.log('🎉 TODOS OS TESTES REFORÇADOS PASSARAM COM SUCESSO!  ');
  console.log('=====================================================\n');
}

runOnboardingTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
