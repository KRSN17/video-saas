const express = require('express');
const prisma = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalVideos, totalCreditsUsed, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.transaction.aggregate({ where: { type: 'usage' }, _sum: { credits: true } }),
      prisma.transaction.aggregate({ where: { type: 'purchase' }, _sum: { amount: true } }),
    ]);
    res.json({
      totalUsers,
      totalVideos,
      totalCreditsUsed: Math.abs(totalCreditsUsed._sum.credits || 0),
      totalRevenue: totalRevenue._sum.amount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, credits: true, role: true, createdAt: true, _count: { select: { videos: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/videos', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/credits', async (req, res) => {
  try {
    const { credits } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { credits: parseInt(credits) },
    });
    res.json({ user: { id: user.id, email: user.email, credits: user.credits } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const { name, credits, price, popular } = req.body;
    const pkg = await prisma.creditPackage.create({ data: { name, credits: parseInt(credits), price: parseFloat(price), popular: !!popular } });
    res.json({ package: pkg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/packages/:id', async (req, res) => {
  try {
    const { name, credits, price, popular, active } = req.body;
    const pkg = await prisma.creditPackage.update({
      where: { id: req.params.id },
      data: { name, credits: parseInt(credits), price: parseFloat(price), popular: !!popular, active: active !== false },
    });
    res.json({ package: pkg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
