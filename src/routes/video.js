const express = require('express');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireCredits } = require('../middleware/credits');
const upload = require('../middleware/upload');
const { submitTextToVideo, submitImageToVideo, checkStatus, getResult, MODEL_INFO } = require('../services/fal');
const { deductCredits } = require('../services/credits');

const router = express.Router();

// Enhance prompt (rule-based)
router.post('/enhance-prompt', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const cinematic = ['cinematic lighting', 'professional quality', '4K resolution', 'detailed textures'];
    const cameras = ['smooth camera movement', 'wide angle shot', 'close-up detail shot', 'aerial view'];
    const moods = ['dramatic atmosphere', 'vibrant colors', 'soft natural lighting', 'golden hour'];

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const enhanced = `${prompt}, ${pick(cinematic)}, ${pick(cameras)}, ${pick(moods)}, high detail, masterpiece`;

    res.json({ original: prompt, enhanced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List available models
router.get('/models', authenticate, async (req, res) => {
  res.json({ models: MODEL_INFO });
});

// Generate video
router.post('/generate', authenticate, requireCredits(1), async (req, res) => {
  try {
    const { prompt, model = 'kling-text', type = 'text', imageUrl, duration, aspectRatio } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    let result;
    if (type === 'image' && imageUrl) {
      result = await submitImageToVideo(imageUrl, prompt, model, { duration, aspectRatio });
    } else {
      result = await submitTextToVideo(prompt, model, { duration, aspectRatio });
    }

    const video = await prisma.video.create({
      data: {
        userId: req.user.id,
        prompt,
        model: result.modelId,
        status: 'processing',
        falRequestId: result.requestId,
        creditsUsed: 1,
      },
    });

    await deductCredits(req.user.id, 1, `Video generation: ${prompt.substring(0, 50)}`);
    res.json({ video });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check video status
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    if (video.status === 'processing' && video.falRequestId) {
      try {
        const status = await checkStatus(video.model, video.falRequestId);
        if (status.status === 'COMPLETED') {
          const result = await getResult(video.model, video.falRequestId);
          const videoUrl = result.data?.video?.url || result.data?.output?.video?.url;
          await prisma.video.update({
            where: { id: video.id },
            data: { status: 'completed', videoUrl },
          });
          return res.json({ status: 'completed', videoUrl });
        }
        return res.json({ status: status.status?.toLowerCase() || 'processing' });
      } catch (falErr) {
        if (falErr.message?.includes('FAILED')) {
          await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
          return res.json({ status: 'failed' });
        }
      }
    }
    res.json({ status: video.status, videoUrl: video.videoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List user videos with filtering, sorting, and pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, model, sort = 'newest', page = 1, limit = 12 } = req.query;
    const take = Math.min(parseInt(limit) || 12, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (model) where.model = model;

    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({ where, orderBy, take, skip }),
      prisma.video.count({ where }),
    ]);

    res.json({
      videos,
      pagination: {
        page: Math.max(parseInt(page) || 1, 1),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download video
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    if (video.localPath && fs.existsSync(video.localPath)) {
      return res.download(video.localPath);
    }
    if (video.videoUrl) {
      return res.redirect(video.videoUrl);
    }
    res.status(404).json({ error: 'Video file not available' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload video
router.post('/upload', authenticate, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const video = await prisma.video.create({
      data: {
        userId: req.user.id,
        prompt: req.body.title || 'Uploaded video',
        model: 'upload',
        status: 'completed',
        localPath: req.file.path,
      },
    });
    res.json({ video });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete video
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const video = await prisma.video.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    if (video.localPath && fs.existsSync(video.localPath)) {
      fs.unlinkSync(video.localPath);
    }
    await prisma.video.delete({ where: { id: video.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
