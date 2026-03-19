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
      creditsUsed: Math.abs(totalCreditsUsed._sum.credits || 0),
      totalRevenue: totalRevenue._sum.amount || 0,
      revenue: totalRevenue._sum.amount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    // Videos grouped by model
    const videosByModelRaw = await prisma.video.groupBy({
      by: ['model'],
      _count: { id: true },
    });
    const videosByModel = {};
    videosByModelRaw.forEach((r) => { videosByModel[r.model] = r._count.id; });

    // Videos grouped by status
    const videosByStatusRaw = await prisma.video.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const videosByStatus = {};
    videosByStatusRaw.forEach((r) => { videosByStatus[r.status] = r._count.id; });

    // Credit usage by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const usageTransactions = await prisma.transaction.findMany({
      where: { type: 'usage', createdAt: { gte: thirtyDaysAgo } },
      select: { credits: true, createdAt: true },
    });
    const dailyMap = {};
    usageTransactions.forEach((t) => {
      const day = t.createdAt.toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Math.abs(t.credits);
    });
    const creditUsageByDay = Object.entries(dailyMap)
      .map(([date, credits]) => ({ date, credits }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top users by video count and credits used
    const topUsers = await prisma.user.findMany({
      select: {
        email: true,
        _count: { select: { videos: true } },
        videos: { select: { creditsUsed: true } },
      },
      orderBy: { videos: { _count: 'desc' } },
      take: 10,
    });
    const topUsersFormatted = topUsers.map((u) => ({
      email: u.email,
      videoCount: u._count.videos,
      creditsUsed: u.videos.reduce((sum, v) => sum + (v.creditsUsed || 0), 0),
    }));

    res.json({
      videosByModel,
      videosByStatus,
      creditUsageByDay,
      topUsers: topUsersFormatted,
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

// --- Settings ---

router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value are required' });
    }
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
    res.json({ setting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API Keys ---

router.get('/api-keys', async (req, res) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
    const masked = apiKeys.map((k) => ({
      ...k,
      key: '****' + k.key.slice(-4),
    }));
    res.json({ apiKeys: masked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api-keys', async (req, res) => {
  try {
    const { provider, key, label } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }
    const apiKey = await prisma.apiKey.create({
      data: { provider: provider || 'fal', key, label },
    });
    res.json({ apiKey: { ...apiKey, key: '****' + apiKey.key.slice(-4) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api-keys/:id', async (req, res) => {
  try {
    const existing = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'API key not found' });
    }
    const apiKey = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { active: !existing.active },
    });
    res.json({ apiKey: { ...apiKey, key: '****' + apiKey.key.slice(-4) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api-keys/:id', async (req, res) => {
  try {
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
