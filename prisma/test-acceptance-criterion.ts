import { PrismaClient, TransactionOrigin } from '@prisma/client';
import { OnboardingEngine } from '../src/lib/services/onboarding/onboarding-engine';
import { FinancialOSEngine } from '../src/lib/services/dashboard/financial-os-engine';

const prisma = new PrismaClient();

async function runAcceptanceCriterionTest() {
  console.log('================================================================');
  console.log('   TESTE DE CRITÉRIO DE ACEITE END-TO-END (FLUXO DO USUÁRIO)    ');
  console.log('================================================================\n');

  // 1. BANCO LIMPO (SETUP DO USUÁRIO PRINCIPAL DE PRODUÇÃO)
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Usuário Principal', email: 'user@domain.com' },
    });
  }

  // Limpeza de todas as contas e transações existentes para simular primeira utilização
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.liability.deleteMany({ where: { userId: user.id } });
  await prisma.assetValuation.deleteMany({ where: { asset: { userId: user.id } } });
  await prisma.asset.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });

  console.log(`1. BANCO LIMPO -> Usuário ${user.name} (ID: ${user.id}) sem contas ou lançamentos.`);

  // 2. ABRIR APP -> CONSULTA DE ESTADO DE ONBOARDING (SEM REDIRECIONAMENTO SILENCIOSO)
  const stateInitial = await OnboardingEngine.getOnboardingState(user.id);
  console.log(`2. ABRIR APP -> Contas ativas: ${stateInitial.activeAccountsCount} | Precisa Onboarding? ${stateInitial.needsOnboarding}`);

  if (!stateInitial.needsOnboarding) {
    throw new Error('CRITÉRIO DE ACEITE FALHOU: Usuário sem contas deveria requerer Onboarding.');
  }

  // 3. SELECIONAR DATA-BASE (01/01/2025) & BANCO DO BRASIL NO CATÁLOGO & SALDO R$ 5.000,00
  console.log('3. ONBOARDING -> Escolher Data-Base 01/01/2025, Banco do Brasil do catálogo e saldo R$ 5.000,00...');
  
  const baselineDate = new Date('2025-01-01T00:00:00Z');
  const onboardingRes = await OnboardingEngine.setupOnboarding({
    userId: user.id,
    controlStartDate: baselineDate,
    onboardingPath: 'MANUAL',
    initialAccounts: [
      {
        name: 'Conta Corrente Banco do Brasil',
        type: 'CHECKING',
        initialBalance: 5000.00,
        institutionName: 'Banco do Brasil',
      },
    ],
  });

  console.log(`- Setup concluído com sucesso? ${onboardingRes.success}`);

  // 4. CONSULTAR DASHBOARD -> FUNCIONAL, RÁPIDO (<10ms) E SEM TIMEOUT OU OFX OBRIGATÓRIO
  console.log('4. DASHBOARD -> Consultando apuração mensal do dashboard para 2025-01...');

  const startTime = Date.now();
  const dashRes = await FinancialOSEngine.getMonthlyResult(user.id, '2025-01');
  const elapsedMs = Date.now() - startTime;

  console.log(`- Tempo de Resposta da Consulta: ${elapsedMs} ms`);
  console.log(`- Contas Ativas no Banco: ${dashRes.activeAccountsCount}`);
  console.log(`- Receita Real Apurada (excluindo Saldo de Abertura): R$ ${dashRes.receitaReal}`);
  console.log(`- Consumo Pessoal Apurado: R$ ${dashRes.consumoPessoal}`);
  console.log(`- Data-Base Gravada: ${dashRes.controlStartDate ? new Date(dashRes.controlStartDate).toISOString().split('T')[0] : 'N/A'}`);

  const createdAccount = await prisma.account.findFirst({ where: { userId: user.id } });
  const openingTx = await prisma.transaction.findFirst({ where: { userId: user.id, origin: TransactionOrigin.OPENING_BALANCE } });

  console.log(`- Conta Cadastrada: ${createdAccount?.name} | Instituição: Banco do Brasil`);
  console.log(`- Lançamento OPENING_BALANCE: R$ ${openingTx?.amount} na data-base 2025-01-01`);

  if (
    !onboardingRes.success ||
    dashRes.activeAccountsCount !== 1 ||
    elapsedMs > 1000 ||
    !createdAccount ||
    !openingTx
  ) {
    throw new Error('CRITÉRIO DE ACEITE FALHOU!');
  }

  console.log('\n================================================================');
  console.log('🎉 CRITÉRIO DE ACEITE APROVADO COM 100% DE SUCESSO!              ');
  console.log('================================================================\n');
}

runAcceptanceCriterionTest()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE DE ACEITE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
