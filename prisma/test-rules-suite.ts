import { PrismaClient, TransactionNature, ClassificationStatus, RuleMatchType } from '@prisma/client';
import { ClassificationRuleEngine } from '../src/lib/services/rules/classification-rule-engine';

const prisma = new PrismaClient();

async function runRulesTests() {
  console.log('=====================================================');
  console.log('   SUÍTE DE TESTES REFORÇADA - ETAPA 5 (REGRAS)      ');
  console.log('=====================================================\n');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Regras',
        email: 'rules_test@domain.com',
      },
    });
  }

  let account1 = await prisma.account.findFirst({ where: { userId: user.id, name: 'Conta Regras A' } });
  if (!account1) {
    account1 = await prisma.account.create({
      data: { userId: user.id, name: 'Conta Regras A', type: 'CHECKING' },
    });
  }

  let account2 = await prisma.account.findFirst({ where: { userId: user.id, name: 'Conta Regras B' } });
  if (!account2) {
    account2 = await prisma.account.create({
      data: { userId: user.id, name: 'Conta Regras B', type: 'CHECKING' },
    });
  }

  // Limpeza de testes anteriores
  await prisma.classificationRule.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { accountId: { in: [account1.id, account2.id] } } });

  console.log(`[SETUP] Usuário: ${user.name} | Conta 1: ${account1.name} | Conta 2: ${account2.name}\n`);

  // TESTE 1: Filtro por Conta e Direção (CREDIT / DEBIT)
  console.log('--- TESTE 1: FILTRO POR CONTA E DIREÇÃO ---');
  
  // Regra restrita a Conta A e Direção CREDIT
  await ClassificationRuleEngine.createRuleAndApply({
    userId: user.id,
    name: 'Receita Restrita Conta A',
    accountId: account1.id,
    direction: 'CREDIT',
    matchType: RuleMatchType.CONTAINS,
    matchValue: 'PIX ESPECIAL',
    nature: TransactionNature.INCOME,
    applyToExistingPending: false,
  });

  // Lançamento em Conta A (CREDIT) -> DEVE MATCHAR
  const txMatch = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account1.id,
      date: new Date(),
      amount: 100.00,
      direction: 'CREDIT',
      description: 'PIX ESPECIAL RECEBIDO',
      transactionType: 'INCOME',
    },
  });

  // Lançamento em Conta B (CREDIT) -> NÃO DEVE MATCHAR (conta diferente)
  const txDiffAccount = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account2.id,
      date: new Date(),
      amount: 100.00,
      direction: 'CREDIT',
      description: 'PIX ESPECIAL RECEBIDO',
      transactionType: 'INCOME',
    },
  });

  // Lançamento em Conta A (DEBIT) -> NÃO DEVE MATCHAR (direção diferente)
  const txDiffDirection = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account1.id,
      date: new Date(),
      amount: -100.00,
      direction: 'DEBIT',
      description: 'PIX ESPECIAL ENVIADO',
      transactionType: 'EXPENSE',
    },
  });

  const resMatch = await ClassificationRuleEngine.classifyTransaction(txMatch.id, user.id);
  const resDiffAccount = await ClassificationRuleEngine.classifyTransaction(txDiffAccount.id, user.id);
  const resDiffDirection = await ClassificationRuleEngine.classifyTransaction(txDiffDirection.id, user.id);

  console.log(`- Conta A (CREDIT) aplicou? ${resMatch.applied}`);
  console.log(`- Conta B (CREDIT) aplicou? ${resDiffAccount.applied}`);
  console.log(`- Conta A (DEBIT) aplicou? ${resDiffDirection.applied}`);

  if (!resMatch.applied || resDiffAccount.applied || resDiffDirection.applied) {
    throw new Error('TESTE 1 FALHOU: Filtros de conta e direção não foram respeitados.');
  }
  console.log('✅ TESTE 1 PASSOU: Filtros de conta e direção funcionaram com precisão.\n');

  // TESTE 2: Sobrescrita Explícita com overrideConfirmed = true (Ação Manual Explícita)
  console.log('--- TESTE 2: SOBRESCRITA EXPLÍCITA (overrideConfirmed = true) ---');
  
  await prisma.transaction.update({
    where: { id: txMatch.id },
    data: {
      classificationStatus: ClassificationStatus.CONFIRMED,
      nature: TransactionNature.EXPENSE,
    },
  });

  // Tentativa sem override -> IGNORADO
  const resNoOverride = await ClassificationRuleEngine.classifyTransaction(txMatch.id, user.id, {
    overrideConfirmed: false,
  });
  if (resNoOverride.applied) throw new Error('TESTE 2 FALHOU: Sem override não deveria ter alterado.');

  // Tentativa COM override manual explícito -> SOBRESCREVE
  const resWithOverride = await ClassificationRuleEngine.classifyTransaction(txMatch.id, user.id, {
    overrideConfirmed: true,
  });
  console.log(`- Override explícito aplicado? ${resWithOverride.applied} | Nova Natureza: ${resWithOverride.nature}`);

  if (!resWithOverride.applied || resWithOverride.nature !== TransactionNature.INCOME) {
    throw new Error('TESTE 2 FALHOU: Override explícito manual deveria ter atualizado o lançamento.');
  }
  console.log('✅ TESTE 2 PASSOU: Sobrescrita autorizada apenas com flag manual explícita.\n');

  // TESTE 3: Regra Retroativa Ignora Anulados e Pareados de Transferência
  console.log('--- TESTE 3: REGRA RETROATIVA IGNORA ANULADOS E PAREADOS ---');
  
  // Criar transação anulada (deletedAt)
  const txDeleted = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account1.id,
      date: new Date(),
      amount: -50.00,
      direction: 'DEBIT',
      description: 'DESPESA DELETADA',
      transactionType: 'EXPENSE',
      deletedAt: new Date(),
    },
  });

  // Criar transação pareada como transferência
  const txPaired = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account1.id,
      date: new Date(),
      amount: -100.00,
      direction: 'DEBIT',
      description: 'TRANSFERENCIA PAREADA',
      transactionType: 'EXPENSE',
      transferPairId: 'fake_pair_uuid',
    },
  });

  const { autoMatchedCount } = await ClassificationRuleEngine.classifyAllPendingTransactions(user.id);
  console.log(`- Lançamentos processados/afetados no lote: ${autoMatchedCount}`);

  const checkDeleted = await prisma.transaction.findUnique({ where: { id: txDeleted.id } });
  const checkPaired = await prisma.transaction.findUnique({ where: { id: txPaired.id } });

  if (checkDeleted?.classificationStatus === ClassificationStatus.AUTO_MATCHED || checkPaired?.classificationStatus === ClassificationStatus.AUTO_MATCHED) {
    throw new Error('TESTE 3 FALHOU: Processamento retroativo afetou transações deletadas ou pareadas.');
  }
  console.log('✅ TESTE 3 PASSOU: Lançamentos anulados e pareados totalmente ignorados no lote.\n');

  // TESTE 4: Prévia da Contagem Afetada (countMatchingPendingTransactions)
  console.log('--- TESTE 4: PRÉVIA DA CONTAGEM AFETADA ANTES DE CRIAR REGRA ---');
  
  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account1.id,
      date: new Date(),
      amount: -80.00,
      direction: 'DEBIT',
      description: 'COMBUSTIVEL POSTO SHELL',
      transactionType: 'EXPENSE',
    },
  });

  const previewCount = await ClassificationRuleEngine.countMatchingPendingTransactions(user.id, {
    matchType: RuleMatchType.CONTAINS,
    matchValue: 'POSTO SHELL',
  });

  console.log(`- Prévia de pendências que serão afetadas antes da confirmação: ${previewCount}`);
  if (previewCount !== 1) {
    throw new Error('TESTE 4 FALHOU: Prévia da contagem de pendências incorreta.');
  }
  console.log('✅ TESTE 4 PASSOU: Prévia de contagem exata calculada antes da execução.\n');

  // Limpeza dos testes
  await prisma.classificationRule.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { accountId: { in: [account1.id, account2.id] } } });

  console.log('=====================================================');
  console.log('🎉 TODOS OS TESTES REFORÇADOS PASSARAM COM SUCESSO! 🎉');
  console.log('=====================================================\n');
}

runRulesTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
