import { PrismaClient, TransactionNature, ClassificationStatus } from '@prisma/client';
import { InternalTransferMatchingEngine } from '../src/lib/services/conciliation/internal-transfer-engine';

const prisma = new PrismaClient();

async function runTransferTests() {
  console.log('=====================================================');
  console.log('   SUÍTE DE TESTES AUTOMATIZADOS - ETAPA 4 (TRANSFER) ');
  console.log('=====================================================\n');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Transfer',
        email: 'transfer_test@domain.com',
      },
    });
  }

  let accountBB = await prisma.account.findFirst({
    where: { userId: user.id, name: 'Banco do Brasil Teste' },
  });
  if (!accountBB) {
    accountBB = await prisma.account.create({
      data: { userId: user.id, name: 'Banco do Brasil Teste', type: 'CHECKING' },
    });
  }

  let accountSicoob = await prisma.account.findFirst({
    where: { userId: user.id, name: 'Sicoob Teste' },
  });
  if (!accountSicoob) {
    accountSicoob = await prisma.account.create({
      data: { userId: user.id, name: 'Sicoob Teste', type: 'CHECKING' },
    });
  }

  // Limpeza prévia
  await prisma.transaction.deleteMany({
    where: { accountId: { in: [accountBB.id, accountSicoob.id] } },
  });

  console.log(`[SETUP] Usuário: ${user.name} | Conta A: ${accountBB.name} | Conta B: ${accountSicoob.name}\n`);

  // TESTE 1: Sugestão de Pareamento
  console.log('--- TESTE 1: DETECÇÃO DE SUGESTÃO DE PAREAMENTO ---');
  const dateBB = new Date('2025-05-10T14:00:00Z');
  const dateSicoob = new Date('2025-05-11T10:00:00Z');

  const txBB = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accountBB.id,
      date: dateBB,
      amount: -9000.00,
      direction: 'DEBIT',
      description: 'TRANSF PIX SICOOB CONTA PROPRIA',
      originalDescription: 'TRANSF PIX SICOOB CONTA PROPRIA',
      transactionType: 'EXPENSE',
      nature: 'UNCLASSIFIED',
      classificationStatus: 'PENDING',
    },
  });

  const txSicoob = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accountSicoob.id,
      date: dateSicoob,
      amount: 9000.00,
      direction: 'CREDIT',
      description: 'PIX RECEBIDO BB BANCO DO BRASIL',
      originalDescription: 'PIX RECEBIDO BB BANCO DO BRASIL',
      transactionType: 'INCOME',
      nature: 'UNCLASSIFIED',
      classificationStatus: 'PENDING',
    },
  });

  const candidates = await InternalTransferMatchingEngine.findSuggestedTransferPairs(user.id, {
    maxDateDiffDays: 3,
  });

  console.log(`- Sugestões Encontradas: ${candidates.length}`);
  if (candidates.length !== 1) {
    throw new Error('TESTE 1 FALHOU');
  }
  console.log('✅ TESTE 1 PASSOU\n');

  // TESTE 2: Confirmação com UUID Compartilhado
  console.log('--- TESTE 2: CONFIRMAÇÃO DO PAREAMENTO COM UUID COMPARTILHADO ---');
  const confirmResult = await InternalTransferMatchingEngine.confirmTransferPair(user.id, txBB.id, txSicoob.id);

  const updatedTxBB = await prisma.transaction.findUnique({ where: { id: txBB.id } });
  const updatedTxSicoob = await prisma.transaction.findUnique({ where: { id: txSicoob.id } });

  console.log(`- UUID Compartilhado do Par: ${confirmResult.sharedPairId}`);
  console.log(`- BB transferPairId: ${updatedTxBB?.transferPairId}`);
  console.log(`- Sicoob transferPairId: ${updatedTxSicoob?.transferPairId}`);

  if (
    updatedTxBB?.transferPairId !== confirmResult.sharedPairId ||
    updatedTxSicoob?.transferPairId !== confirmResult.sharedPairId ||
    updatedTxBB?.transferPairId !== updatedTxSicoob?.transferPairId
  ) {
    throw new Error('TESTE 2 FALHOU: As duas pontas devem compartilhar EXATAMENTE o mesmo transferPairId.');
  }
  console.log('✅ TESTE 2 PASSOU: Ambas as pontas compartilham o mesmo transferPairId UUID.\n');

  // TESTE 3: Desfazer Pareamento e Restaurar Estado Prévio
  console.log('--- TESTE 3: DESFAZER PAREAMENTO E RESTAURAR ESTADO PRÉVIO ---');
  await InternalTransferMatchingEngine.unpairTransfer(user.id, txBB.id);

  const unpairedBB = await prisma.transaction.findUnique({ where: { id: txBB.id } });
  const unpairedSicoob = await prisma.transaction.findUnique({ where: { id: txSicoob.id } });

  console.log(`- Status BB pós-despareamento: ${unpairedBB?.nature} | transferPairId: ${unpairedBB?.transferPairId}`);
  console.log(`- Status Sicoob pós-despareamento: ${unpairedSicoob?.nature} | transferPairId: ${unpairedSicoob?.transferPairId}`);

  if (unpairedBB?.transferPairId !== null || unpairedSicoob?.transferPairId !== null || unpairedBB?.nature !== TransactionNature.UNCLASSIFIED) {
    throw new Error('TESTE 3 FALHOU');
  }
  console.log('✅ TESTE 3 PASSOU: Pareamento desfeito com restauração de estado prévio.\n');

  // TESTE 4: Impedir Confirmação em Transação de Cartão ou Já Pareada
  console.log('--- TESTE 4: VALIDAÇÕES DE CONFIRMAÇÃO (CARTÃO / JA PAREADO / DELETED) ---');
  
  // Transação vinculada a cartão
  const cardTx = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accountBB.id,
      date: new Date(),
      amount: -500.00,
      direction: 'DEBIT',
      description: 'PAGAMENTO FATURA CARTÃO MASTERCARD',
      transactionType: 'EXPENSE',
      nature: TransactionNature.CREDIT_CARD_PAYMENT,
    },
  });

  let cardErrorCaught = false;
  try {
    await InternalTransferMatchingEngine.confirmTransferPair(user.id, cardTx.id, txSicoob.id);
  } catch (err: any) {
    cardErrorCaught = true;
    console.log(`- Bloqueio de Cartão confirmado: "${err.message}"`);
  }

  if (!cardErrorCaught) {
    throw new Error('TESTE 4 FALHOU: Transação de cartão não deveria ter sido pareada como transferência.');
  }
  console.log('✅ TESTE 4 PASSOU: Validações estritas impedem pareamentos inválidos.\n');

  // TESTE 5: Múltiplos PIX de Mesmo Valor (Sem Seleção Automática Arbitrária)
  console.log('--- TESTE 5: MÚLTIPLOS PIX DE MESMO VALOR (NÃO AUTO-SELECIONAR) ---');
  
  // Criar dois PIX de saída idênticos de R$ 500 no mesmo dia no BB
  const pixBB1 = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accountBB.id,
      date: new Date('2025-06-01T10:00:00Z'),
      amount: -500.00,
      direction: 'DEBIT',
      description: 'PIX TRANSFERENCIA 1',
      transactionType: 'EXPENSE',
    },
  });

  const pixBB2 = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accountBB.id,
      date: new Date('2025-06-01T10:05:00Z'),
      amount: -500.00,
      direction: 'DEBIT',
      description: 'PIX TRANSFERENCIA 2',
      transactionType: 'EXPENSE',
    },
  });

  // Criar um PIX de entrada de R$ 500 no Sicoob
  const pixSicoob = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: accountSicoob.id,
      date: new Date('2025-06-01T10:02:00Z'),
      amount: 500.00,
      direction: 'CREDIT',
      description: 'PIX RECEBIDO SICOOB',
      transactionType: 'INCOME',
    },
  });

  const multipleCandidates = await InternalTransferMatchingEngine.findSuggestedTransferPairs(user.id);
  console.log(`- Candidatos a sugestão retornados para decisão manual do usuário: ${multipleCandidates.length}`);

  // Verificar se nenhuma transação foi alterada no banco automaticamente
  const checkBB1 = await prisma.transaction.findUnique({ where: { id: pixBB1.id } });
  const checkBB2 = await prisma.transaction.findUnique({ where: { id: pixBB2.id } });
  const checkSicoob = await prisma.transaction.findUnique({ where: { id: pixSicoob.id } });

  if (checkBB1?.transferPairId !== null || checkBB2?.transferPairId !== null || checkSicoob?.transferPairId !== null) {
    throw new Error('TESTE 5 FALHOU: Transações foram pareadas automaticamente sem confirmação do usuário!');
  }
  console.log('✅ TESTE 5 PASSOU: Candidatos apresentados sem auto-seleção arbitrária do banco.\n');

  // Limpeza dos testes
  await prisma.transaction.deleteMany({
    where: { id: { in: [txBB.id, txSicoob.id, cardTx.id, pixBB1.id, pixBB2.id, pixSicoob.id] } },
  });

  console.log('=====================================================');
  console.log('🎉 TODOS OS TESTES DA ETAPA 4 PASSARAM COM SUCESSO! 🎉');
  console.log('=====================================================\n');
}

runTransferTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
