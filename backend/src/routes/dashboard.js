const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
router.use(auth);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // all projects this user is in
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId } } },
      include: {
        tasks: {
          include: { assignee: { select: { id: true, name: true } } }
        },
        members: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    });

    // all tasks across all projects
    const allTasks = projects.flatMap(p => p.tasks);

    // tasks assigned to this user
    const myTasks = allTasks.filter(t => t.assigneeId === userId);

    const stats = {
      totalProjects: projects.length,
      totalTasks: allTasks.length,
      myTasks: myTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      done: allTasks.filter(t => t.status === 'done').length,
      overdue: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
    };

    // recent overdue tasks
    const overdueTasks = allTasks
      .filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done')
      .map(t => ({
        ...t,
        projectName: projects.find(p => p.id === t.projectId)?.name
      }))
      .slice(0, 5);

    // my assigned tasks not done
    const myPendingTasks = myTasks
      .filter(t => t.status !== 'done')
      .map(t => ({
        ...t,
        projectName: projects.find(p => p.id === t.projectId)?.name
      }))
      .slice(0, 5);

    res.json({ stats, overdueTasks, myPendingTasks, projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
