# VideoGen AI - Video Generation SaaS

AI-powered video generation platform built on fal.ai with credit-based SaaS model.

## Tech Stack
- **Backend:** Node.js + Express, Prisma ORM, PostgreSQL
- **Frontend:** EJS templates, Bootstrap 5, custom dark theme (Piku-inspired)
- **AI:** fal.ai API (@fal-ai/client) - Kling Video, MiniMax, Wan models
- **Video Processing:** FFmpeg (fluent-ffmpeg) for video merging
- **Auth:** bcryptjs + JWT

## Commands
- `npm run dev` — Start dev server with nodemon (port 3001)
- `npm start` — Start production server
- `npm run db:push` — Push Prisma schema to PostgreSQL
- `npm run db:seed` — Seed credit packages + admin user
- `npm run db:studio` — Open Prisma Studio
- `npm run setup` — Full setup (install + db push + seed)

## Key Files
- `src/index.js` — Express entry point
- `src/services/fal.js` — fal.ai API wrapper
- `src/services/videoMerge.js` — FFmpeg merge service
- `src/routes/` — All API routes (auth, video, merge, credits, admin)
- `views/` — EJS templates
- `prisma/schema.prisma` — Database schema

## Environment
- PostgreSQL: localhost:5432/videosaas
- Admin: admin@zeeel.ai / admin123
- GitHub: github.com/KRSN17/video-saas (private, darshjme is admin collaborator)

## API Endpoints
- `POST /api/auth/register` — Register + 10 free credits
- `POST /api/auth/login` — Login, returns JWT
- `POST /api/videos/generate` — Submit video generation
- `GET /api/videos/:id/status` — Poll generation status
- `POST /api/merge` — Merge multiple videos
- `GET /api/credits/packages` — List credit packages
- `POST /api/credits/purchase` — Buy credits
