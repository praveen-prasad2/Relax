# TimeForge by Praveen

Mobile-first attendance tracking: 24th–23rd month cycle, Mon–Sat work days, 9h/day, Sunday = holiday.

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, Framer Motion, TypeScript
- **Backend**: NextAuth.js, MongoDB, Mongoose
- **Validation**: Zod

## Features

- **Email + Password** login with OTP-verified signup
- **Attendance**: Month view, punch in/out, leave/WFH/holiday, daily and cumulative difference

## Setup

1. Copy `.env.example` to `.env.local`
2. Set `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
3. Configure SMTP (nodemailer) for OTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)
4. `npm install && npm run dev`

## Vercel Deployment

Add these environment variables in **Project Settings > Environment Variables** (all environments):

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (your production URL) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | For OTP emails |

## Project Structure

```
src/
  app/           # Routes & layouts
  components/    # UI components
  lib/           # MongoDB, auth, attendance logic
  models/        # Mongoose schemas
```
