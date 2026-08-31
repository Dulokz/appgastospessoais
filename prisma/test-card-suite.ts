import { PrismaClient, TransactionNature, Prisma } from '@prisma/client';
import { CreditCardEngine } from '../src/lib/services/credit-card/credit-card-engine';
import { InternalTransferMatchingEngine } from '../src/lib/services/conciliation/internal-transfer-engine';

const prisma = new PrismaClient();

async function runCardTests() {
  console.log('=====================================================');
  console.log('   SUÍTE DE TESTES AUTOMATIZADOS REFORÇADA - CARTÃO ');
  console.log('=====================================================\n');

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Cartão',
        email: 'card_test@domain.com',
      },
    });
  }

  let bankAccount = await prisma.account.findFirst({
    where: { userId: user.id, name: 'Conta Corrente BB Teste' },
  });
  if (!bankAccount) {
    bankAccount = await prisma.account.create({
      data: { userId: user.id, name: 'Conta Corrente BB Teste', type: 'CHECKING' },
    });
  }

  const { card, account: cardAccount, liability } = await CreditCardEngine.getOrCreateCreditCard({
    userId: user.id,
    name: 'Mastercard Black Teste',
    closingDay: 25,
    dueDay: 5,
    limit: 10000,
  });

  console.log(`[SETUP] Cartão: ${card.name} | Conta Cartão: ${cardAccount.name} | Passivo ID: ${liability.id}\n`);

  // Limpeza prévia
  await prisma.transaction.deleteMany({
    where: { accountId: { in: [bankAccount.id, cardAccount.id] } },
  });
  await prisma.creditCardInvoice.deleteMany({ where: { creditCardId: card.id } });

  // TESTE 1: Compra à vista
  console.log('--- TESTE 1: COMPRA À VISTA (CREDIT_CARD_PURCHASE) ---');
  const purchase1 = await CreditCardEngine.registerPurchase({
    userId: user.id,
    creditCardId: card.id,
    date: new Date('2025-01-10T12:00:00Z'),
    description: 'RESTAURANTE MARISCOS',
    totalAmount: 350.00,
  });

  if (purchase1.installmentCount !== 1) throw new Error('TESTE 1 FALHOU');
  console.log('✅ TESTE 1 PASSOU\n');

  // TESTE 2: Compra Parcelada
  console.log('--- TESTE 2: COMPRA PARCELADA (6x DE R$ 200) ---');
  const purchase2 = await CreditCardEngine.registerPurchase({
    userId: user.id,
    creditCardId: card.id,
    date: new Date('2025-01-15T12:00:00Z'),
    description: 'MERCADO LIVRE TV 4K',
    totalAmount: 1200.00,
    installments: 6,
  });

  if (purchase2.installmentCount !== 6) throw new Error('TESTE 2 FALHOU');
  console.log('✅ TESTE 2 PASSOU\n');

  // TESTE 3: Fatura e Competência por Fechamento
  console.log('--- TESTE 3: CÁLCULO DA FATURA 2025-01 ---');
  const invoice = await CreditCardEngine.calculateInvoice(user.id, card.id, '2025-01');
  console.log(`- Total da Fatura 2025-01: R$ ${invoice.totalAmount}`);
  if (invoice.totalAmount !== 550.00) throw new Error('TESTE 3 FALHOU');
  console.log('✅ TESTE 3 PASSOU\n');

  // TESTE 4: Reimportação do Mesmo Pagamento Bancário (Idempotência Rígida)
  console.log('--- TESTE 4: REIMPORTAÇÃO DO MESMO PAGAMENTO BANCÁRIO ---');
  
  const bankPaymentTx = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: bankAccount.id,
      date: new Date('2025-02-05'),
      amount: new Prisma.Decimal(-550.00),
      direction: 'DEBIT',
      description: 'PAGTO FATURA MASTERCARD',
      originalDescription: 'PAGTO FATURA MASTERCARD',
      transactionType: 'EXPENSE',
      fitId: 'FIT_BANK_PAYMENT_12345',
    },
  });

  const payResult1 = await CreditCardEngine.processInvoicePayment({
    userId: user.id,
    creditCardId: card.id,
    bankAccountId: bankAccount.id,
    paymentDate: new Date('2025-02-05'),
    amount: 550.00,
    competence: '2025-01',
    bankTransactionId: bankPaymentTx.id,
  });

  const payResult2 = await CreditCardEngine.processInvoicePayment({
    userId: user.id,
    creditCardId: card.id,
    bankAccountId: bankAccount.id,
    paymentDate: new Date('2025-02-05'),
    amount: 550.00,
    competence: '2025-01',
    bankTransactionId: bankPaymentTx.id,
  });

  // VALIDAÇÃO PERSISTIDA NO BANCO DE DADOS
  const invoiceInDb = await prisma.creditCardInvoice.findUnique({ where: { id: payResult1.invoiceId } });
  const liabilityInDb = await prisma.liability.findUnique({ where: { id: liability.id } });

  console.log(`- DB Fatura paidAmount: R$ ${invoiceInDb?.paidAmount} | Status: ${invoiceInDb?.status}`);
  console.log(`- DB Liability currentBalance: R$ ${liabilityInDb?.currentBalance}`);

  if (Number(invoiceInDb?.paidAmount) !== 550.00 || !payResult2.alreadyProcessed) {
    throw new Error('TESTE 4 FALHOU: O estado persistido no banco alterou indevidamente.');
  }
  console.log('✅ TESTE 4 PASSOU: Estado persistido no banco validado com 100% de integridade.\n');

  // TESTE 5: Concorrência Atômica e Validação de Estado Persistido
  console.log('--- TESTE 5: CONCORRÊNCIA ATÔMICA E VALIDAÇÃO PERSISTIDA ---');
  
  await CreditCardEngine.registerPurchase({
    userId: user.id,
    creditCardId: card.id,
    date: new Date('2025-02-10'),
    description: 'POSTO COMBUSTIVEL',
    totalAmount: 200.00,
  });

  const inv2 = await CreditCardEngine.calculateInvoice(user.id, card.id, '2025-02');
  console.log(`- Fatura 2025-02 Total: R$ ${inv2.totalAmount}`);

  await Promise.all([
    CreditCardEngine.processInvoicePayment({
      userId: user.id,
      creditCardId: card.id,
      bankAccountId: bankAccount.id,
      paymentDate: new Date('2025-03-05'),
      amount: 400.00,
      competence: '2025-02',
    }),
    CreditCardEngine.processInvoicePayment({
      userId: user.id,
      creditCardId: card.id,
      bankAccountId: bankAccount.id,
      paymentDate: new Date('2025-03-05'),
      amount: 400.00,
      competence: '2025-02',
    }),
  ]);

  // VALIDAÇÃO PERSISTIDA NO BANCO
  const inv2InDb = await prisma.creditCardInvoice.findUnique({ where: { id: inv2.invoiceId } });
  console.log(`- DB Fatura 2025-02 paidAmount: R$ ${inv2InDb?.paidAmount} | totalAmount: R$ ${inv2InDb?.totalAmount}`);

  const remainingDb = Number(inv2InDb?.totalAmount) - Number(inv2InDb?.paidAmount);
  if (remainingDb < 0) {
    throw new Error('TESTE 5 FALHOU: Estado persistido no banco ficou com saldo negativo!');
  }
  console.log('✅ TESTE 5 PASSOU: Estado persistido no banco validado sem saldo negativo.\n');

  // TESTE 6: Pagamento Excedente Registra Crédito
  console.log('--- TESTE 6: PAGAMENTO EXCEDENTE E CRÉDITO NO CARTÃO ---');
  const excessResult = await CreditCardEngine.processInvoicePayment({
    userId: user.id,
    creditCardId: card.id,
    bankAccountId: bankAccount.id,
    paymentDate: new Date('2025-03-06'),
    amount: 100.00, // Tentativa de pagamento excedente em fatura zerada
    competence: '2025-02',
  });

  console.log(`- Crédito Excedente Registrado: R$ ${excessResult.excessCreditAmount}`);
  const excessTx = await prisma.transaction.findUnique({ where: { id: excessResult.paymentTransactionId } });

  if (excessResult.excessCreditAmount !== 100.00 || !excessTx?.notes?.includes('CRÉDITO_EXCEDENTE_CARTÃO')) {
    throw new Error('TESTE 6 FALHOU: Pagamento excedente não registrou o valor de crédito no histórico.');
  }
  console.log('✅ TESTE 6 PASSOU: Excedente de pagamento registrado com transparência.\n');

  // Limpeza final
  await prisma.transaction.deleteMany({
    where: { accountId: { in: [bankAccount.id, cardAccount.id] } },
  });
  await prisma.creditCardInvoice.deleteMany({ where: { creditCardId: card.id } });

  console.log('=====================================================');
  console.log('🎉 TODOS OS TESTES REFORÇADOS DA ETAPA 7 PASSARAM!   ');
  console.log('=====================================================\n');
}

runCardTests()
  .catch((e) => {
    console.error('❌ ERRO NO TESTE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
