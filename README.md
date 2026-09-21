# dnu — Student Union Management System

Arabic RTL system for DNU (Damanhour National University) student union:
registration, events + QR attendance, WhatsApp campaigns, polls, badges, admin.

## Stack

- **Web:** Next.js 16 + React 19 + Tailwind (deploy on Vercel)
- **DB:** Supabase Postgres (shared)
- **Auth:** phone + password (bcrypt + JWT cookie, custom — no Supabase Auth)
- **WhatsApp sender:** local gateway app on the admin PC (`gateway/DNU-WhatsApp.exe`)

## Web setup

```bash
npm install
cp .env.example .env.local   # fill Supabase keys + AUTH_SECRET
npm run dev
```

Run SQL in Supabase SQL Editor: `supabase/schema.sql`, then
`supabase/migrations/002_student_profile.sql`,
`004_surveys.sql`, `005_credential_outbox.sql`.

## WhatsApp gateway (admin PC)

1. Double-click `gateway/DNU-WhatsApp.exe`
2. Type the union number → enter the 8-digit code in WhatsApp
   (Linked devices → Link with phone number), or scan the QR
3. Keep it open while sending. Campaigns send at ~40/min in background.
4. Rebuild after editing `server.js` — see `gateway/README.md`.

## Env notes

- Vercel: `WHATSAPP_MODE=web` (manage only, sending blocked)
- Admin PC: `WHATSAPP_MODE=local` + `WHATSAPP_GATEWAY_URL=http://localhost:3001`
- `.env.local` is never committed (see `.gitignore`)
