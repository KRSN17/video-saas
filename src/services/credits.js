const prisma = require('../config/database');

const deductCredits = async (userId, amount, description) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } },
  });

  await prisma.transaction.create({
    data: {
      userId,
      type: 'usage',
      credits: -amount,
      description,
    },
  });

  return user.credits;
};

const addCredits = async (userId, amount, usdAmount, description) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });

  await prisma.transaction.create({
    data: {
      userId,
      type: 'purchase',
      credits: amount,
      amount: usdAmount,
      description,
    },
  });

  return user.credits;
};

module.exports = { deductCredits, addCredits };
