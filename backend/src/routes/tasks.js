const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
router.use(auth);

async function getMembership(userId, projectId) {
  return prisma.projectMember.findFirst({
    where: { userId, projectId: parseInt(projectId) }
  });
}

// GET /api/tasks?projectId=X
router.get('/', async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });

  const membership = await getMembership(req.user.id, projectId);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: parseInt(projectId) },
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks — admin only
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('projectId').isInt().withMessage('Valid projectId required'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, projectId, assigneeId, dueDate, priority } = req.body;

  const membership = await getMembership(req.user.id, projectId);
  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only project admins can create tasks' });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        projectId: parseInt(projectId),
        assigneeId: assigneeId ? parseInt(assigneeId) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'medium',
        status: 'todo'
      },
      include: { assignee: { select: { id: true, name: true } } }
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tasks/:id
// Admin: can edit everything
// Member: can only update status of tasks assigned to them
router.patch('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await getMembership(req.user.id, task.projectId);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    let updateData = {};

    if (membership.role === 'admin') {
      // admins can update everything
      const { title, description, status, priority, assigneeId, dueDate } = req.body;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId ? parseInt(assigneeId) : null;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    } else {
      // members can only update status, and only on tasks assigned to them
      if (task.assigneeId !== req.user.id) {
        return res.status(403).json({ error: 'You can only update status of tasks assigned to you' });
      }
      if (req.body.status) updateData.status = req.body.status;
    }

    const updated = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { assignee: { select: { id: true, name: true } } }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id — admin only
router.delete('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await getMembership(req.user.id, task.projectId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can delete tasks' });
    }

    await prisma.task.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
