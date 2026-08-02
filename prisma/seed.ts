import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed completo do banco de dados...");

  // 1. Criar Usuário Principal
  const user = await prisma.user.upsert({
    where: { email: "usuario@patrimonio.com" },
    update: {},
    create: {
      name: "Usuário Principal",
      email: "usuario@patrimonio.com",
    },
  });

  console.log(`Usuário: ${user.name} (${user.id})`);

  // 2. Biblioteca Completa de Categorias Hierárquicas
  const categoriesData = [
    {
      name: "Bens Imóveis",
      icon: "Building",
      subs: [
        "Apartamento",
        "Casa",
        "Terreno / Lote",
        "Imóvel Rural / Sítio / Fazenda",
        "Sala Comercial",
        "Galpão industrial",
        "Vaga de Garagem / Box",
      ],
    },
    {
      name: "Bens Móveis",
      icon: "Car",
      subs: [
        "Veículo (Carro)",
        "Motocicleta",
        "Embarcação / Aeronave",
        "Máquinas e Equipamentos",
        "Semoventes / Gado / Plantio",
        "Móveis e Eletrodomésticos",
        "Jóias, Relógios e Obras de Arte",
      ],
    },
    {
      name: "Intangíveis & Propriedades",
      icon: "FileCheck",
      subs: [
        "Marcas e Patentes",
        "Software / Direitos Autorais",
        "Licenças e Concessões",
        "Domínios e Ativos Digitais",
      ],
    },
    {
      name: "Participação Societária",
      icon: "Briefcase",
      subs: [
        "Participação em Empresa LTDA",
        "Ações de Cia Fechada",
        "Holding Patrimonial",
        "Sociedade em Conta de Participação (SCP)",
      ],
    },
    {
      name: "Cota Capital & Cooperativas",
      icon: "Landmark",
      subs: [
        "Cota Capital em Cooperativa de Crédito",
        "Cota em Cooperativa Agropecuária",
        "Capital Social Integralizado",
      ],
    },
    {
      name: "Investimentos & Custódia",
      icon: "TrendingUp",
      subs: [
        "Renda Fixa (CDB, LCI, LCA)",
        "Tesouro Direto",
        "Ações B3",
        "FIIs (Fundos Imobiliários)",
        "BDRs e Mercado Internacional",
        "Fundos de Investimento",
        "Criptoativos e Web3",
      ],
    },
    {
      name: "Moradia",
      icon: "Home",
      subs: ["Aluguel", "Condomínio", "Energia elétrica", "Água", "Internet", "Manutenção", "Móveis"],
    },
    {
      name: "Alimentação",
      icon: "Utensils",
      subs: ["Supermercado", "Restaurante", "Delivery", "Padaria", "Outros"],
    },
    {
      name: "Transporte",
      icon: "Car",
      subs: ["Combustível", "Manutenção", "Seguro", "IPVA", "Estacionamento", "Pedágio", "Transporte por aplicativo"],
    },
    {
      name: "Saúde",
      icon: "HeartPulse",
      subs: ["Médico", "Dentista", "Farmácia", "Exames", "Plano de saúde"],
    },
    {
      name: "Educação",
      icon: "GraduationCap",
      subs: ["Cursos", "Faculdade", "Livros"],
    },
    {
      name: "Lazer",
      icon: "Smile",
      subs: ["Restaurantes/lazer", "Jogos", "Cinema", "Eventos", "Hobbies"],
    },
    {
      name: "Viagens",
      icon: "Plane",
      subs: ["Hospedagem", "Passagens", "Alimentação em viagem", "Passeios"],
    },
    {
      name: "Compras",
      icon: "ShoppingBag",
      subs: ["Eletrônicos", "Vestuário", "Casa", "Presentes", "Outros"],
    },
    {
      name: "Assinaturas",
      icon: "Tv",
      subs: ["Streaming", "Software", "Serviços digitais"],
    },
    {
      name: "Impostos e taxas",
      icon: "FileText",
      subs: ["IPTU", "IRPF", "Taxas diversas"],
    },
    {
      name: "Juros e tarifas",
      icon: "Percent",
      subs: ["Juros de cartão/financiamento", "Tarifa bancária"],
    },
    {
      name: "Família",
      icon: "Users",
      subs: ["Mesada", "Cuidados familiares"],
    },
    {
      name: "Pets",
      icon: "Dog",
      subs: ["Veterinária", "Ração", "Higiene pet"],
    },
    {
      name: "Doações",
      icon: "Gift",
      subs: ["Caridade", "Apoio social"],
    },
    {
      name: "Trabalho",
      icon: "Briefcase",
      subs: ["Ferramentas", "Despesas profissionais"],
    },
    {
      name: "Receitas",
      icon: "TrendingUp",
      subs: [
        "Salário",
        "Honorários",
        "Serviços",
        "Aluguéis",
        "Dividendos",
        "Juros recebidos",
        "Rendimentos",
        "Venda de bens",
        "Reembolsos",
        "Outras receitas",
      ],
    },
  ];

  for (const catData of categoriesData) {
    const parent = await prisma.category.create({
      data: {
        userId: user.id,
        name: catData.name,
        icon: catData.icon,
      },
    });

    for (const subName of catData.subs) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: subName,
          parentId: parent.id,
        },
      });
    }
  }

  // 3. Catálogo de Instrumentos Financeiros Iniciais
  const petr4 = await prisma.instrument.create({
    data: {
      symbol: "PETR4",
      name: "Petrobras PN",
      instrumentType: "STOCK",
      exchange: "B3",
    },
  });

  const hglg11 = await prisma.instrument.create({
    data: {
      symbol: "HGLG11",
      name: "CSHG Logística FII",
      instrumentType: "FII",
      exchange: "B3",
    },
  });

  const tesouroSelic = await prisma.instrument.create({
    data: {
      symbol: "TESOURO_SELIC_2029",
      name: "Tesouro Selic 2029",
      instrumentType: "TREASURY_BOND",
      exchange: "MANUAL",
    },
  });

  console.log("Seed de categorias e instrumentos concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
