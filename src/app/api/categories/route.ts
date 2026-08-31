import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultUserId } from '@/lib/auth-user';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getDefaultUserId();

    let categories = await db.category.findMany({
      where: { userId, deletedAt: null },
      include: {
        subcategories: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      const defaultParents = [
        {
          name: 'Alimentação',
          subs: ['Delivery', 'Padaria', 'Restaurante', 'Supermercado', 'Outros'],
        },
        {
          name: 'Assinaturas',
          subs: ['Serviços digitais', 'Software', 'Streaming'],
        },
        {
          name: 'Bens Imóveis',
          subs: ['Apartamento', 'Casa', 'Galpão industrial', 'Imóvel Rural', 'Sala Comercial', 'Terreno / Lote'],
        },
        {
          name: 'Bens Móveis',
          subs: ['Embarcação', 'Jóias e Arte', 'Motocicleta', 'Móveis e Eletro', 'Veículo (Carro)'],
        },
        {
          name: 'Compras',
          subs: ['Casa', 'Eletrônicos', 'Presentes', 'Vestuário', 'Outros'],
        },
        {
          name: 'Cota Capital & Cooperativas',
          subs: ['Capital Social Integralizado', 'Cota Capital em Cooperativa de Crédito'],
        },
        {
          name: 'Despesas Pessoais',
          subs: ['Cuidados Pessoais', 'Farmácia / Saúde', 'Lazer', 'Viagens'],
        },
        {
          name: 'Moradia & Manutenção',
          subs: ['Aluguel', 'Condomínio', 'Contas (Luz, Água, Net)', 'Manutenção'],
        },
        {
          name: 'Transporte',
          subs: ['Combustível', 'Estacionamento', 'Manutenção Veicular', 'Uber / Táxi'],
        },
      ];

      for (const parent of defaultParents) {
        const parentCat = await db.category.create({
          data: {
            userId,
            name: parent.name,
          },
        });

        if (parent.subs.length > 0) {
          await db.category.createMany({
            data: parent.subs.map((subName) => ({
              userId,
              name: subName,
              parentId: parentCat.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      categories = await db.category.findMany({
        where: { userId, deletedAt: null },
        include: {
          subcategories: {
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getDefaultUserId();
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Nome da categoria é obrigatório.' }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        userId,
        name: body.name,
        parentId: body.parentId || null,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
