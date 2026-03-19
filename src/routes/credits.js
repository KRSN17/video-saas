const express = require('express');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { addCredits } = require('../services/credits');

const router = express.Router();

router.get('/balance', authenticate, async (req, res) => {
  res.json({ credits: req.user.credits });
});

router.get('/packages', async (req, res) => {
  try {
    const packages = await prisma.creditPackage.findMany({ where: { active: true } });
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/purchase', authenticate, async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const newBalance = await addCredits(req.user.id, pkg.credits, pkg.price, `Purchased ${pkg.name} package`);
    res.json({ success: true, credits: newBalance, package: pkg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
