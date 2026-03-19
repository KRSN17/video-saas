const express = require('express');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { mergeVideos } = require('../services/videoMerge');

const router = express.Router();

// Merge videos
router.post('/', authenticate, upload.array('videos', 10), async (req, res) => {
  try {
    let inputPaths = [];

    // From uploaded files
    if (req.files?.length) {
      inputPaths = req.files.map((f) => f.path);
    }

    // From existing video IDs
    if (req.body.videoIds) {
      const ids = JSON.parse(req.body.videoIds);
      const videos = await prisma.video.findMany({
        where: { id: { in: ids }, userId: req.user.id, status: 'completed' },
      });
      const dbPaths = videos.filter((v) => v.localPath && fs.existsSync(v.localPath)).map((v) => v.localPath);
      inputPaths = [...inputPaths, ...dbPaths];
    }

    if (inputPaths.length < 2) {
      return res.status(400).json({ error: 'At least 2 videos required for merging' });
    }

    const mergeJob = await prisma.mergeJob.create({
      data: {
        userId: req.user.id,
        inputVideos: inputPaths,
        status: 'processing',
      },
    });

    // Process merge async
    mergeVideos(inputPaths)
      .then(async (outputPath) => {
        await prisma.mergeJob.update({
          where: { id: mergeJob.id },
          data: { status: 'completed', outputPath },
        });
      })
      .catch(async (err) => {
        await prisma.mergeJob.update({
          where: { id: mergeJob.id },
          data: { status: 'failed' },
        });
      });

    res.json({ mergeJob: { id: mergeJob.id, status: 'processing' }, mergeId: mergeJob.id, id: mergeJob.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check merge status
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const job = await prisma.mergeJob.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!job) return res.status(404).json({ error: 'Merge job not found' });
    res.json({ status: job.status, outputPath: job.outputPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download merged video
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const job = await prisma.mergeJob.findFirst({
      where: { id: req.params.id, userId: req.user.id, status: 'completed' },
    });
    if (!job?.outputPath) return res.status(404).json({ error: 'Merged video not ready' });
    res.download(job.outputPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
