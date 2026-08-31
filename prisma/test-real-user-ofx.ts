import { PrismaClient } from '@prisma/client';
import { OfxImporterService } from '../src/lib/services/ofx/ofx-importer';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('   TESTE REAL: IMPORTAÇÃO DO ARQUIVO OFX DO USUÁRIO BANCO DO BRASIL');
  console.log('================================================================\n');

  // Buscar usuário principal
  const user = await prisma.user.findFirst({
    where: { email: 'usuario@patrimonio.com' },
  });
  if (!user) throw new Error('Usuário não encontrado');

  // Garantir conta do BB
  let account = await prisma.account.findFirst({
    where: { userId: user.id, name: 'Conta Corrente Banco do Brasil', deletedAt: null },
  });
  if (!account) {
    account = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Conta Corrente Banco do Brasil',
        type: 'CHECKING',
      },
    });
  }

  const fileContent = fs.readFileSync('C:\\Users\\Usuário\\Downloads\\Extrato conta corrente - 012025.ofx', 'utf-8');

  console.log('1. Executando importação atômica do OFX real do Banco do Brasil...');
  const res = await OfxImporterService.executeImport({
    userId: user.id,
    accountId: account.id,
    filename: 'Extrato conta corrente - 012025.ofx',
    fileContent,
  });

  console.log(`- Total no arquivo: ${res.totalRecords}`);
  console.log(`- Lançamentos Novos Gravados: ${res.newRecords}`);
  console.log(`- Duplicados Ignorados: ${res.duplicateRecords}`);

  // Listar todas as transações gravadas
  const createdTxs = await prisma.transaction.findMany({
    where: { accountId: account.id, deletedAt: null },
    orderBy: { date: 'asc' },
  });

  console.log('\n2. TRANSAÇÕES GRAVADAS NO BANCO DE DADOS:');
  createdTxs.forEach((tx, idx) => {
    const dirIcon = tx.direction === 'CREDIT' ? '+' : '−';
    console.log(`  #${idx + 1} [${tx.date.toISOString().split('T')[0]}] ${tx.description} | ${dirIcon} R$ ${Math.abs(Number(tx.amount))} (FITID: ${tx.fitId})`);
  });

  const resgates = createdTxs.filter((t) => t.description.includes('Resgate Poupança'));
  console.log(`\n✅ TOTAL DE RESGATES POUPANÇA IMPORTADOS COM SUCESSO: ${resgates.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
