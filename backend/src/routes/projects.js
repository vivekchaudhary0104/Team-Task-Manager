const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
router.use(auth);

// get membership of current user in a project
async function getMembership(userId, projectId) {
  return prisma.projectMember.findFirst({
    where: { userId, projectId: parseInt(projectId) }
  });
}

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        tasks: true,
        _count: { select: { tasks: true, members: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects — only admins can create projects
router.post('/', [
  body('name').notEmpty().withMessage('Project name is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create projects' });
  }

  const { name, description } = req.body;

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'admin' }
        }
      },
      include: {
        owner: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true } } } },
        tasks: true
      }
    });
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        tasks: {
          include: { assignee: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isMember = project.members.some(m => m.userId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id — only project admin can delete
router.delete('/:id', async (req, res) => {
  try {
    const membership = await getMembership(req.user.id, req.params.id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can delete projects' });
    }

    const pid = parseInt(req.params.id);
    await prisma.task.deleteMany({ where: { projectId: pid } });
    await prisma.projectMember.deleteMany({ where: { projectId: pid } });
    await prisma.project.delete({ where: { id: pid } });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
