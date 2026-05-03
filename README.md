# Project Tracker

Full-stack project management app with role-based access control.

## Features
- Signup with role selection (Admin / Member)
- Admins: create projects, create tasks, assign tasks, invite/remove members
- Members: view projects they're added to, update status of their assigned tasks
- Dashboard with stats: total tasks, in progress, done, overdue, my tasks
- Progress bar per project
- Task filtering by status
- Overdue task highlighting
- Team management with per-member task stats

## Tech Stack
- **Backend**: Node.js, Express, Prisma ORM, SQLite (dev) / PostgreSQL (prod)
- **Frontend**: React, React Router, Axios, Vite

## Run Locally

### Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

## Deploy on Railway

Backend env vars:
- `DATABASE_URL` = from Railway PostgreSQL
- `JWT_SECRET` = any secret string

Update `prisma/schema.prisma` provider to `postgresql` before deploying.

Frontend env var:
- `VITE_API_URL` = your Railway backend URL + /api
