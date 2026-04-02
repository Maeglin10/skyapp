import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default budget
  await prisma.aiBudget.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      monthlyLimitUsd: 50,
      dailyLimitUsd: 5,
      alertThreshold: 0.8,
      killSwitch: false,
      currentMonthSpend: 0,
      currentDaySpend: 0,
      resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    },
  });
  console.log('✅ Seeded default AI budget');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
