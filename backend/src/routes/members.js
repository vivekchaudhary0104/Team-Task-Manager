const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
router.use(auth);

// POST /api/members/invite
router.post('/invite', async (req, res) => {
  const { email, projectId, role } = req.body;
  if (!email || !projectId) return res.status(400).json({ error: 'email and projectId required' });

  try {
    const requester = await prisma.projectMember.findFirst({
      where: { userId: req.user.id, projectId: parseInt(projectId) }
    });
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can invite members' });
    }

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) return res.status(404).json({ error: 'No account found with that email. Ask them to sign up first.' });

    const newMember = await prisma.projectMember.create({
      data: {
        userId: userToAdd.id,
        projectId: parseInt(projectId),
        role: role || 'member'
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(newMember);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'User is already in this project' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/members/:memberId
router.delete('/:memberId', async (req, res) => {
  try {
    const target = await prisma.projectMember.findUnique({
      where: { id: parseInt(req.params.memberId) }
    });
    if (!target) return res.status(404).json({ error: 'Member not found' });

    const requester = await prisma.projectMember.findFirst({
      where: { userId: req.user.id, projectId: target.projectId }
    });
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can remove members' });
    }

    await prisma.projectMember.delete({ where: { id: parseInt(req.params.memberId) } });
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
