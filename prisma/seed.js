const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Seed credit packages
  await prisma.creditPackage.createMany({
    data: [
      { name: 'Starter', credits: 50, price: 9.00, popular: false },
      { name: 'Pro', credits: 200, price: 29.00, popular: true },
      { name: 'Enterprise', credits: 600, price: 79.00, popular: false },
    ],
    skipDuplicates: true,
  });

  // Seed admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@zeeel.ai' },
    update: {},
    create: {
      email: 'admin@zeeel.ai',
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
      credits: 1000,
    },
  });

  console.log('Seed completed: 3 credit packages + admin user');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
