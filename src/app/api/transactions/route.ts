import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultUserId } from '@/lib/auth-user';
import { serializeDecimal } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getDefaultUserId();

    const rawTransactions = await db.transaction.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        account: true,
        destinationAccount: true,
        category: true,
        importBatch: true,
      },
    });

    const transactions = serializeDecimal(rawTransactions);

    return NextResponse.json({ success: true, transactions });
  } catch (err: any) {
    console.error('[GET /api/transactions] Erro:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
