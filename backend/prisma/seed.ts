import {
  PlanPriority,
  PlanStatus,
  PlanType,
  PrismaClient,
  RecurrenceFrequency,
  TransactionType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const [user, partner] = await Promise.all([
    prisma.user.upsert({
      where: { slug: 'user' },
      update: {},
      create: { name: 'Gustavo', slug: 'user' },
    }),
    prisma.user.upsert({
      where: { slug: 'partner' },
      update: {},
      create: { name: 'Noiva', slug: 'partner' },
    }),
  ]);

  const [contaCorrente, reservaViagem] = await Promise.all([
    prisma.account.upsert({
      where: { id: '00000000-0000-4000-8000-000000000001' },
      update: { isDefault: true },
      create: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Conta corrente',
        description: 'Conta principal do casal',
        isDefault: true,
        sortOrder: 1,
      },
    }),
    prisma.account.upsert({
      where: { id: '00000000-0000-4000-8000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Reserva viagem (USD)',
        description: 'Dólares separados para viagem — intocável',
        isReserved: true,
        sortOrder: 2,
      },
    }),
  ]);

  const categoryGroups: Array<{
    name: string;
    type: TransactionType;
    children: string[];
  }> = [
    { name: 'Moradia', type: TransactionType.EXPENSE, children: ['Casa', 'Lote', 'Energia', 'Água', 'Internet', 'Telefone'] },
    { name: 'Alimentação', type: TransactionType.EXPENSE, children: ['Mercado', 'Limpeza', 'Delivery/lanches', 'Restaurantes'] },
    { name: 'Transporte', type: TransactionType.EXPENSE, children: ['Combustível', 'Manutenção', 'IPVA', 'Estacionamento', 'Transporte app'] },
    { name: 'Saúde', type: TransactionType.EXPENSE, children: ['Farmácia', 'Consultas', 'Exames'] },
    { name: 'Pessoal', type: TransactionType.EXPENSE, children: ['Barbearia', 'Salão', 'Roupas', 'Autocuidado'] },
    { name: 'Lazer', type: TransactionType.EXPENSE, children: ['Passeios', 'Jogos', 'Assinaturas'] },
    { name: 'Presentes e extras', type: TransactionType.EXPENSE, children: ['Presentes', 'Bobeiras/compras pessoais'] },
    { name: 'Viagem', type: TransactionType.EXPENSE, children: ['Parcela viagem', 'Câmbio/dólares', 'Gastos viagem'] },
    { name: 'Casamento', type: TransactionType.EXPENSE, children: ['Decoração', 'Músico', 'Vestido', 'Maquiagem', 'Cabelo', 'Outros casamento'] },
    { name: 'Patrimônio', type: TransactionType.EXPENSE, children: ['Reserva emergência', 'Investimentos'] },
    { name: 'Renda', type: TransactionType.INCOME, children: ['Salário Gustavo', 'Salário noiva', 'Renda extra', 'Reembolsos'] },
  ];

  let sortOrder = 0;
  const categoryMap = new Map<string, string>();

  for (const group of categoryGroups) {
    sortOrder += 10;
    const parent = await prisma.category.upsert({
      where: { id: `cat-${group.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: { name: group.name, sortOrder },
      create: {
        id: `cat-${group.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: group.name,
        type: group.type,
        sortOrder,
      },
    });

    for (const childName of group.children) {
      sortOrder += 1;
      const child = await prisma.category.upsert({
        where: { id: `cat-${childName.toLowerCase().replace(/[\s/]+/g, '-')}` },
        update: { name: childName, parentId: parent.id, sortOrder },
        create: {
          id: `cat-${childName.toLowerCase().replace(/[\s/]+/g, '-')}`,
          name: childName,
          type: group.type,
          parentId: parent.id,
          sortOrder,
        },
      });
      categoryMap.set(childName, child.id);
    }
  }

  const budgetRefs: Array<[string, number]> = [
    ['Mercado', 1700],
    ['Limpeza', 0],
    ['Delivery/lanches', 500],
    ['Farmácia', 300],
    ['Bobeiras/compras pessoais', 700],
    ['Barbearia', 100],
    ['Salão', 100],
    ['Combustível', 600],
  ];

  const year = 2026;
  const month = 8;

  for (const [name, limit] of budgetRefs) {
    const categoryId = categoryMap.get(name);
    if (!categoryId || limit === 0) continue;

    await prisma.budget.upsert({
      where: { categoryId_year_month: { categoryId, year, month } },
      update: { limitAmount: limit },
      create: { categoryId, year, month, limitAmount: limit },
    });
  }

  await prisma.budget.upsert({
    where: {
      categoryId_year_month: {
        categoryId: categoryMap.get('Manutenção')!,
        year,
        month,
      },
    },
    update: { limitAmount: 260 },
    create: {
      categoryId: categoryMap.get('Manutenção')!,
      year,
      month,
      limitAmount: 260,
    },
  });

  await prisma.plan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000010',
      name: 'Viagem',
      type: PlanType.INSTALLMENT,
      targetAmount: 2290 * 5,
      currentAmount: 4000,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-28'),
      frequency: RecurrenceFrequency.MONTHLY,
      periodicAmount: 2290,
      categoryId: categoryMap.get('Parcela viagem'),
      status: PlanStatus.ACTIVE,
      priority: PlanPriority.HIGH,
    },
  });

  await prisma.plan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000011',
      name: 'Reserva de emergência',
      type: PlanType.GOAL,
      targetAmount: 10000,
      currentAmount: 0,
      startDate: new Date('2026-08-01'),
      status: PlanStatus.ACTIVE,
      priority: PlanPriority.MEDIUM,
    },
  });

  console.log('✅ Seed concluído');
  console.log(`   Usuários: ${user.name}, ${partner.name}`);
  console.log(`   Contas: ${contaCorrente.name}, ${reservaViagem.name}`);
  console.log(`   Categorias: ${categoryMap.size} filhas + ${categoryGroups.length} grupos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
