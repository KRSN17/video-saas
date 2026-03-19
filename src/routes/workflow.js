const express = require('express');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// List all workflows for user
router.get('/', authenticate, async (req, res) => {
  const workflows = await prisma.workflow.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, isActive: true, createdAt: true, updatedAt: true }
  });
  res.json({ workflows });
});

// Create new workflow
router.post('/', authenticate, async (req, res) => {
  const { name } = req.body;
  // Deactivate all other workflows
  await prisma.workflow.updateMany({ where: { userId: req.user.id }, data: { isActive: false } });
  const workflow = await prisma.workflow.create({
    data: { userId: req.user.id, name: name || 'Untitled Workflow', isActive: true, data: { version: 1, nodes: [], connections: [] } }
  });
  res.json({ workflow });
});

// Get single workflow
router.get('/:id', authenticate, async (req, res) => {
  const workflow = await prisma.workflow.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ workflow });
});

// Update workflow (save canvas data, rename)
router.put('/:id', authenticate, async (req, res) => {
  const { name, data } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (data !== undefined) update.data = data;
  const workflow = await prisma.workflow.update({ where: { id: req.params.id }, data: update });
  res.json({ workflow });
});

// Set active workflow
router.put('/:id/activate', authenticate, async (req, res) => {
  await prisma.workflow.updateMany({ where: { userId: req.user.id }, data: { isActive: false } });
  const workflow = await prisma.workflow.update({ where: { id: req.params.id }, data: { isActive: true } });
  res.json({ workflow });
});

// Delete workflow
router.delete('/:id', authenticate, async (req, res) => {
  await prisma.workflow.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Duplicate workflow
router.post('/:id/duplicate', authenticate, async (req, res) => {
  const original = await prisma.workflow.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!original) return res.status(404).json({ error: 'Workflow not found' });
  const copy = await prisma.workflow.create({
    data: { userId: req.user.id, name: original.name + ' (Copy)', data: original.data, isActive: false }
  });
  res.json({ workflow: copy });
});

module.exports = router;
